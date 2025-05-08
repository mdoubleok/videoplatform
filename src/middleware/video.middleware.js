const express = require('express');
const multer = require('multer');
require('dotenv').config();

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/videos/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Create upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000000 }, // 1GB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only MP4, WebM and Ogg are supported.'), false);
    }
    cb(null, true);
  }
});

// Create router
const videoRouter = express.Router();

// Upload route
videoRouter.post('/upload', upload.single('video'), (req, res) => {
  const videoController = require('../controllers/video.controller');
  return videoController.upload(req, res);
});

// Get all videos
videoRouter.get('/', (req, res) => {
  const videoController = require('../controllers/video.controller');
  return videoController.getAllVideos(req, res);
});

// Get single video
videoRouter.get('/:id', (req, res) => {
  const videoController = require('../controllers/video.controller');
  return videoController.getVideo(req, res);
});

// Update status
videoRouter.patch('/:id/status', (req, res) => {
  const videoController = require('../controllers/video.controller');
  return videoController.updateStatus(req, res);
});

// Delete video
videoRouter.delete('/:id', (req, res) => {
  const videoController = require('../controllers/video.controller');
  return videoController.delete(req, res);
});

module.exports = { upload, videoRouter };