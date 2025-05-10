const { init } = require('payload');
const express = require('express');
require('dotenv').config();

// Import your config
const payloadConfig = require('./config/payload.config');

async function start() {
  // Initialize Payload CMS
  const payload = await init({
    ...payloadConfig,
    secret: process.env.PAYLOAD_SECRET || 'development-secret',
    mongoURL: process.env.MONGODB_URI || 'mongodb://localhost:27017/video-engine',
    onInit: async (cms) => {
      cms.logger.info(`Payload Admin URL: ${cms.getAdminUrl()}`);
      
      // Initialize Express app
      const app = express();
      
      // Add middleware for JSON parsing
      app.use(express.json());
      
      // Import video routes
      const { upload, videoRouter } = require('./middleware/video.middleware');
      
      // Set up Express app to use the video router
      app.use('/api/videos', videoRouter);
      
      // Serve static files from public directory
      app.use(express.static(path.join(__dirname, 'public')));
      
      // Start the server
      const { listen } = require('payload/config');
      await listen(3000);
    },
  });

  process.on('SIGTERM', () => {
    payload.logger.info('SIGTERM received. Shutting down gracefully.');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    payload.logger.info('SIGINT received. Shutting down immediately.');
    process.exit(0);
  });
}

start().catch(console.error);