const fs = require("fs");
const { analyzeSong } = require("../services/mlService");
const { buildInsight } = require("../services/recommendService");
const { buildInsight } = require("../services/insightService");
exports.uploadAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const mlResult = await analyzeSong(req.file.path);

    const insight = buildInsight(mlResult);

    res.json({
      analysis: mlResult,
      insight
    });

  } catch (err) {
    console.error("ML PROCESSING ERROR:", err.message);
    res.status(500).json({ error: "ML processing failed" });

  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};
