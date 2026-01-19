const fs = require('fs');
const path = require('path');
const { db, getAllSongs, addSong } = require('./db');
const { analyzeSong } = require('./mlService');

async function clearDatabase() {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM songs", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function reanalyzeDataset(audioDirPath, options = {}) {
  const { 
    batchSize = 10, 
    delay = 1000, // Delay between batches to avoid overwhelming ML service
    onProgress = null,
    maxFiles = null 
  } = options;
  
  const audioDir = path.resolve(audioDirPath);
  
  if (!fs.existsSync(audioDir)) {
    throw new Error(`Audio directory not found: ${audioDir}`);
  }

  const files = fs.readdirSync(audioDir)
    .filter(file => file.endsWith('.mp3'))
    .sort((a, b) => {
      // Sort numerically by filename
      const aNum = parseInt(a.replace('.mp3', ''));
      const bNum = parseInt(b.replace('.mp3', ''));
      return aNum - bNum;
    });
  
  if (maxFiles) {
    files.splice(maxFiles);
  }
  
  console.log(`🎵 Starting re-analysis of ${files.length} files with FULL AUDIO method`);
  console.log(`📁 Directory: ${audioDir}`);
  console.log(`⚙️  Batch size: ${batchSize}, Delay: ${delay}ms`);
  
  const results = {
    total: files.length,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [],
    startTime: new Date()
  };

  // Process in batches
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(files.length / batchSize);
    
    console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} files)`);
    
    for (const file of batch) {
      try {
        const filePath = path.join(audioDir, file);
        const startTime = Date.now();
        
        console.log(`🔄 [${results.processed + 1}/${results.total}] Analyzing ${file}...`);
        
        // Send to ML service for full-audio analysis
        const mlResult = await analyzeSong(filePath);
        
        // Save to database
        await addSong({
          ...mlResult,
          file_path: file
        });
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ ${file} - Mood: ${mlResult.mood} (${processingTime}ms)`);
        
        results.successful++;
        
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
        results.errors.push({ file, error: error.message });
        results.failed++;
      }
      
      results.processed++;
      
      // Progress callback
      if (onProgress) {
        onProgress(results);
      }
      
      // Small delay between files to avoid overwhelming the service
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Longer delay between batches
    if (i + batchSize < files.length) {
      console.log(`⏳ Batch ${batchNum} complete. Waiting ${delay}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  results.endTime = new Date();
  results.duration = results.endTime - results.startTime;
  results.avgTimePerFile = results.duration / results.processed;
  
  return results;
}

async function getReanalysisStats() {
  const songs = await getAllSongs();
  const moodCounts = {};
  const filesWithConfidence = songs.filter(song => 
    song.mood_calm_prob > 0 || song.mood_energetic_prob > 0 || 
    song.mood_happy_prob > 0 || song.mood_sad_prob > 0
  );
  
  songs.forEach(song => {
    moodCounts[song.mood] = (moodCounts[song.mood] || 0) + 1;
  });
  
  return {
    totalSongs: songs.length,
    songsWithConfidence: filesWithConfidence.length,
    moodDistribution: moodCounts,
    lastAnalyzed: songs.length > 0 ? songs[songs.length - 1].file_path : null
  };
}

module.exports = { 
  clearDatabase, 
  reanalyzeDataset, 
  getReanalysisStats 
};
