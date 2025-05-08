const VideoService = require('../services/video.service');

class VideoController {
  constructor() {
    this.videoService = new VideoService();
  }

  async upload(req, res) {
    try {
      const { file } = req;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Upload the video
      const mediaDoc = await this.videoService.uploadVideo(file);

      // Create a placeholder thumbnail (in production, you'd generate this)
      const thumbnail = await this.videoService.generateThumbnail(mediaDoc.id);

      // Create video record
      const videoData = {
        title: file.originalname,
        description: 'Uploaded via API',
        duration: '00:00', // Would be calculated in production
      };

      const video = await this.videoService.createVideoRecord(videoData, mediaDoc.id);
      
      return res.status(201).json({
        ...video,
        fileUrl: `${process.env.PAYLOAD_URL}/media/${mediaDoc.filename}`,
        thumbnailUrl: `${process.env.PAYLOAD_URL}/media/${thumbnail.filename}`,
      });
    } catch (error) {
      console.error('Error in upload:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  async getVideo(req, res) {
    try {
      const { id } = req.params;
      const video = await this.videoService.getVideoById(id);
      
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      return res.json(video);
    } catch (error) {
      console.error('Error in getVideo:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  async getAllVideos(req, res) {
    try {
      const videos = await this.videoService.getAllVideos();
      return res.json(videos);
    } catch (error) {
      console.error('Error in getAllVideos:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['processing', 'ready', 'error'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const updatedVideo = await this.videoService.updateVideoStatus(id, status);
      return res.json(updatedVideo);
    } catch (error) {
      console.error('Error in updateStatus:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      
      await this.videoService.deleteVideo(id);
      return res.json({ success: true });
    } catch (error) {
      console.error('Error in delete:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = VideoController;