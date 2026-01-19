#!/usr/bin/env python3
"""
🎵 Smart Playlist Matcher - Enhanced with Anti-Overfitting Model
Full audio analysis with 4-class mood prediction and recommendations
"""

import sys
import os
import numpy as np
import pandas as pd
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import librosa
import pickle
import warnings
import time
warnings.filterwarnings('ignore')

app = FastAPI(title="Smart Playlist Matcher - Anti-Overfitting Model", description="Full audio mood prediction with recommendations")

# Global variables
model_data = None
model_path = None

class PredictionResponse(BaseModel):
    mood: str
    confidence: float
    mood_percentages: dict
    tempo: float
    energy: float
    audio_features: dict

def extract_anti_overfitting_features(audio_path):
    """Extract exactly 15 features for anti_overfitting model"""
    try:
        # Load FULL audio for accurate analysis
        y, sr = librosa.load(audio_path)  # No duration limit
        
        # Extract exactly 15 features in the order expected by model
        features = []
        
        # feature_0: tempo_mean (DOMINANT - 94.93% importance)
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        features.append(float(tempo))
        
        # feature_1: energy_rms_mean
        rms = librosa.feature.rms(y=y)
        features.append(float(np.mean(rms)))
        
        # feature_2: spectral_centroid_mean
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)
        features.append(float(np.mean(spectral_centroids)))
        
        # feature_3: zero_crossing_rate_mean
        zcr = librosa.feature.zero_crossing_rate(y=y)
        features.append(float(np.mean(zcr)))
        
        # feature_4: spectral_rolloff_mean
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
        features.append(float(np.mean(spectral_rolloff)))
        
        # feature_5: mfcc_1_mean
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        features.append(float(np.mean(mfccs[0])))
        
        # feature_6: mfcc_2_mean
        features.append(float(np.mean(mfccs[1])))
        
        # feature_7: chroma_mean
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        features.append(float(np.mean(chroma)))
        
        # feature_8: onset_strength_mean
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
        features.append(float(len(onset_frames)) if len(onset_frames) > 0 else 0.0)
        
        # feature_9: spectral_contrast_mean
        spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
        features.append(float(np.mean(spectral_contrast)))
        
        # feature_10: tempo_std
        features.append(float(np.std(beats)) if len(beats) > 1 else 0.0)
        
        # feature_11: energy_rms_std
        features.append(float(np.std(rms)))
        
        # feature_12: spectral_rolloff_std
        features.append(float(np.std(spectral_rolloff)))
        
        # feature_13: chroma_std
        features.append(float(np.std(chroma)))
        
        # feature_14: onset_strength_std
        features.append(float(np.std(beats)) if len(beats) > 1 else 0.0)
        
        return np.array(features)
        
    except Exception as e:
        print(f"⚠️  Error extracting features: {e}")
        return None

def load_model():
    """Load anti_overfitting mood classifier"""
    global model_data, model_path
    
    print("🔄 Loading anti_overfitting mood classifier...")
    
    # Load anti_overfitting mood classifier ONLY
    model_path = Path(__file__).resolve().parent / "models" / "anti_overfitting_mood_classifier.pkl"
    
    if not model_path.exists():
        raise FileNotFoundError(f"anti_overfitting_mood_classifier.pkl not found: {model_path}")
    
    print("✅ Using anti_overfitting_mood_classifier.pkl")
    
    with open(model_path, 'rb') as f:
        model_data = pickle.load(f)
    
    print(f"✅ Model loaded successfully!")
    print(f"📏 Feature count: {model_data['features']}")
    print(f"🎯 Model type: {model_data.get('model_type', 'unknown')}")
    print(f"🎭 Classes: {list(model_data['classes'])}")

@app.on_event("startup")
async def startup_event():
    """Initialize the application"""
    try:
        load_model()
        print("🚀 Smart Playlist Matcher with Anti-Overfitting Model is ready!")
    except Exception as e:
        print(f"❌ Failed to initialize: {e}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Python ML Service - Anti-Overfitting Model",
        "model_loaded": model_data is not None,
        "model_path": str(model_path) if model_path else None,
        "features": model_data['features'] if model_data else None,
        "classes": list(model_data['classes']) if model_data else None,
        "timestamp": time.time()
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_mood(file: UploadFile = File(...)):
    """Predict mood from uploaded audio file"""
    try:
        # Save uploaded file temporarily
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        print(f"📁 Received file: {file.filename}")
        print(f"📄 Content type: {file.content_type}")
        
        # Extract features
        features = extract_anti_overfitting_features(temp_path)
        if features is None:
            raise HTTPException(status_code=400, detail="Feature extraction failed")
        
        # Scale features
        features_scaled = model_data['scaler'].transform(features.reshape(1, -1))[0]
        
        # Predict mood
        mood_probs = model_data['model'].predict_proba([features_scaled])[0]
        mood_idx = np.argmax(mood_probs)
        predicted_mood = model_data['classes'][mood_idx]
        confidence = float(mood_probs[mood_idx])
        
        # Create mood percentages
        mood_percentages = {}
        for i, mood_class in enumerate(model_data['classes']):
            mood_percentages[mood_class] = float(mood_probs[i])
        
        # Extract additional audio features for response
        y, sr = librosa.load(temp_path)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        rms = librosa.feature.rms(y=y)
        energy = float(np.mean(rms))
        
        # Create response with 15 audio features matching model expectations
        response = PredictionResponse(
            mood=predicted_mood,
            confidence=confidence,
            mood_percentages=mood_percentages,
            tempo=float(tempo),
            energy=energy,
            audio_features={
                # 15 Features matching model expectations (feature_0 to feature_14)
                "feature_0": float(features[0]),  # tempo_mean (DOMINANT)
                "feature_1": float(features[1]),  # energy_rms_mean
                "feature_2": float(features[2]),  # spectral_centroid_mean
                "feature_3": float(features[3]),  # zero_crossing_rate_mean
                "feature_4": float(features[4]),  # spectral_rolloff_mean
                "feature_5": float(features[5]),  # mfcc_1_mean
                "feature_6": float(features[6]),  # mfcc_2_mean
                "feature_7": float(features[7]),  # chroma_mean
                "feature_8": float(features[8]),  # onset_strength_mean
                "feature_9": float(features[9]),  # spectral_contrast_mean
                "feature_10": float(features[10]), # tempo_std
                "feature_11": float(features[11]), # energy_rms_std
                "feature_12": float(features[12]), # spectral_rolloff_std
                "feature_13": float(features[13]), # chroma_std
                "feature_14": float(features[14])  # onset_strength_std
            }
        )
        
        # Cleanup
        os.remove(temp_path)
        print(f"🗑️ Cleaned up temp file")
        
        print(f"✅ Prediction: {predicted_mood} ({confidence:.3f})")
        return response
        
    except HTTPException:
        # Cleanup on error
        if os.path.exists(temp_path):
            os.remove(temp_path)
        print(f"🗑️ Cleaned up temp file")
        raise
    except Exception as e:
        # Cleanup on error
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        print(f"🗑️ Cleaned up temp file")
        print(f"❌ Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/", response_class=HTMLResponse)
async def home():
    """Simple web interface"""
    return """
<!DOCTYPE html>
<html>
<head>
    <title>🎵 Smart Playlist Matcher - Anti-Overfitting Model</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 2rem; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        .upload-area { border: 2px dashed #ccc; padding: 2rem; text-align: center; margin: 2rem 0; border-radius: 5px; }
        .upload-area:hover { border-color: #007bff; }
        button { background: #007bff; color: white; padding: 1rem 2rem; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .result { margin-top: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 Smart Playlist Matcher</h1>
        <p>Upload an audio file to predict its mood using the anti-overfitting model</p>
        
        <form action="/predict" method="post" enctype="multipart/form-data">
            <div class="upload-area">
                <input type="file" name="file" accept="audio/*" required>
                <p>Choose an audio file (MP3, WAV, etc.)</p>
            </div>
            <button type="submit">🎯 Predict Mood</button>
        </form>
        
        <div id="result" class="result" style="display: none;">
            <h3>Results will appear here...</h3>
        </div>
    </div>
</body>
</html>
"""

if __name__ == "__main__":
    uvicorn.run("smart_playlist_enhanced_audio:app", host="0.0.0.0", port=8001, reload=True)
