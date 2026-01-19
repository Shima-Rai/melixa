
exports.buildInsight = (recommendedSong) => {
  if (!recommendedSong) {
    return {
      mood: "unknown",
      confidence: "0%",
      intensity: "low",
      description: "No suitable meme audio found"
    };
  }

  const mood = recommendedSong.mood;

  const probabilities = {
    calm: recommendedSong.mood_calm_prob ?? 0,
    energetic: recommendedSong.mood_energetic_prob ?? 0,
    happy: recommendedSong.mood_happy_prob ?? 0,
    sad: recommendedSong.mood_sad_prob ?? 0
  };

  const confidence = Math.max(...Object.values(probabilities));

  let intensity = "medium";
  if (confidence >= 0.7) intensity = "high";
  else if (confidence <= 0.4) intensity = "low";

  return {
    mood,
    confidence: (confidence * 100).toFixed(2) + "%",
    intensity,
    description: getMoodDescription(mood)
  };
};

function getMoodDescription(mood) {
  return {
    happy: "Positive and uplifting emotional tone",
    energetic: "High energy and excitement",
    calm: "Relaxed and peaceful mood",
    sad: "Low energy and emotional tone"
  }[mood] || "Unknown mood";
}
