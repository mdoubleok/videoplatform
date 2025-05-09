const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname)));

// Set up Payload CMS
const { build } = require('@payloadcms/next');
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

    // Import the video explorer component
    const VideoExplorer = require('./components/VideoExplorer').default || require('./components/VideoExplorer');
    
    // Create a simple HTML template for the video explorer
    function renderVideoExplorer(videos) {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Video Explorer</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
            .video-card { border: 1px solid #ddd; padding: 15px; }
            .thumbnail { width: 100%; height: 150px; object-fit: cover; margin-bottom: 10px; }
            h2, h3 { margin-top: 0; }
            button { background-color: #3498db; color: white; border: none; padding: 8px 12px; cursor: pointer; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h2>Video Library</h2>
          
          ${videos.length === 0 ?
            '<p>No videos found. Upload your first video!</p>' :
            `<div class="video-grid">
              ${videos.map(video => `
                <div class="video-card">
                  <img src="/thumbnails/${video.thumbnail}" alt="Thumbnail for ${video.title}" class="thumbnail" />
                  
                  <h3>${video.title}</h3>
                  
                  <p>Status: ${video.status}</p>
                  
                  <div class="video-actions">
                    <button onclick="window.location.href='/preview?id=${video.id}'">Preview</button>
                    
                    <button
                      onclick="window.location.href='/api/videos/${video.id}/proxy'"
                      ${video.status !== 'ready' ? 'disabled' : ''}
                    >
                      Download Proxy
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>`
          }
        </body>
        </html>
      `;
    }
    // Define API routes
    app.get('/api/videos', async (req, res) => {
      try {
        const { docs } = await payload.find({ collection: 'videos' });
        res.json(docs);
      } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({
          success: false,
          message: `Failed to fetch videos: ${error.message}`
        });
      }
    });
    
    // Serve the video explorer page
    app.get('/', async (req, res) => {
      try {
        console.log('Fetching videos from database...');
        
        const { docs } = await payload.find({ collection: 'videos' });
        
        // Log the number of videos found
        console.log(`Found ${docs.length} videos in database`);
        
        if (docs.length === 0) {
          console.warn('No videos found in database');
        }
        
        // Render the video explorer HTML directly
        const html = renderVideoExplorer(docs);
        res.send(html);
      } catch (error) {
        console.error('Error rendering video explorer:', error);
        res.status(500).send(`
          <html>
            <body>
              <h1>Error</h1>
              <p>Failed to load videos: ${error.message}</p>
              <pre>${JSON.stringify(error, null, 2)}</pre>
            </body>
          </html>
        `);
      }
    });
    
    
    app.post('/api/videos/upload', multer().single('video'), async (req, res) => {
      // Handle video upload logic here
      res.status(201).json({ message: 'Video uploaded successfully' });
    });
    
    // Add route for video explorer component
    app.get('/', async (req, res) => {
      const { docs } = await payload.find({ collection: 'videos' });
      
      res.render('index', {
        videos: docs,
        VideoExplorer: VideoExplorer.default || VideoExplorer
      });
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();