const { getPayloadClient } = require('payload');
require('dotenv').config();
const AWSService = require('./awsMediaConvert.service.js');
const VideoProcessingService = require('./videoProcessing.service.js');

class VideoService {
  constructor() {
    this.payload = getPayloadClient({
      url: process.env.PAYLOAD_URL || 'http://localhost:3000',
      secret: process.env.PAYLOAD_SECRET || 'development-secret',
    });
  }

  async uploadVideo(file, tempFilePath) {
    try {
      // Upload the video file
      const mediaDoc = await this.payload.create({
        collection: 'media',
        data: { filename: file.originalname },
        file,
      });

      // Create a new VideoProcessingService instance
      const videoProcessor = new VideoProcessingService();

      // Generate thumbnail from the uploaded video
      const thumbnailPath = path.join(__dirname, '../../public/thumbnails', `${mediaDoc.id}.jpg`);
      await videoProcessor.generateThumbnail(tempFilePath, thumbnailPath);

      // Extract metadata from the video file
      const metadata = await videoProcessor.extractMetadata(tempFilePath);

      // Create a video record with processing status
      const videoData = {
        title: file.originalname,
        duration: metadata.duration || 'Unknown',
        resolution: `${metadata.width}x${metadata.height}` || 'Unknown',
        thumbnailUrl: `/thumbnails/${mediaDoc.id}.jpg`,
        status: 'processing'
      };

      return {
        mediaId: mediaDoc.id,
        videoData
      };
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

  async checkVideoConversionStatus(videoId) {
    try {
      // Create AWSService instance
      const awsService = new AWSService();
      
      // Get video record to get job ID
      const video = await this.getVideoById(videoId);
      
      if (!video || !video.jobId) {
        throw new Error(`No conversion job found for video ${videoId}`);
      }
      
      // Check status using AWS MediaConvert
      const status = await awsService.checkConversionStatus(video.jobId);
      
      // Update video status based on conversion status
      let newStatus;
      switch (status.status) {
        case 'PROGRESSING':
          newStatus = 'converting';
          break;
        case 'COMPLETE':
          newStatus = 'ready';
          // Get output files if conversion is complete
          const outputs = await awsService.getOutputFiles(video.jobId);
          if (outputs) {
            video.outputFiles = outputs;
          }
          break;
        case 'ERROR':
          newStatus = 'error';
          break;
        default:
          newStatus = 'processing'; // Default to processing if status is unknown
      }
      
      // Update video record with new status
      await this.updateVideoStatus(videoId, newStatus);
      
      return { 
        status: newStatus,
        conversionDetails: status
      };
    } catch (error) {
      console.error('Error checking video conversion status:', error);
      throw new Error(`Failed to check video conversion status: ${error.message}`);
    }
  }

  async processVideoForProxy(videoId, tempFilePath) {
    try {
      // Create a VideoProcessingService instance
      const videoProcessor = new VideoProcessingService();
      
      // Generate thumbnail from the uploaded video
      const thumbnailPath = path.join(__dirname, '../../public/thumbnails', `${videoId}.jpg`);
      await videoProcessor.generateThumbnail(tempFilePath, thumbnailPath);
      
      // Extract metadata from the video file
      const metadata = await videoProcessor.extractMetadata(tempFilePath);
      
      // Create a proxy version using AWS MediaConvert
      const awsService = new AWSService();
      const jobId = await awsService.createMediaConvertJob(videoId, tempFilePath);
      
      return {
        status: 'processing',
        thumbnailUrl: `/thumbnails/${videoId}.jpg`,
        metadata,
        conversionJobId: jobId
      };
    } catch (error) {
      console.error('Error processing video for proxy:', error);
      throw new Error(`Failed to process video: ${error.message}`);
    }
  }
}

module.exports = VideoService;