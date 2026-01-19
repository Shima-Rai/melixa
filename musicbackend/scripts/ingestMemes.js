// scripts/ingestMemes.js
const fs = require('fs');
const path = require('path');
const { analyzeSong } = require('../services/mlService');
const { addSong } = require('../services/db');

const MEME_DIR = path.join(__dirname, '../meme_audio');

// Retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        console.log(`⏳ Retry ${i + 1}/${maxRetries - 1} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      }
    }
  }
  throw lastError;
}

(async function ingestMemes() {
  const files = fs.readdirSync(MEME_DIR);
  let processed = 0;
  let failed = 0;

  for (const file of files) {
    if (!file.match(/\.(mp3|wav|ogg|m4a)$/i)) continue;

    try {
      console.log(`🎧 Ingesting [${processed + failed + 1}/${files.length}]: ${file}`);
      
      const mlResult = await retryWithBackoff(() => 
        analyzeSong(path.join(MEME_DIR, file)), 3, 500
      );

      // Extract variance features from normalized audio_features (mlService already normalizes)
      const audioFeatures = mlResult.audio_features || {};
      const tempo = audioFeatures.tempo ?? audioFeatures.raw?.tempo ?? audioFeatures.raw?.feature_0 ?? 0;
      const tempoVariance = audioFeatures.tempo_variance ?? audioFeatures.raw?.tempo_variance ?? audioFeatures.raw?.feature_10 ?? 0;
      const energy = audioFeatures.energy ?? audioFeatures.raw?.energy ?? audioFeatures.raw?.feature_1 ?? 0;
      const energyVariance = audioFeatures.energy_variance ?? audioFeatures.raw?.energy_variance ?? audioFeatures.raw?.feature_11 ?? 0;

      await addSong({
        file_path: file,
        mood: mlResult.mood,
        probabilities: mlResult.probabilities,
        audio_features: {
          tempo,
          tempo_variance: tempoVariance,
          energy,
          energy_variance: energyVariance
        }
      });
      
      processed++;
      if (processed % 50 === 0) {
        console.log(`✅ Progress: ${processed}/${files.length} processed`);
      }
    } catch (error) {
      console.error(`❌ Failed to ingest ${file}: ${error.message}`);
      failed++;
    }
  }

  console.log(`✅ Meme audio ingestion complete: ${processed} processed, ${failed} failed`);
})().catch(console.error);
