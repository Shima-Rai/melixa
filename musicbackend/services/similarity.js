// services/similarity.js
// Robust feature-based similarity (0–100)

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Ensure minimum required features exist
 */
function validateSong(song) {
  return (
    typeof song?.tempo === "number" &&
    typeof song?.energy === "number" &&
    typeof song?.tempo_variance === "number" &&
    typeof song?.energy_variance === "number"
  );
}

/**
 * Calculate similarity score between two songs
 */
function calculateSimilarity(song1, song2) {
  if (!validateSong(song1) || !validateSong(song2)) {
    throw new Error(
      `Invalid song features (song1=${song1?.id}, song2=${song2?.id})`
    );
  }

  /* ================= WEIGHTS ================= */
  const weights = {
    tempo: 0.25,
    energy: 0.25,
    mood: 0.30,
    spectral: 0.20
  };

  /* ================= TEMPO ================= */
  const tempoSimilarity = clamp(
    1 - Math.abs(song1.tempo - song2.tempo) / 200
  );

  const tempoVarSimilarity = clamp(
    1 - Math.abs(song1.tempo_variance - song2.tempo_variance)
  );

  const tempoCombined =
    0.7 * tempoSimilarity + 0.3 * tempoVarSimilarity;

  /* ================= ENERGY ================= */
  const energySimilarity = clamp(
    1 - Math.abs(song1.energy - song2.energy)
  );

  const energyVarSimilarity = clamp(
    1 - Math.abs(song1.energy_variance - song2.energy_variance)
  );

  const energyCombined =
    0.7 * energySimilarity + 0.3 * energyVarSimilarity;

  /* ================= MOOD ================= */
  const moods = ["calm", "energetic", "happy", "sad"];
  let moodSimilarity = 0;

  if (song1.mood === song2.mood) {
    const p1 = song1[`mood_${song1.mood}_prob`] ?? 0;
    const p2 = song2[`mood_${song2.mood}_prob`] ?? 0;
    moodSimilarity = clamp(0.8 + 0.2 * Math.min(p1, p2));
  } else {
    let overlap = 0;
    for (const m of moods) {
      overlap += Math.min(
        song1[`mood_${m}_prob`] ?? 0,
        song2[`mood_${m}_prob`] ?? 0
      );
    }
    // Penalize different primary moods
    moodSimilarity = clamp(overlap * 0.85);
  }

  /* ================= SPECTRAL ================= */
  let spectralSimilarity = 0.5; // safe default

  if (
    typeof song1.spectral_centroid === "number" &&
    typeof song2.spectral_centroid === "number"
  ) {
    spectralSimilarity = clamp(
      1 -
        Math.abs(
          song1.spectral_centroid - song2.spectral_centroid
        ) / 5000
    );
  }

  /* ================= FINAL SCORE ================= */
  const totalSimilarity =
    weights.tempo * tempoCombined +
    weights.energy * energyCombined +
    weights.mood * moodSimilarity +
    weights.spectral * spectralSimilarity;

  // 🔥 1-decimal precision to avoid ties
  return Math.round(totalSimilarity * 1000) / 10;
}

/**
 * Generate recommendations
 */
function getRecommendations(referenceSong, allSongs, options = {}) {
  const {
    limit = 10,
    minSimilarity = 0,
    sameMoodOnly = false,
    excludeIds = []
  } = options;

  return allSongs
    .filter(song => {
      if (song.id === referenceSong.id) return false;
      if (excludeIds.includes(song.id)) return false;
      if (sameMoodOnly && song.mood !== referenceSong.mood) return false;
      return true;
    })
    .map(song => ({
      ...song,
      similarity_score: calculateSimilarity(referenceSong, song)
    }))
    .filter(song => song.similarity_score >= minSimilarity)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, limit);
}

module.exports = {
  calculateSimilarity,
  getRecommendations
};
