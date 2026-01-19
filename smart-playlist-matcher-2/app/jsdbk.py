import logging
import pickle
import librosa
import numpy as np
import tempfile
import subprocess
import shutil
import os
from pathlib import Path

logger = logging.getLogger(__name__)

class AudioDecodeError(Exception):
    """Raised when an audio file cannot be decoded by librosa/audioread."""
    pass

class ModelLoadError(Exception):
    """Raised when the ML model or its metadata is invalid or missing."""
    pass

# ==================================================
# Load Model + Scaler
# ==================================================
MODEL_PATH = Path(__file__).parent / "models" / "anti_overfitting_mood_classifier.pkl"

with open(MODEL_PATH, "rb") as f:
    bundle = pickle.load(f)

classifier = bundle.get("model")
scaler = bundle.get("scaler")

# Get moods from the new model structure
MOODS = None
if isinstance(bundle, dict):
    MOODS = bundle.get("classes")
    if MOODS is None:
        MOODS = bundle.get("moods")
    
    if MOODS is not None and hasattr(MOODS, '__iter__') and not isinstance(MOODS, str):
        MOODS = [str(m) for m in MOODS]

if MOODS is None or (isinstance(MOODS, list) and len(MOODS) == 0):
    MOODS = getattr(classifier, "classes_", None)
    if MOODS is not None:
        MOODS = [str(m) for m in MOODS]

if MOODS is None or (isinstance(MOODS, list) and len(MOODS) == 0):
    MOODS = ["calm", "energetic", "happy", "sad"]
    logger.warning("Model moods not found in bundle; falling back to default labels %s", MOODS)

logger.info("Loaded moods: %s", MOODS)


def verify_model_moods(required=None):
    """Ensure the loaded model contains the required mood labels."""
    if required is None:
        required = {"happy", "calm", "energetic", "sad"}
    else:
        required = set(required)

    loaded = set(MOODS or [])
    if not required.issubset(loaded):
        logger.error("Model moods validation failed. required=%s loaded=%s", required, loaded)
        raise ModelLoadError(f"Model moods missing required labels: {sorted(required - loaded)}")
    logger.info("Model moods validation passed: %s", loaded)
    return True


def load_audio(audio_path):
    """
    Load ENTIRE audio file.
    Raises AudioDecodeError on failure.
    """
    try:
        # Load entire file with sr=22050 (matching training)
        y, sr = librosa.load(audio_path, duration=None, sr=22050, mono=True)
        actual_duration = len(y) / sr
        logger.info("✅ Loaded FULL audio: %.2f seconds @ %d Hz", actual_duration, sr)
        return y, sr
    except Exception as e:
        logger.warning("Direct load failed: %s, trying ffmpeg...", str(e))
        if shutil.which("ffmpeg"):
            tmpfd, tmpwav = tempfile.mkstemp(suffix=".wav")
            os.close(tmpfd)
            try:
                subprocess.check_call(
                    ["ffmpeg", "-y", "-i", str(audio_path), "-ar", "22050", "-ac", "1", tmpwav],
                    stdout=subprocess.DEVNULL, 
                    stderr=subprocess.DEVNULL
                )
                y, sr = librosa.load(tmpwav, duration=None, sr=22050, mono=True)
                logger.info("✅ Loaded FULL audio via ffmpeg: %.2f seconds", len(y)/sr)
                return y, sr
            except Exception as e2:
                raise AudioDecodeError(f"Audio decode failed after ffmpeg conversion: {e2}") from e2
            finally:
                if os.path.exists(tmpwav):
                    os.remove(tmpwav)
        else:
            raise AudioDecodeError("Audio decode failed: no suitable backend found (install ffmpeg)") from e


def extract_features_from_audio(y, sr):
    """
    Extract 15 discriminative features in EXACT training order.
    
    Feature Order (CRITICAL - DO NOT CHANGE):
    1. tempo_mean
    2. energy_rms_mean
    3. spectral_centroid_mean
    4. zero_crossing_rate_mean
    5. spectral_rolloff_mean
    6. mfcc_1_mean (2nd MFCC coefficient)
    7. mfcc_2_mean (3rd MFCC coefficient)
    8. chroma_mean
    9. onset_strength_mean
    10. spectral_contrast_mean
    11. tempo_std
    12. energy_rms_std
    13. spectral_rolloff_std
    14. chroma_std
    15. onset_strength_std
    """
    duration_seconds = len(y) / sr
    logger.info("🔬 Extracting features from %.2f seconds of audio...", duration_seconds)
    
    try:
        # Extract all audio features
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        zcr = librosa.feature.zero_crossing_rate(y, frame_length=2048, hop_length=512)
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)
        
        # MFCC: Extract 13 coefficients, use indices 1 and 2 (skip 0th)
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, n_fft=2048, hop_length=512)
        
        chroma = librosa.feature.chroma_stft(y=y, sr=sr, n_fft=2048, hop_length=512)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr, n_fft=2048, hop_length=512)
        
        # Build feature array in EXACT order
        features = np.array([
            float(tempo),                           # 1. tempo_mean
            float(np.mean(rms)),                    # 2. energy_rms_mean
            float(np.mean(spectral_centroid)),      # 3. spectral_centroid_mean
            float(np.mean(zcr)),                    # 4. zero_crossing_rate_mean
            float(np.mean(spectral_rolloff)),       # 5. spectral_rolloff_mean
            float(np.mean(mfccs[1])),               # 6. mfcc_1_mean (2nd coefficient)
            float(np.mean(mfccs[2])),               # 7. mfcc_2_mean (3rd coefficient)
            float(np.mean(chroma)),                 # 8. chroma_mean
            float(np.mean(onset_env)),              # 9. onset_strength_mean
            float(np.mean(spectral_contrast)),      # 10. spectral_contrast_mean
            float(np.std(onset_env)),               # 11. tempo_std (using onset_env std as proxy)
            float(np.std(rms)),                     # 12. energy_rms_std
            float(np.std(spectral_rolloff)),        # 13. spectral_rolloff_std
            float(np.std(chroma)),                  # 14. chroma_std
            float(np.std(onset_env))                # 15. onset_strength_std
        ]).reshape(1, -1)
        
        logger.info("✅ Extracted 15 features from %.2f seconds", duration_seconds)
        return features
        
    except Exception as e:
        logger.error("❌ Feature extraction failed: %s", str(e))
        raise


def predict_mood(audio_path):
    """
    Predict mood from ENTIRE song and return comprehensive audio features.
    
    Args:
        audio_path: Path to the audio file
    
    Returns:
        Dictionary with mood, probabilities, and audio features
    """
    try:
        # Load ENTIRE audio file
        y, sr = load_audio(audio_path)
        
        song_duration = len(y) / sr
        logger.info("🎵 Analyzing FULL song: %.2f seconds", song_duration)
        
        # Extract features from entire audio
        features_array = extract_features_from_audio(y, sr)
        
        # Scale features using model's scaler
        features_scaled = scaler.transform(features_array)
        
        # Get ML prediction
        mood = classifier.predict(features_scaled)[0]
        probs = classifier.predict_proba(features_scaled)[0]
        
        max_prob = float(np.max(probs))
        logger.info("🎯 Predicted mood: %s (confidence: %.1f%%)", mood, max_prob * 100)
        
        # Calculate additional features for UI display
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        tempo_value = float(tempo) if np.isscalar(tempo) else float(np.mean(tempo))
        
        # Calculate tempo variance from beat intervals
        if len(beats) > 1:
            beat_times = librosa.frames_to_time(beats, sr=sr)
            beat_intervals = np.diff(beat_times)
            tempo_variance = float(np.std(beat_intervals) * 60) if len(beat_intervals) > 0 else 0.0
        else:
            tempo_variance = 0.0
        
        # Energy features
        rms = librosa.feature.rms(y=y)
        energy = float(np.mean(rms))
        energy_variance = float(np.std(rms))
        
        # Additional audio features
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
        zcr = librosa.feature.zero_crossing_rate(y)
        
        # Use canonical labels from the model bundle
        labels = list(MOODS)
        if len(probs) != len(labels):
            logger.warning(
                "Probability vector length %d does not match label length %d", 
                len(probs), len(labels)
            )
            raw = getattr(classifier, "classes_", None)
            if raw is not None:
                labels = [str(l) for l in raw]

        result = {
            "mood": str(mood),
            "probabilities": dict(zip(labels, [float(p) for p in probs])),
            "audio_features": {
                "tempo": tempo_value,
                "tempo_variance": tempo_variance,
                "energy": energy,
                "energy_variance": energy_variance,
                "spectral_centroid": float(np.mean(centroid)),
                "spectral_bandwidth": float(np.mean(bandwidth)),
                "zero_crossing_rate": float(np.mean(zcr)),
                "valence": float(np.mean(centroid) / (sr / 2)),
                "duration": float(song_duration)
            }
        }
        
        logger.info("✅ Analysis complete!")
        return result
        
    except Exception as e:
        logger.exception("❌ Prediction failed: %s", str(e))
        raise