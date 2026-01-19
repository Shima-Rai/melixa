const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const audioRoutes = require('./routes/audioRoutes');
const { initializeDatabase } = require('./services/db');

const app = express();
const PORT = process.env.PORT || 3000;
const PYTHON_ML_URL = 'http://127.0.0.1:8001';

// =======================
// VS Code Development Support
// =======================
// Enable hot reload for development
if (process.env.NODE_ENV !== 'production') {
  try {
    const chokidar = require('chokidar');
    
    // Watch for file changes
    const watcher = chokidar.watch(['./routes/*.js', './services/*.js'], {
      ignored: /node_modules/,
      persistent: true
    });
    
    watcher.on('change', (filePath) => {
      console.log(`🔄 File changed: ${filePath}`);
      console.log('📝 Restart server to see changes');
    });
    
    console.log('🔧 VS Code hot reload enabled');
  } catch (err) {
    console.log('⚠️  chokidar not available, install with: npm install chokidar');
  }
}

// =======================
// Middleware
// =======================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// =======================
// Development Middleware
// =======================
if (process.env.NODE_ENV !== 'production') {
  // Request logging for development
  app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// =======================
// Audio File Management - Enhanced Streaming
// =======================
const audioDir = path.join(__dirname, '../meme_audio');

// Serve audio files with proper headers and range request support
app.get('/audio/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(audioDir, filename);
  
  // Security check - prevent directory traversal
  if (!filePath.startsWith(audioDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Audio file not found' });
  }
  
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  
  // Set proper MIME type for audio files
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg'
  };
  
  const contentType = mimeTypes[ext] || 'audio/mpeg';
  
  // Handle range requests for streaming
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    };
    
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType
    };
    
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// =======================
// Initialize database
// =======================
initializeDatabase()
  .then(() => console.log('✅ Database initialized'))
  .catch(err => console.error('❌ Database error:', err));

// =======================
// API Routes
// =======================
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Music API root',
    endpoints: [
      '/api/analyze  (POST file)',
      '/api/reanalyze-dataset  (POST - Full audio re-analysis)',
      '/api/clear-database  (POST - Clear all songs)',
      '/api/reanalysis-stats  (GET - Analysis statistics)',
      '/api/load-audio-library  (POST - Load all meme_audio files)',
      '/api/python-health  (GET)',
      '/api/songs  (GET)',
      '/api/recommendations/:songId  (GET - 5 recommendations)',
      '/audio/:filename  (GET - Audio streaming with range support)'
    ],
    development: {
      hot_reload: process.env.NODE_ENV !== 'production',
      request_logging: process.env.NODE_ENV !== 'production'
    }
  });
});

app.use('/api', audioRoutes);

// =======================
// Backend health check
// =======================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Music Backend',
    timestamp: new Date().toISOString(),
    port: PORT,
    python_ml: 'connected',
    environment: process.env.NODE_ENV || 'development',
    vs_code_support: true
  });
});

// =======================
// VS Code Development Endpoints
// =======================
if (process.env.NODE_ENV !== 'production') {
  // Development status endpoint
  app.get('/dev/status', (req, res) => {
    res.json({
      development: true,
      hot_reload: true,
      request_logging: true,
      timestamp: new Date().toISOString(),
      node_version: process.version,
      platform: process.platform
    });
  });
  
  // File system info for debugging
  app.get('/dev/files', (req, res) => {
    try {
      const routesDir = path.join(__dirname, 'routes');
      const servicesDir = path.join(__dirname, 'services');
      
      const routes = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
      const services = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));
      
      res.json({
        routes_directory: routes,
        services_directory: services,
        audio_directory: fs.existsSync(audioDir) ? 'exists' : 'missing'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// =======================
// Start server
// =======================
const startServer = async () => {
  console.log('\n' + '='.repeat(60));
  console.log('🎵 MUSIC RECOMMENDATION BACKEND');
  console.log('='.repeat(60));
  console.log(`✅ Server starting:     http://localhost:${PORT}`);
  console.log(`✅ Health check:       http://localhost:${PORT}/health`);
  console.log(`✅ API endpoint:       http://localhost:${PORT}/api`);
  console.log(`✅ Audio streaming:    http://localhost:${PORT}/audio/:filename`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`✅ Dev status:         http://localhost:${PORT}/dev/status`);
    console.log(`✅ Dev files:          http://localhost:${PORT}/dev/files`);
    console.log(`🔧 Environment:       ${process.env.NODE_ENV || 'development'}`);
  }
  
  console.log('='.repeat(60));
  
  // Start the server first
  app.listen(PORT, async () => {
    console.log(`✅ Server listening on port ${PORT}`);
    
    // Then connect to Python service
    try {
      const response = await axios.get(`${PYTHON_ML_URL}/health`, { timeout: 3000 });
      if (response.status === 200) {
        console.log('✅ Python ML service connected');
        console.log(`✅ Model: ${response.data.model_type || 'unknown'}`);
        console.log(`✅ Features: ${response.data.features || 'unknown'}`);
        console.log(`✅ Classes: ${response.data.classes?.join(', ') || 'unknown'}`);
      } else {
        console.log('⚠️  Python ML service not available. Continuing without it...');
      }
    } catch (err) {
      console.log('⚠️  Could not connect to Python ML service:', err.message);
    }
    
    console.log('='.repeat(60));
    console.log('🚀 Backend ready for requests!');
    console.log('🔧 VS Code development support enabled');
    console.log('='.repeat(60) + '\n');
  });
};

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});