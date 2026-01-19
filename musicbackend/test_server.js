const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Server is working!' });
});

app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Music API root',
    endpoints: ['/api/songs', '/api/recommendations/:id']
  });
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`✅ API endpoint: http://localhost:${PORT}/api`);
});
