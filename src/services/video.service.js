const { getPayloadClient } = require('payload');
require('dotenv').config();

class VideoService {
  constructor() {
    this.payload = getPayloadClient({
      url: process.env.PAYLOAD_URL || 'http://localhost:3000',
      secret: process.env.PAYLOAD_SECRET || 'development-secret',
    });
  }

  async uploadVideo(file) {
    try {
      // Upload the video file
      const mediaDoc = await this.payload.create({
        collection: 'media',
        data: { filename: file.originalname },
        file,
      });

      return mediaDoc;
    } catch (error) {
      console.error('Error uploading video:', error);
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  async generateThumbnail(videoId) {
    try {
      // This would be implemented with actual thumbnail generation logic
      // For now, we'll just return a placeholder
      const mediaDoc = await this.payload.create({
        collection: 'media',
        data: { filename: `thumbnail-${videoId}.jpg` },
        file: Buffer.from('placeholder-thumbnail-data'),
      });

      return mediaDoc;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw new Error(`Failed to generate thumbnail: ${error.message}`);
    }
  }

  async createVideoRecord(videoData, mediaId) {
    try {
      const video = await this.payload.create({
        collection: 'videos',
        data: {
          ...videoData,
          file: mediaId,
          status: 'processing',
        },
      });

      return video;
    } catch (error) {
      console.error('Error creating video record:', error);
      throw new Error(`Failed to create video record: ${error.message}`);
    }
  }

  async updateVideoStatus(videoId, status) {
    try {
      const updated = await this.payload.update({
        collection: 'videos',
        id: videoId,
        data: { status },
      });

      return updated;
    } catch (error) {
      console.error('Error updating video status:', error);
      throw new Error(`Failed to update video status: ${error.message}`);
    }
  }

  async getVideoById(videoId) {
    try {
      const video = await this.payload.findByID({
        collection: 'videos',
        id: videoId,
      });

      return video;
    } catch (error) {
      console.error('Error fetching video:', error);
      throw new Error(`Failed to fetch video: ${error.message}`);
    }
  }

  async getAllVideos() {
    try {
      const videos = await this.payload.find({
        collection: 'videos',
      });

      return videos;
    } catch (error) {
      console.error('Error fetching all videos:', error);
      throw new Error(`Failed to fetch videos: ${error.message}`);
    }
  }

  async deleteVideo(videoId) {
    try {
      await this.payload.delete({
        collection: 'videos',
        id: videoId,
      });

      return true;
    } catch (error) {
      console.error('Error deleting video:', error);
      throw new Error(`Failed to delete video: ${error.message}`);
    }
  }
}

module.exports = VideoService;