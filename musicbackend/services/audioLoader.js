const fs = require('fs');
const path = require('path');
const { addSong, getAllSongs } = require('./db');
const { analyzeSong } = require('./mlService');

async function loadAudioFilesFromDirectory(audioDirPath) {
  const audioDir = path.resolve(audioDirPath);
  
  if (!fs.existsSync(audioDir)) {
    throw new Error(`Audio directory not found: ${audioDir}`);
  }

  const files = fs.readdirSync(audioDir).filter(file => file.endsWith('.mp3'));
  console.log(`🎵 Found ${files.length} MP3 files in ${audioDir}`);

  const results = {
    loaded: 0,
    skipped: 0,
    errors: []
  };

  for (const file of files) {
    try {
      const filePath = path.join(audioDir, file);
      
      // Check if already in database
      const existingSongs = await getAllSongs();
      const alreadyExists = existingSongs.some(song => song.file_path === file);
      
      if (alreadyExists) {
        console.log(`⏭️  Skipping ${file} (already in database)`);
        results.skipped++;
        continue;
      }

      console.log(`🔄 Processing ${file}...`);
      
      // Send to ML service for analysis
      const mlResult = await analyzeSong(filePath);
      
      // Save to database
      await addSong({
        ...mlResult,
        file_path: file
      });
      
      console.log(`✅ Loaded ${file} - Mood: ${mlResult.predicted_mood}`);
      results.loaded++;
      
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
      results.errors.push({ file, error: error.message });
    }
  }

  return results;
}

module.exports = { loadAudioFilesFromDirectory };
