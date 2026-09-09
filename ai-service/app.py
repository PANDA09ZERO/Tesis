from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from predictor import AcademicRiskPredictor

load_dotenv()

app = Flask(__name__)
CORS(app)

predictor = AcademicRiskPredictor()

@app.route('/api/ai/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'academic-risk-predictor'})

@app.route('/api/ai/predict/<int:alumno_id>', methods=['GET'])
def predict_risk(alumno_id):
    try:
        result = predictor.predict_risk(alumno_id)
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/ai/predict-batch', methods=['POST'])
def predict_batch():
    try:
        data = request.get_json()
        alumno_ids = data.get('alumno_ids', [])
        results = predictor.predict_batch(alumno_ids)
        return jsonify({'success': True, 'data': results})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/ai/analyze-all', methods=['POST'])
def analyze_all():
    try:
        results = predictor.analyze_all_students()
        return jsonify({'success': True, 'data': results})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/ai/train', methods=['POST'])
def train_model():
    try:
        result = predictor.train_model()
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
