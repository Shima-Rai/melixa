from fastapi import FastAPI, UploadFile, File, HTTPException
import shutil, os, traceback
from app.jsdbk import predict_mood, AudioDecodeError

app = FastAPI(
    title="Smart Playlist Mood Classifier",
    version="3.0",
    description="Full song mood analysis"
)

@app.get("/health")
def health():
    return {"status": "running"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    temp_path = "temp_audio"

    try:
        # Validate audio file
        is_audio_mime = file.content_type and file.content_type.startswith("audio/")
        is_octet = file.content_type == "application/octet-stream"
        has_audio_ext = file.filename.lower().endswith(
            (".wav", ".mp3", ".ogg", ".flac", ".m4a")
        )

        if not (is_audio_mime or is_octet or has_audio_ext):
            raise HTTPException(status_code=400, detail="Unsupported audio format")

        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return predict_mood(temp_path)

    except AudioDecodeError as e:
        traceback.print_exc()
        raise HTTPException(status_code=415, detail=str(e))

    except HTTPException:
        raise

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
