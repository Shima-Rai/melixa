import axios from "axios";

const BASE_URL = "http://localhost:3000/api";

// health check
export const checkBackend = async () => {
  const res = await axios.get(`${BASE_URL}/health`);
  return res.data;
};

// audio upload (main feature)
export const uploadAudio = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post(
    `${BASE_URL}/analyze`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );

  // Normalize the response format for consistent frontend usage
  const data = res.data;
  return {
    mood: data.mood || 'Unknown',
    confidence: data.confidence || '0%', // Already formatted as percentage string from backend
    // Rename mood_percentages to probabilities for frontend consistency
    probabilities: data.probabilities || {},
    audio_features: data.audio_features || {
      tempo: data.tempo || 0,
      energy: data.energy || 0
    },
    recommendations: data.recommendations || []
  };
};

// get recommendations
export const getRecommendations = async (mood) => {
  const res = await axios.get(`${BASE_URL}/recommendations?mood=${mood}`);
  return res.data;
};

// get playlists
export const getPlaylists = async () => {
  const res = await axios.get(`${BASE_URL}/playlists`);
  return res.data;
};

// create playlist
export const createPlaylist = async (playlistData) => {
  const res = await axios.post(`${BASE_URL}/playlists`, playlistData);
  return res.data;
};
