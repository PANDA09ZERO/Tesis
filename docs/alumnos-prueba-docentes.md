# Alumnos de prueba para profesores

Lote solicitado y aplicado en la base local el 27/10/2026. No modifica periodos históricos ni cuentas existentes.

## Datos añadidos

- Periodo vigente: 2026-II, del 09/08/2026 al 26/12/2026.
- 20 alumnos ficticios: 10 en 1er Grado de Primaria y 10 en 4to Grado de Primaria.
- 160 inscripciones activas: cada alumno se matricula en todos los cursos ya configurados de su grado (7 y 9 respectivamente). Son 20 alumnos, no 160 alumnos.
- María García recibe la oferta existente de Matemáticas de 1er Grado de Primaria, que no tenía responsable. Las otras asignaciones se conservan.
- Josias: 10 nuevos alumnos en Arte de 1er Grado de Primaria.
- Cristian: 10 nuevos alumnos en Arte de 4to Grado de Primaria.
- Ariana: 20 nuevos alumnos entre Inglés de 1er y 4to Grado de Primaria.
- María: 10 nuevos alumnos en Matemáticas de 1er Grado de Primaria.
- Karen: 10 nuevos alumnos en Comunicación de 1er Grado de Primaria.

Son asignaciones de demostración para probar el sistema, no una definición de la distribución institucional de docentes.

## Identificación y límites

Los nombres comienzan por `Alumno Prueba`, los códigos por `PD26-` y los correos usan el dominio reservado `example.invalid`. Las matrículas llevan la observación `PRUEBA-DOCENTES-2026II`. No se inventan DNI, contactos ni apoderados.

No se crean pagos, mensualidades, sueldos, notas, asistencias ni horarios. Una matrícula académica activa no representa un pago realizado. No se modifican contraseñas existentes; cada cuenta sintética tiene una clave aleatoria no publicada. Para esta prueba se ingresa con las cuentas existentes de profesores.

## Ejecución y verificación

Desde `backend`:

```powershell
node --check scripts/demo-alumnos-periodo.cjs
node scripts/demo-alumnos-periodo.cjs
node scripts/demo-alumnos-periodo.cjs --apply
```

Sin `--apply` se simula la transacción y se revierte. Solo permite la instalación local de desarrollo y el periodo vigente 2026-II. No usar el seed general, que tiene otro alcance. Las simulaciones pueden dejar saltos normales en los identificadores autoincrementales.

Se comprobó la persistencia con una segunda ejecución: 0 alumnos, 0 inscripciones y 0 asignaciones adicionales; sin duplicados. También se ejecutó directamente el controlador existente `getAllAlumnos` con el alcance de cada profesor, filtro de periodo y búsqueda `Alumno Prueba`: respuestas 200 con 10/10/20/10/10 alumnos respectivamente. No fue necesario abrir servidores ni cambiar sesiones.

Para probar en la interfaz: iniciar sesión como profesor, seleccionar 2026-II y abrir Mis alumnos, Mis cursos, asistencia o libro de calificaciones. Las evaluaciones y asistencias se registran con las operaciones habituales; el lote no precarga resultados.

Antes de usar esta misma base con datos institucionales, revisar este lote identificado y retirarlo mediante un procedimiento que respete cualquier historial de prueba creado posteriormente. No se programa ningún borrado automático.
