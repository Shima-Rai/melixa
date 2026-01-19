const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const PYTHON_ML_URL = 'http://127.0.0.1:8001';

async function analyzeSong(audioFilePath) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(audioFilePath));

  try {
    const response = await axios.post(
      `${PYTHON_ML_URL}/predict`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 120000, // ⏱ allow long full-song processing
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: () => true // handle errors manually
      }
    );

    // ❌ Python error propagated correctly
    if (response.status !== 200) {
      const err = new Error(`Python ML error ${response.status}`);
      err.status = response.status;
      err.responseData = response.data;
      throw err;
    }

    // ✅ Normalize keys from Python (supports both feature_* and friendly names)
    console.log('🔍 ML Response structure:', {
      mood: response.data.mood,
      confidence: response.data.confidence,
      has_mood_percentages: !!response.data.mood_percentages,
      has_audio_features: !!response.data.audio_features,
      audio_features_keys: response.data.audio_features ? Object.keys(response.data.audio_features) : 'N/A',
      tempo: response.data.audio_features?.tempo,
      tempo_variance: response.data.audio_features?.tempo_variance,
      energy: response.data.audio_features?.energy,
      energy_variance: response.data.audio_features?.energy_variance,
      feature_0: response.data.audio_features?.feature_0,
      feature_10: response.data.audio_features?.feature_10,
      feature_11: response.data.audio_features?.feature_11
    });
    
    console.log('📋 Full audio_features:', JSON.stringify(response.data.audio_features, null, 2));

    const af = response.data.audio_features || {};
    const normalizedAudioFeatures = {
      tempo: af.feature_0 ?? af.tempo ?? 0,
      tempo_variance: af.feature_10 ?? af.tempo_variance ?? 0,
      energy: af.feature_1 ?? af.energy ?? 0,
      energy_variance: af.feature_11 ?? af.energy_variance ?? 0,
      raw: af
    };
    
    return {
      mood: response.data.mood,
      probabilities: response.data.mood_percentages || response.data.probabilities,
      confidence: response.data.confidence,
      audio_features: normalizedAudioFeatures
    };

  } catch (err) {
    // Axios-level response error
    if (err.status) {
      throw err;
    }

    // Network / timeout / crash
    const e = new Error(`Python ML request failed: ${err.message}`);
    e.status = 503;
    throw e;
  }
}

module.exports = { analyzeSong };
