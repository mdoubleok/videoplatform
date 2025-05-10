const { getPayloadClient } = require('payload');
require('dotenv').config();
const errors = require('./errors');
const { logger } = require('./video.logger');
const AWSService = require('./awsMediaConvert.service.js');
const VideoProcessingService = require('./videoProcessing.service.js');
const VideoStatusService = require('./videoStatus.service.js');

class VideoService {
  constructor() {
    this.payload = getPayloadClient({
      url: process.env.PAYLOAD_URL || 'http://localhost:3000',
      secret: process.env.PAYLOAD_SECRET || 'development-secret',
    });
  }

  async uploadVideo(file, tempFilePath) {
    try {
      // Validate AWS configuration before processing video
      errors.validateAWSConfig();
      
      // Validate video metadata
      errors.validateVideoMetadata({
        title: file.originalname || 'Untitled Video',
        provider: req.body.provider || 'local',
        description: req.body.description || '',
        tags: req.body.tags ? req.body.tags.split(',') : [],
        language: req.body.language || 'en',
        location: req.body.location || null,
        workflow: req.body.workflow || 'default'
      });
      
      // Check file size and type before processing
      if (file.size > 5 * 1024 * 1024 * 1024) { // 5GB limit
        throw new errors.ValidationError('Video file exceeds maximum size of 5GB');
      }
      
      // Validate video MIME types
      const validMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-matroska'];
      if (!validMimeTypes.includes(file.mimetype)) {
        throw new errors.ValidationError(`Invalid video format: ${file.mimetype}. Supported formats: MP4, MOV, MKV`);
      }
      
      // Generate a UUID for the asset
      const uuid = require('uuid').v4();
      
      // Collect metadata from form inputs
      const formData = {
        title: file.originalname || 'Untitled Video',
        description: req.body.description || '',
        tags: req.body.tags ? req.body.tags.split(',') : [],
        provider: req.body.provider || 'local',
        language: req.body.language || 'en',
        location: req.body.location || null,
        workflow: req.body.workflow || 'default',
      };
      
      // Create a new video record with UUID
      const mediaMetadata = {
        filename: file.originalname,
        metadata: {
          uuid: uuid,
          uploadDate: new Date().toISOString(),
          status: 'ingested',
          logs: [
            { timestamp: new Date().toISOString(), message: 'Video uploaded' }
          ]
        },
      };
      
      // Log video upload attempt
      logger.log('info', 'Starting video upload process', {
        videoId: null,
        metadata: {
          title: file.originalname || 'Untitled Video',
          provider: req.body.provider || 'local'
        }
      });
      
      // Upload the video file
      const mediaDoc = await this.payload.create({
        collection: 'media',
        data: mediaMetadata,
        file,
      });
      
      // Log successful upload with metadata
      logger.log('info', 'Video uploaded successfully', {
        videoId: mediaDoc.id,
        metadata: {
          title: file.originalname,
          provider: req.body.provider || 'local',
          size: file.size,
          mimeType: file.mimetype
        }
      });

      // Create a new VideoProcessingService instance with optimized settings
      logger.log('info', 'Starting optimized video processing workflow', {
        videoId: mediaDoc.id,
        workflow: req.body.workflow || 'default',
        optimizationLevel: 'high'
      });
      
      const videoProcessor = new VideoProcessingService({
        // Set higher parallelism for better performance
        maxWorkers: 4,
        // Enable hardware acceleration if available
        useHardwareAcceleration: true,
        // Use optimized encoding settings
        encodingPreset: 'fast',
        // Set appropriate resolution scaling based on original video
        resolutionScalingFactor: 0.5
      });
      
      // Process components in parallel for better performance
      const [thumbnailPromise, metadataPromise] = [
        new Promise(async (resolve, reject) => {
          try {
            logger.log('info', 'Generating optimized video thumbnail', {
              videoId: mediaDoc.id,
              sourceFile: tempFilePath,
              outputPath: thumbnailPath
            });
            
            await videoProcessor.generateThumbnail(tempFilePath, thumbnailPath);
            resolve();
          } catch (error) {
            reject(error);
          }
        }),
        new Promise(async (resolve, reject) => {
          try {
            logger.log('info', 'Extracting video metadata in parallel', {
              videoId: mediaDoc.id,
              filePath: tempFilePath
            });
            
            const metadata = await videoProcessor.extractMetadata(tempFilePath);
            resolve(metadata);
          } catch (error) {
            reject(error);
          }
        })
      ];
      
      // Wait for both operations to complete
      try {
        await Promise.all([thumbnailPromise, metadataPromise]);
      } catch (error) {
        throw new errors.VideoProcessingError(`Failed during parallel processing: ${error.message}`, { originalError: error });
      }
      
      // Extract metadata from the video file
      logger.log('info', 'Extracting video metadata', {
        videoId: mediaDoc.id,
        filePath: tempFilePath
      });
      
      const metadata = await videoProcessor.extractMetadata(tempFilePath);
      
      // Create a video record with processing status
      logger.log('info', 'Creating video record in database', {
        videoId: mediaDoc.id,
        metadata: {
          title: file.originalname,
          duration: metadata.duration || 'Unknown',
          resolution: `${metadata.width}x${metadata.height}` || 'Unknown'
        }
      });
      
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
      // Use our centralized error handling
      if (error instanceof errors.ValidationError ||
          error instanceof errors.AWSConfigurationError ||
          error instanceof errors.VideoProcessingError ||
          error instanceof errors.AWSServiceError) {
        throw error; // Already properly formatted
      }
      
      logger.log('error', 'Video upload failed', {
        videoId: null,
        errorDetails: {
          name: error.name || 'Unknown Error',
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
      
      throw new errors.VideoProcessingError(`Failed to upload video: ${error.message}`, {
        originalError: error,
        context: {
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async generateThumbnail(videoId) {
    try {
      logger.log('info', 'Generating video thumbnail', {
        videoId,
        sourceFile: `thumbnail-${videoId}.jpg`
      });
      
      // This would be implemented with actual thumbnail generation logic
      // For now, we'll just return a placeholder
      const mediaDoc = await this.payload.create({
        collection: 'media',
        data: { filename: `thumbnail-${videoId}.jpg` },
        file: Buffer.from('placeholder-thumbnail-data'),
      });

      logger.log('info', 'Thumbnail generated successfully', {
        videoId,
        thumbnailUrl: `/thumbnails/${videoId}.jpg`
      });
      
      return mediaDoc;
    } catch (error) {
      logger.log('error', 'Failed to generate thumbnail', {
        videoId,
        errorDetails: {
          name: error.name || 'Unknown Error',
          message: error.message
        }
      });
      
      throw new errors.VideoProcessingError(`Failed to generate thumbnail: ${error.message}`, { originalError: error });
    }
  }

  async createVideoRecord(videoData, mediaId) {
    try {
      logger.log('info', 'Creating video record in database', {
        videoId: null,
        metadata: {
          title: videoData.title,
          duration: videoData.duration || 'Unknown',
          resolution: videoData.resolution || 'Unknown'
        }
      });
      
      const video = await this.payload.create({
        collection: 'videos',
        data: {
          ...videoData,
          file: mediaId,
          status: 'processing',
          logs: [
            { timestamp: new Date().toISOString(), message: 'Video record created' }
          ]
        }
      });

      logger.log('info', 'Video record created successfully', {
        videoId: video.id,
        metadata: {
           title: video.title,
           duration: video.duration || 'Unknown',
           resolution: video.resolution || 'Unknown'
        }
      });
      
      return video;
    } catch (error) {
      logger.log('error', 'Failed to create video record', {
        errorDetails: {
          name: error.name || 'Unknown Error',
          message: error.message
        }
      });
      
      throw new errors.VideoProcessingError(`Failed to create video record: ${error.message}`, { originalError: error, context: { videoData } });
    }
  }

  async updateVideoStatus(videoId, status) {
    try {
      logger.log('info', 'Updating video status', {
        videoId,
        previousStatus: null,
        newStatus: status
      });
      
      const updated = await this.payload.update({
        collection: 'videos',
        id: videoId,
        data: { status }
      });

      logger.log('info', 'Video status updated successfully', {
        videoId,
        newStatus: status
      });
      
      return updated;
    } catch (error) {
      logger.log('error', 'Failed to update video status', {
        videoId,
        errorDetails: {
          name: error.name || 'Unknown Error',
          message: error.message
        }
      });
      
      throw new errors.VideoProcessingError(`Failed to update video status: ${error.message}`, { originalError: error, context: { videoId, status } });
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
      throw new errors.VideoProcessingError(`Failed to fetch video: ${error.message}`, { originalError: error });
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
      throw new errors.VideoProcessingError(`Failed to fetch videos: ${error.message}`, { originalError: error });
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
      throw new errors.VideoProcessingError(`Failed to delete video: ${error.message}`, { originalError: error });
    }
  }

  async checkVideoConversionStatus(videoId) {
    try {
      logger.log('info', 'Checking video conversion status', {
        videoId,
        jobId: null
      });
      
      // Create AWSService instance
      const awsService = new AWSService();
      
      // Get video record to get job ID
      const video = await this.getVideoById(videoId);
      
      if (!video || !video.jobId) {
        logger.log('error', 'No conversion job found for video', {
          videoId,
          errorDetails: `No conversion job found for video ${videoId}`
        });
        
        throw new Error(`No conversion job found for video ${videoId}`);
      }
      
      // Check status using AWS MediaConvert
      const status = await awsService.checkConversionStatus(video.jobId);
      
      logger.log('info', 'Video conversion status received from AWS', {
        videoId,
        jobId: video.jobId,
        status: status.status
      });
      
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
      
      logger.log('info', 'Updating video status after conversion check', {
        videoId,
        previousStatus: video.status || 'unknown',
        newStatus
      });
      
      // Update video record with new status
      await this.updateVideoStatus(videoId, newStatus);
      
      return {
        status: newStatus,
        conversionDetails: status
      };
    } catch (error) {
      logger.log('error', 'Failed to check video conversion status', {
        videoId,
        errorDetails: {
          name: error.name || 'Unknown Error',
          message: error.message
        }
      });
      
      throw new errors.VideoProcessingError(`Failed to check video conversion status: ${error.message}`, { originalError: error, context: { videoId } });
    }
  }

  // Track progress of video conversion with detailed metrics
  async trackConversionProgress(videoId, jobId) {
    try {
      const awsService = new AWSService();
      let status = await awsService.checkConversionStatus(jobId);
      
      // Initialize tracking variables
      const startTime = Date.now();
      const totalDuration = 300000; // Estimated 5 minutes for conversion
      let lastProgressUpdate = 0;
      
      while (status.status === 'PROGRESSING') {
        // Calculate progress metrics
        const elapsedTime = Date.now() - startTime;
        const currentProgress = Math.min(100, Math.floor((elapsedTime / totalDuration) * 100));
        
        // Only log if progress has changed by at least 5%
        if (currentProgress - lastProgressUpdate >= 5 || currentProgress === 100) {
          logger.log('info', 'Video conversion in progress', {
            videoId,
            currentProgress,
            elapsedTime: formatTime(elapsedTime),
            estimatedRemainingTime: formatTime(totalDuration - elapsedTime),
            processedFrames: status.details?.framesProcessed || 0,
            totalFrames: status.details?.totalFrames || '?',
            bitrate: `${Math.round(status.details?.bitrate || 0) / 1000} Mbps`,
            resolution: status.details?.resolution || 'N/A'
          });
          
          lastProgressUpdate = currentProgress;
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
        status = await awsService.checkConversionStatus(jobId);
      }
      
      return status;
    } catch (error) {
      logger.log('error', 'Failed to track conversion progress', {
        videoId,
        errorDetails: {
          name: error.name || 'Unknown Error',
          message: error.message
        }
      });
      
      throw new errors.VideoProcessingError(`Failed to track conversion progress: ${error.message}`, { originalError: error, context: { videoId } });
    }
  }

  // Helper function for time formatting
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  }

  async processVideoForProxy(videoId, tempFilePath) {
    try {
      logger.log('info', 'Starting video processing for proxy with progress tracking', {
        videoId,
        filePath: tempFilePath
      });
      
      // Create a VideoProcessingService instance
      const videoProcessor = new VideoProcessingService();
      
      // Generate thumbnail from the uploaded video
      const thumbnailPath = path.join(__dirname, '../../public/thumbnails', `${videoId}.jpg`);
      logger.log('info', 'Generating proxy video thumbnail', {
        videoId,
        sourceFile: tempFilePath,
        outputPath: thumbnailPath
      });
      await videoProcessor.generateThumbnail(tempFilePath, thumbnailPath);
      
      // Extract metadata from the video file
      logger.log('info', 'Extracting proxy video metadata', {
        videoId,
        filePath: tempFilePath
      });
      const metadata = await videoProcessor.extractMetadata(tempFilePath);
      
      // Create optimized proxy version using AWS MediaConvert with progress tracking
      logger.log('info', 'Creating optimized proxy conversion job with AWS MediaConvert and progress tracking', {
        videoId,
        sourceFile: tempFilePath,
        optimizationSettings: {
          resolutionScalingFactor: 0.5,  // Reduce to half original size for proxy
          bitrateReduction: 50,        // Reduce by 50% from original
          format: 'mp4',              // Use efficient format
          audioBitrate: 128,          // Optimize audio quality/bandwidth
          videoCodec: 'h264'         // Use hardware-accelerated codec
      }
      });
      const awsService = new AWSService();
      // Create the conversion job and track its progress
      const jobId = await awsService.createMediaConvertJob(videoId, tempFilePath);
      
      // Track the conversion progress in real-time
      logger.log('info', 'Proxy conversion job created successfully with progress tracking enabled', {
        videoId,
        conversionJobId: jobId
      });
      
      // Start tracking the conversion progress
      const conversionStatus = await this.trackConversionProgress(videoId, jobId);
      
      return {
        status: 'processing',
        thumbnailUrl: `/thumbnails/${videoId}.jpg`,
        metadata,
        conversionJobId: jobId
      };
    } catch (error) {
      logger.log('error', 'Failed to process video for proxy', {
        videoId,
        errorDetails: {
          name: error.name || 'Unknown Error',
          message: error.message
        }
      });
      
      throw new errors.VideoProcessingError(`Failed to process video: ${error.message}`, { originalError: error, context: { videoId } });
    }
  }
}

module.exports = VideoService;