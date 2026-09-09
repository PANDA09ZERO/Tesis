import mysql.connector
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import json

try:
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import classification_report
    import joblib
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


class AcademicRiskPredictor:
    def __init__(self):
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', 3306)),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
            'database': os.getenv('DB_NAME', 'gestion_educativa')
        }
        self.model = None
        self.scaler = None
        self.model_path = os.path.join(os.path.dirname(__file__), 'model.joblib')
        self.scaler_path = os.path.join(os.path.dirname(__file__), 'scaler.joblib')
        self._load_model()

    def _get_connection(self):
        return mysql.connector.connect(**self.db_config)

    def _load_model(self):
        if os.path.exists(self.model_path) and SKLEARN_AVAILABLE:
            try:
                self.model = joblib.load(self.model_path)
                self.scaler = joblib.load(self.scaler_path)
            except Exception:
                self.model = None
                self.scaler = None

    def _save_model(self):
        if SKLEARN_AVAILABLE and self.model:
            joblib.dump(self.model, self.model_path)
            joblib.dump(self.scaler, self.scaler_path)

    def _extract_features(self, alumno_id):
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT a.id, a.codigo_alumno, u.nombre, u.apellido,
                   g.nombre as grado, s.nombre as seccion
            FROM alumnos a
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN grados g ON a.grado_id = g.id
            LEFT JOIN secciones s ON a.seccion_id = s.id
            WHERE a.id = %s
        """, (alumno_id,))
        alumno = cursor.fetchone()

        if not alumno:
            return None, None

        cursor.execute("""
            SELECT AVG(nota) as promedio_general,
                   MIN(nota) as nota_minima,
                   MAX(nota) as nota_maxima,
                   COUNT(*) as total_evaluaciones
            FROM calificaciones WHERE alumno_id = %s
        """, (alumno_id,))
        calificaciones = cursor.fetchone()

        cursor.execute("""
            SELECT curso_id, AVG(nota) as promedio_curso
            FROM calificaciones WHERE alumno_id = %s
            GROUP BY curso_id
        """, (alumno_id,))
        por_curso = cursor.fetchall()

        cursor.execute("""
            SELECT 
                COUNT(*) as total_dias,
                SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) as presentes,
                SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) as ausentes,
                SUM(CASE WHEN estado = 'tardanza' THEN 1 ELSE 0 END) as tardanzas,
                SUM(CASE WHEN estado = 'justificado' THEN 1 ELSE 0 END) as justificados
            FROM asistencias WHERE alumno_id = %s
        """, (alumno_id,))
        asistencias = cursor.fetchone()

        cursor.execute("""
            SELECT AVG(nota) as promedio_reciente
            FROM calificaciones
            WHERE alumno_id = %s AND fecha_evaluacion >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        """, (alumno_id,))
        reciente = cursor.fetchone()

        cursor.execute("""
            SELECT AVG(nota) as promedio_anterior
            FROM calificaciones
            WHERE alumno_id = %s AND fecha_evaluacion < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
              AND fecha_evaluacion >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
        """, (alumno_id,))
        anterior = cursor.fetchone()

        total_dias = asistencias['total_dias'] or 1
        porcentaje_ausencias = ((asistencias['ausentes'] or 0) / total_dias) * 100
        porcentaje_tardanzas = ((asistencias['tardanzas'] or 0) / total_dias) * 100
        cursos_desaprobados = sum(1 for c in por_curso if c['promedio_curso'] and c['promedio_curso'] < 11)

        promedio_reciente_val = reciente['promedio_reciente'] or calificaciones['promedio_general'] or 10
        promedio_anterior_val = anterior['promedio_anterior'] or calificaciones['promedio_general'] or 10
        tendencia = promedio_reciente_val - promedio_anterior_val

        features = {
            'promedio_general': calificaciones['promedio_general'] or 10,
            'nota_minima': calificaciones['nota_minima'] or 0,
            'nota_maxima': calificaciones['nota_maxima'] or 20,
            'total_evaluaciones': calificaciones['total_evaluaciones'] or 0,
            'porcentaje_ausencias': round(porcentaje_ausencias, 2),
            'porcentaje_tardanzas': round(porcentaje_tardanzas, 2),
            'cursos_desaprobados': cursos_desaprobados,
            'total_cursos': len(por_curso),
            'promedio_reciente': round(promedio_reciente_val, 2),
            'tendencia_rendimiento': round(tendencia, 2),
        }

        info = {
            'alumno_id': alumno_id,
            'nombre_completo': f"{alumno['nombre']} {alumno['apellido']}",
            'codigo_alumno': alumno['codigo_alumno'],
            'grado': alumno['grado'],
            'seccion': alumno['seccion'],
            'porcentaje_ausencias': round(porcentaje_ausencias, 2),
            'porcentaje_tardanzas': round(porcentaje_tardanzas, 2),
            'promedio_general': round(calificaciones['promedio_general'] or 0, 2),
            'cursos_desaprobados': cursos_desaprobados,
            'promedio_reciente': round(promedio_reciente_val, 2),
            'tendencia': 'mejora' if tendencia > 1 else ('deterioro' if tendencia < -1 else 'estable')
        }

        cursor.close()
        conn.close()

        return features, info

    def _rule_based_predict(self, features):
        score = 0
        indicadores = []

        promedio = features['promedio_general']
        if promedio < 8:
            score += 40
            indicadores.append(f"Promedio general muy bajo: {promedio:.1f}/20")
        elif promedio < 11:
            score += 25
            indicadores.append(f"Promedio general bajo: {promedio:.1f}/20")
        elif promedio < 14:
            score += 10

        ausencias = features['porcentaje_ausencias']
        if ausencias > 20:
            score += 30
            indicadores.append(f"{ausencias:.0f}% de inasistencias (crítico)")
        elif ausencias > 10:
            score += 15
            indicadores.append(f"{ausencias:.0f}% de inasistencias")
        elif ausencias > 5:
            score += 5

        tardanzas = features['porcentaje_tardanzas']
        if tardanzas > 15:
            score += 15
            indicadores.append(f"{tardanzas:.0f}% de tardanzas")
        elif tardanzas > 8:
            score += 8

        desaprobados = features['cursos_desaprobados']
        total = features['total_cursos'] or 1
        if desaprobados > 0:
            ratio = desaprobados / total
            if ratio > 0.5:
                score += 25
                indicadores.append(f"{desaprobados} de {total} cursos desaprobados")
            elif ratio > 0.25:
                score += 15
                indicadores.append(f"{desaprobados} de {total} cursos desaprobados")
            elif desaprobados >= 1:
                score += 8

        tendencia = features['tendencia_rendimiento']
        if tendencia < -3:
            score += 20
            indicadores.append(f"Deterioro significativo del rendimiento ({tendencia:+.1f})")
        elif tendencia < -1:
            score += 10
            indicadores.append(f"Deterioro del rendimiento ({tendencia:+.1f})")
        elif tendencia > 2:
            score -= 5
            indicadores.append(f"Mejora del rendimiento ({tendencia:+.1f})")

        score = max(0, min(100, score))

        if score >= 60:
            nivel = 'alto'
        elif score >= 30:
            nivel = 'medio'
        else:
            nivel = 'bajo'

        recomendaciones = {
            'alto': 'Se recomienda seguimiento académico inmediato, tutoría personalizada y comunicación con apoderados.',
            'medio': 'Se sugiere monitoreo periódico, refuerzo en áreas débiles y seguimiento del progreso.',
            'bajo': 'El estudiante muestra un rendimiento aceptable. Mantener seguimiento regular.'
        }

        return {
            'nivel_riesgo': score,
            'tipo_riesgo': nivel,
            'indicadores': indicadores,
            'recomendacion': recomendaciones[nivel]
        }

    def predict_risk(self, alumno_id):
        features, info = self._extract_features(alumno_id)

        if not features:
            return {'error': 'Alumno no encontrado o sin datos suficientes'}

        if self.model and SKLEARN_AVAILABLE:
            X = np.array([[
                features['promedio_general'],
                features['nota_minima'],
                features['nota_maxima'],
                features['porcentaje_ausencias'],
                features['porcentaje_tardanzas'],
                features['cursos_desaprobados'],
                features['promedio_reciente'],
                features['tendencia_rendimiento']
            ]])

            X_scaled = self.scaler.transform(X)
            prediction = self.model.predict(X_scaled)[0]
            probability = self.model.predict_proba(X_scaled)[0]

            tipo_riesgo = 'alto' if prediction == 2 else ('medio' if prediction == 1 else 'bajo')
            nivel_riesgo = round(float(max(probability)) * 100, 2)

            indicadores = []
            if features['porcentaje_ausencias'] > 5:
                indicadores.append(f"{features['porcentaje_ausencias']:.0f}% de inasistencias")
            if features['promedio_general'] < 11:
                indicadores.append(f"Promedio: {features['promedio_general']:.1f}/20")
            if features['cursos_desaprobados'] > 0:
                indicadores.append(f"{features['cursos_desaprobados']} cursos desaprobados")
            if features['tendencia_rendimiento'] < -1:
                indicadores.append(f"Tendencia descendente ({features['tendencia_rendimiento']:+.1f})")

            result = {
                **info,
                'nivel_riesgo': nivel_riesgo,
                'tipo_riesgo': tipo_riesgo,
                'indicadores': indicadores,
                'metodo': 'machine_learning',
                'recomendacion': self._get_recomendacion(tipo_riesgo)
            }
        else:
            prediction = self._rule_based_predict(features)
            result = {
                **info,
                **prediction,
                'metodo': 'reglas'
            }

        self._save_alert(alumno_id, result)
        return result

    def _get_recomendacion(self, tipo_riesgo):
        return {
            'alto': 'Seguimiento académico inmediato, tutoría personalizada, comunicación con apoderados.',
            'medio': 'Monitoreo periódico, refuerzo en áreas débiles, seguimiento del progreso.',
            'bajo': 'Mantener seguimiento regular del rendimiento.'
        }.get(tipo_riesgo, '')

    def _save_alert(self, alumno_id, result):
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            cursor.execute("""
                UPDATE alertas_academicas SET estado = 'expirada'
                WHERE alumno_id = %s AND estado = 'activa'
            """, (alumno_id,))

            cursor.execute("""
                INSERT INTO alertas_academicas 
                (alumno_id, tipo_riesgo, nivel_riesgo, indicadores, descripcion, recomendacion, generada_por_ia)
                VALUES (%s, %s, %s, %s, %s, %s, 1)
            """, (
                alumno_id,
                result['tipo_riesgo'],
                result['nivel_riesgo'],
                json.dumps(result['indicadores']),
                f"Nivel de riesgo {result['tipo_riesgo'].upper()} - {', '.join(result['indicadores'][:3])}",
                result.get('recomendacion', '')
            ))

            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"Error saving alert: {e}")

    def predict_batch(self, alumno_ids):
        results = []
        for aid in alumno_ids:
            try:
                result = self.predict_risk(aid)
                results.append(result)
            except Exception as e:
                results.append({'alumno_id': aid, 'error': str(e)})
        return results

    def analyze_all_students(self):
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM alumnos WHERE estado = 'matriculado'")
        alumnos = cursor.fetchall()
        cursor.close()
        conn.close()

        results = []
        for a in alumnos:
            try:
                result = self.predict_risk(a['id'])
                results.append(result)
            except Exception as e:
                results.append({'alumno_id': a['id'], 'error': str(e)})

        stats = {
            'total_analizados': len(results),
            'alto_riesgo': sum(1 for r in results if r.get('tipo_riesgo') == 'alto'),
            'medio_riesgo': sum(1 for r in results if r.get('tipo_riesgo') == 'medio'),
            'bajo_riesgo': sum(1 for r in results if r.get('tipo_riesgo') == 'bajo'),
        }

        return {'estudiantes': results, 'estadisticas': stats}

    def train_model(self):
        if not SKLEARN_AVAILABLE:
            return {'error': 'scikit-learn no está instalado. Instalar con: pip install scikit-learn'}

        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT a.id FROM alumnos a
            JOIN calificaciones c ON c.alumno_id = a.id
            JOIN asistencias ast ON ast.alumno_id = a.id
            WHERE a.estado = 'matriculado'
            GROUP BY a.id
            HAVING COUNT(DISTINCT c.curso_id) >= 2 AND COUNT(ast.id) >= 5
        """)
        alumnos = cursor.fetchall()

        if len(alumnos) < 5:
            return {'error': 'Datos insuficientes para entrenar. Se necesitan al menos 5 alumnos con calificaciones y asistencias.'}

        data = []
        labels = []

        for a in alumnos:
            features, _ = self._extract_features(a['id'])
            if features:
                data.append([
                    features['promedio_general'],
                    features['nota_minima'],
                    features['nota_maxima'],
                    features['porcentaje_ausencias'],
                    features['porcentaje_tardanzas'],
                    features['cursos_desaprobados'],
                    features['promedio_reciente'],
                    features['tendencia_rendimiento']
                ])

                score = 0
                if features['promedio_general'] < 8: score += 40
                elif features['promedio_general'] < 11: score += 25
                if features['porcentaje_ausencias'] > 20: score += 30
                elif features['porcentaje_ausencias'] > 10: score += 15
                if features['cursos_desaprobados'] > 0:
                    ratio = features['cursos_desaprobados'] / max(features['total_cursos'], 1)
                    if ratio > 0.5: score += 25
                    elif ratio > 0.25: score += 15
                if features['tendencia_rendimiento'] < -3: score += 20
                elif features['tendencia_rendimiento'] < -1: score += 10

                if score >= 60: labels.append(2)
                elif score >= 30: labels.append(1)
                else: labels.append(0)

        cursor.close()
        conn.close()

        X = np.array(data)
        y = np.array(labels)

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        self.model = GradientBoostingClassifier(
            n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42
        )
        self.model.fit(X_train_scaled, y_train)

        accuracy = self.model.score(X_test_scaled, y_test)
        y_pred = self.model.predict(X_test_scaled)
        report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

        self._save_model()

        return {
            'mensaje': 'Modelo entrenado exitosamente',
            'accuracy': round(accuracy, 4),
            'muestra_entrenamiento': len(X_train),
            'muestra_prueba': len(X_test),
            'metricas': {
                'precision': round(report.get('weighted avg', {}).get('precision', 0), 4),
                'recall': round(report.get('weighted avg', {}).get('recall', 0), 4),
                'f1_score': round(report.get('weighted avg', {}).get('f1-score', 0), 4)
            },
            'metodo': 'gradient_boosting'
        }
