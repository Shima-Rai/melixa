exports.buildInsight = (ml) => {
  const confidence = Math.max(...Object.values(ml.probabilities));

  return {
    mood: ml.predicted_mood,
    confidence: (confidence * 100).toFixed(2) + "%",
    intensity:
      confidence > 0.7 ? "high" : confidence < 0.4 ? "low" : "medium"
  };
};
