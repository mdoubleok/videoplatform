const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set up Payload CMS
import { build as payloadBuild } from '@payloadcms/next';
const payloadConfig = require('./src/config/payload.config.js');

async function startServer() {
  try {
    // Initialize Payload CMS
    const payload = await payloadBuild({
      config: payloadConfig,
      expressApp: app,
    });

    // Define API routes
    app.get('/api/videos', async (req, res) => {
      const { docs } = await payload.find({ collection: 'videos' });
      res.json(docs);
    });

    app.post('/api/videos/upload', multer().single('video'), async (req, res) => {
      // Handle video upload logic here
      res.status(201).json({ message: 'Video uploaded successfully' });
    });

    app.delete('/api/videos/:id', async (req, res) => {
      const { id } = req.params;
      await payload.delete({ collection: 'videos', where: { id } });
      res.json({ message: 'Video deleted successfully' });
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();