const VideoService = require('../services/video.service');

class VideoController {
  constructor() {
    this.videoService = new VideoService();
  }

  /**
   * Upload a video file and process it
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadVideo(req, res) {
    try {
      // Save the uploaded file temporarily
      const tempFilePath = path.join(__dirname, '../../../uploads', `${req.file.filename}.tmp`);
      fs.renameSync(req.file.path, tempFilePath);

      // Process the video
      const result = await this.videoService.uploadVideo(req.file, tempFilePath);
      
      // Create a video record in the database
      const videoRecord = await this.videoService.createVideoRecord(result.videoData, result.mediaId);
      
      // Start AWS MediaConvert job for proxy creation
      await this.videoService.processVideoForProxy(videoRecord.id, tempFilePath);

      res.status(201).json({
        success: true,
        data: {
          id: videoRecord.id,
          status: 'processing',
          thumbnailUrl: result.thumbnailUrl,
          metadata: result.metadata
        }
      });
    } catch (error) {
      console.error('Error uploading video:', error);
      res.status(500).json({
        success: false,
        message: `Failed to upload video: ${error.message}`
      });
    }
  }

  /**
   * Get a video by ID with its thumbnail and status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVideo(req, res) {
    try {
      const video = await this.videoService.getVideoById(req.params.id);
      
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      res.status(200).json({
        success: true,
        data: video
      });
    } catch (error) {
      console.error('Error fetching video:', error);
      res.status(500).json({
        success: false,
        message: `Failed to fetch video: ${error.message}`
      });
    }
  }

  /**
   * Check the conversion status of a video
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkConversionStatus(req, res) {
    try {
      const result = await this.videoService.checkVideoConversionStatus(req.params.id);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error checking conversion status:', error);
      res.status(500).json({
        success: false,
        message: `Failed to check conversion status: ${error.message}`
      });
    }
  }

  /**
   * Get a proxy video for playback
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProxyVideo(req, res) {
    try {
      const video = await this.videoService.getVideoById(req.params.id);
      
      if (!video || !video.outputFiles || Object.keys(video.outputFiles).length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Proxy video not available yet'
        });
      }

      // Return the URL to the proxy video
      const proxyUrl = `/proxy/${req.params.id}/play`;
      
      res.status(200).json({
        success: true,
        data: {
          url: proxyUrl,
          status: video.status
        }
      });
    } catch (error) {
      console.error('Error getting proxy video:', error);
      res.status(500).json({
        success: false,
        message: `Failed to get proxy video: ${error.message}`
      });
    }
  }
}

module.exports = VideoController;