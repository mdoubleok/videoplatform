const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname)));

// Set up storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// API routes
app.get('/api/videos', (req, res) => {
  // In a real app, this would query your database
  res.json([]);
});

app.post('/api/videos/upload', upload.single('video'), async (req, res) => {
  try {
    console.log('Video uploaded:', req.file);
    res.status(201).json({ message: 'Video uploaded successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error uploading video' });
  }
});

app.delete('/api/videos/:id', async (req, res) => {
  try {
    // In a real app, this would delete from your database
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting video' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});