const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const PYTHON_ML_URL = 'http://127.0.0.1:8001';
const { analyzeSong } = require('../services/mlService');
const { addSong, getSongById, getAllSongs } = require('../services/db');
const { calculateSimilarity, getRecommendations } = require('../services/similarity');
const { loadAudioFilesFromDirectory } = require('../services/audioLoader');
const { clearDatabase, reanalyzeDataset, getReanalysisStats } = require('../services/reanalyzer');

// Helper function to calculate confidence from probabilities
function calculateConfidence(probabilities) {
  if (!probabilities) return '0%';
  const maxProb = Math.max(...Object.values(probabilities));
  return (maxProb * 100).toFixed(2) + '%';
}

// =======================
// Multer configuration
// =======================
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // ✅ MATCH Python (100 MB)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// =======================
// GET /api/analyze (HTML form)
// =======================
router.get('/analyze', (req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head><meta charset="utf-8"><title>Upload Audio</title></head>
      <body style="font-family: sans-serif; margin: 2rem;">
        <h2>Upload audio to /api/analyze</h2>
        <form action="/api/analyze" method="post" enctype="multipart/form-data">
          <input type="file" name="file" accept="audio/*" required />
          <button type="submit">Upload & Analyze</button>
        </form>
      </body>
    </html>
  `);
});

// =======================
// POST /api/analyze
// =======================
router.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file uploaded',
        hint: 'Use form-data with key = file'
      });
    }

    console.log('🎧 Uploaded:', req.file.originalname);

    // 1️⃣ ML analysis
    const mlResult = await analyzeSong(req.file.path);

    // 2️⃣ Extract variance features from audio_features (normalized in mlService)
    const audioFeatures = mlResult.audio_features || {};
    
    // Use normalized values with fallback to raw map
    const tempo = audioFeatures.tempo ?? audioFeatures.raw?.tempo ?? audioFeatures.raw?.feature_0 ?? 0;
    const tempoVariance = audioFeatures.tempo_variance ?? audioFeatures.raw?.tempo_variance ?? audioFeatures.raw?.feature_10 ?? 0;
    const energy = audioFeatures.energy ?? audioFeatures.raw?.energy ?? audioFeatures.raw?.feature_1 ?? 0;
    const energyVariance = audioFeatures.energy_variance ?? audioFeatures.raw?.energy_variance ?? audioFeatures.raw?.feature_11 ?? 0;

    console.log('📊 Raw audio_features:', audioFeatures.raw || audioFeatures);
    console.log('📊 Extracted features:', {
      tempo,
      tempo_variance: tempoVariance,
      energy,
      energy_variance: energyVariance
    });

    // 3️⃣ Save to DB
    const savedSong = await addSong({
      file_path: req.file.originalname,
      mood: mlResult.mood,
      probabilities: mlResult.probabilities,
      audio_features: {
        tempo,
        tempo_variance: tempoVariance,
        energy,
        energy_variance: energyVariance
      }
    });

    // 4️⃣ Get recommendations from database
    const allSongs = await getAllSongs();
    console.log(`📊 Total songs in database: ${allSongs.length}`);
    console.log(`🎵 Saved song: id=${savedSong.id}, tempo=${savedSong.tempo}, energy=${savedSong.energy}`);
    
    let recommendations = [];
    try {
      const recRaw = getRecommendations(savedSong, allSongs, {
        limit: 5,
        minSimilarity: 0.3,
        sameMoodOnly: false
      });
      
      console.log(`✅ Found ${recRaw.length} recommendations`);
      
      recommendations = recRaw.map(song => ({
        id: song.id,
        title: song.file_path,
        mood: song.mood,
        similarity_score: song.similarity_score,
        // Format audio features for frontend
        tempo: song.tempo,
        energy: song.energy
      }));
    } catch (recError) {
      console.error('❌ Recommendations error:', recError.message);
    }

    // 5️⃣ Respond with format frontend expects
    // Format confidence as percentage string
    let confidenceStr = '0%';
    if (mlResult.confidence) {
      // If confidence is a decimal (0-1), convert to percentage
      const confidenceVal = typeof mlResult.confidence === 'number' 
        ? mlResult.confidence * 100 
        : parseFloat(mlResult.confidence) * 100;
      confidenceStr = confidenceVal.toFixed(2) + '%';
    } else if (mlResult.probabilities) {
      // Fallback: calculate from probabilities
      const maxProb = Math.max(...Object.values(mlResult.probabilities));
      confidenceStr = (maxProb * 100).toFixed(2) + '%';
    }
    
    res.json({
      mood: mlResult.mood,
      probabilities: mlResult.probabilities,
      audio_features: mlResult.audio_features,
      confidence: confidenceStr,
      recommendations: recommendations
    });

  } catch (error) {
    console.error('❌ ANALYZE ERROR:', error);

    res.status(error.status || 500).json({
      error: 'Audio analysis failed',
      details: error.responseData || error.message
    });

  } finally {
    // 🧹 Cleanup temp file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// =======================
// GET /api/python-health
// =======================
router.get('/python-health', async (req, res) => {
  try {
    const r = await axios.get(`${PYTHON_ML_URL}/health`, { timeout: 2000 });
    res.json({ python_service: 'ok', details: r.data });
  } catch (err) {
    res.status(503).json({
      error: 'Python ML service unavailable',
      details: err.message
    });
  }
});

// =======================
// GET /api/recommendations/:songId
// =======================
router.get('/recommendations/:songId', async (req, res) => {
  try {
    const songId = Number(req.params.songId);
    const limit = Number(req.query.limit) || 5;  // Changed default from 6 to 5

    const referenceSong = await getSongById(songId);
    if (!referenceSong) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const allSongs = await getAllSongs();
    
    // Use feature-based similarity (no mood tags)
    const recommendations = getRecommendations(referenceSong, allSongs, { limit });

    res.json({
      reference_song: {
        id: referenceSong.id,
        file_path: referenceSong.file_path,
        mood: referenceSong.mood
      },
      recommendations,
      similarity_method: 'feature_based' // Indicate new method
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// POST /api/reanalyze-dataset
// Re-analyze entire dataset with full audio method
// =======================
router.post('/reanalyze-dataset', async (req, res) => {
  try {
    const { batchSize = 5, maxFiles = null, clearFirst = false } = req.body;
    
    console.log('🔄 Starting FULL AUDIO re-analysis...');
    console.log(`📊 Options: batchSize=${batchSize}, maxFiles=${maxFiles}, clearFirst=${clearFirst}`);
    
    // Clear database if requested
    if (clearFirst) {
      console.log('🗑️  Clearing existing database...');
      await clearDatabase();
      console.log('✅ Database cleared');
    }
    
    const audioDir = path.join(__dirname, '../meme_audio');
    
    // Start re-analysis with progress tracking
    const results = await reanalyzeDataset(audioDir, {
      batchSize,
      maxFiles,
      delay: 2000, // 2 second delay between batches
      onProgress: (progress) => {
        const percent = ((progress.processed / progress.total) * 100).toFixed(1);
        console.log(`📈 Progress: ${progress.processed}/${progress.total} (${percent}%) - Success: ${progress.successful}, Failed: ${progress.failed}`);
      }
    });
    
    res.json({
      success: true,
      message: 'Dataset re-analysis completed',
      results: {
        ...results,
        duration: `${(results.duration / 1000).toFixed(1)}s`,
        avgTimePerFile: `${(results.avgTimePerFile / 1000).toFixed(1)}s`,
        successRate: `${((results.successful / results.processed) * 100).toFixed(1)}%`
      }
    });
    
  } catch (error) {
    console.error('❌ REANALYZE ERROR:', error);
    res.status(500).json({
      error: 'Dataset re-analysis failed',
      details: error.message
    });
  }
});

// =======================
// POST /api/clear-database
// Clear all songs from database
// =======================
router.post('/clear-database', async (req, res) => {
  try {
    console.log('🗑️  Clearing database...');
    await clearDatabase();
    console.log('✅ Database cleared successfully');
    
    res.json({
      success: true,
      message: 'Database cleared successfully'
    });
    
  } catch (error) {
    console.error('❌ CLEAR DATABASE ERROR:', error);
    res.status(500).json({
      error: 'Failed to clear database',
      details: error.message
    });
  }
});

// =======================
// GET /api/reanalysis-stats
// Get current re-analysis statistics
// =======================
router.get('/reanalysis-stats', async (req, res) => {
  try {
    const stats = await getReanalysisStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        analysisMethod: 'FULL_AUDIO', // Indicate new method
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ STATS ERROR:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      details: error.message
    });
  }
});

// =======================
// POST /api/load-audio-library
// Load all audio files from meme_audio directory
// =======================
router.post('/load-audio-library', async (req, res) => {
  try {
    const audioDir = path.join(__dirname, '../meme_audio');
    console.log('🎵 Loading audio library from:', audioDir);
    
    const results = await loadAudioFilesFromDirectory(audioDir);
    
    res.json({
      success: true,
      message: `Audio library loaded successfully`,
      results: {
        total_files: results.loaded + results.skipped,
        loaded: results.loaded,
        skipped: results.skipped,
        errors: results.errors.length,
        error_details: results.errors
      }
    });
    
  } catch (error) {
    console.error('❌ LOAD LIBRARY ERROR:', error);
    res.status(500).json({
      error: 'Failed to load audio library',
      details: error.message
    });
  }
});

// =======================
// GET /api/songs
// =======================
router.get('/songs', async (req, res) => {
  try {
    res.json(await getAllSongs());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// Serve audio files from meme_audio directory
// =======================
router.get('/meme_audio/:filename', (req, res) => {
  const filename = req.params.filename;
  const audioPath = path.join(__dirname, '../meme_audio', filename);
  
  // Security: prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  // Check if file exists
  if (!fs.existsSync(audioPath)) {
    return res.status(404).json({ error: 'Audio file not found' });
  }
  
  // Stream the audio file
  res.sendFile(audioPath);
});

module.exports = router;
