const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "../music.db");
const db = new sqlite3.Database(dbPath);

// ==================================================
// Initialize Database (CLEAN)
// ==================================================
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS songs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_path TEXT NOT NULL UNIQUE,

          tempo REAL DEFAULT 0,
          tempo_variance REAL DEFAULT 0,

          energy REAL DEFAULT 0,
          energy_variance REAL DEFAULT 0,

          mood TEXT NOT NULL,

          mood_calm_prob REAL DEFAULT 0,
          mood_energetic_prob REAL DEFAULT 0,
          mood_happy_prob REAL DEFAULT 0,
          mood_sad_prob REAL DEFAULT 0,

          play_count INTEGER DEFAULT 0
        )
      `, err => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

// ==================================================
// Add or Update Song (SAFE & SIMPLE)
// ==================================================
function addSong(songData) {
  return new Promise((resolve, reject) => {
    const f = songData.audio_features || {};

    const sql = `
      INSERT INTO songs (
        file_path,
        tempo,
        tempo_variance,
        energy,
        energy_variance,
        mood,
        mood_calm_prob,
        mood_energetic_prob,
        mood_happy_prob,
        mood_sad_prob
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(file_path) DO UPDATE SET
        tempo = excluded.tempo,
        tempo_variance = excluded.tempo_variance,
        energy = excluded.energy,
        energy_variance = excluded.energy_variance,
        mood = excluded.mood,
        mood_calm_prob = excluded.mood_calm_prob,
        mood_energetic_prob = excluded.mood_energetic_prob,
        mood_happy_prob = excluded.mood_happy_prob,
        mood_sad_prob = excluded.mood_sad_prob
    `;

    const params = [
      songData.file_path,

      f.tempo ?? 0,
      f.tempo_variance ?? 0,
      f.energy ?? 0,
      f.energy_variance ?? 0,

      songData.mood,
      songData.probabilities?.calm ?? 0,
      songData.probabilities?.energetic ?? 0,
      songData.probabilities?.happy ?? 0,
      songData.probabilities?.sad ?? 0
    ];

    db.run(sql, params, function (err) {
      if (err) return reject(err);

      db.get(
        "SELECT * FROM songs WHERE file_path = ?",
        [songData.file_path],
        (e, row) => {
          if (e) return reject(e);
          resolve(row);
        }
      );
    });
  });
}

// ==================================================
// Fetch Helpers
// ==================================================
function getSongById(id) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM songs WHERE id = ?", [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getAllSongs() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM songs ORDER BY id DESC", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  db,
  initializeDatabase,
  addSong,
  getSongById,
  getAllSongs
};

