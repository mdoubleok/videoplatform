const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Add debug logging for video processing service initialization
console.log('Initializing VideoProcessingService with:', {
  tempUploadDir: path.join(__dirname, '../../../uploads'),
  proxyOutputDir: process.env.PROXY_OUTPUT_DIR || 'public/videos/proxy',
  thumbnailOutputDir: process.env.THUMBNAIL_OUTPUT_DIR || 'public/thumbnails'
});
class VideoProcessingService {
  constructor() {
    // Ensure FFmpeg is installed
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('FFmpeg is not installed. Please install it to use video processing features.');
    }
  }

  /**
   * Generate a thumbnail from a video file using FFmpeg
   * @param {string} inputPath - Path to the input video file
   * @param {string} outputPath - Path where the thumbnail should be saved
   * @returns {Promise<string>} - Path to the generated thumbnail
   */
  async generateThumbnail(inputPath, outputPath) {
    try {
      // Create output directory if it doesn't exist
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate a thumbnail at the 1-second mark
      execSync(`ffmpeg -i "${inputPath}" -ss 00:00:01.000 -vframes 1 -vf "scale=320:-1" -q:v 2 "${outputPath}"`, {
        stdio: 'ignore'
      });

      return outputPath;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw new Error(`Failed to generate thumbnail: ${error.message}`);
    }
  }

  /**
   * Extract basic metadata from a video file using FFmpeg
   * @param {string} inputPath - Path to the input video file
   * @returns {Promise<Object>} - Metadata object containing duration, resolution, etc.
   */
  async extractMetadata(inputPath) {
    try {
      // Get video duration and dimensions
      const metadata = execSync(`ffprobe -v error -show_entries format:streams -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`, {
        encoding: 'utf-8'
      });

      return this.parseMetadata(metadata);
    } catch (error) {
      console.error('Error extracting metadata:', error);
      throw new Error(`Failed to extract video metadata: ${error.message}`);
    }
  }

  /**
   * Parse FFprobe output into a structured object
   * @param {string} rawMetadata - Raw metadata from ffprobe
   * @returns {Object} - Parsed metadata with duration, resolution, etc.
   */
  parseMetadata(rawMetadata) {
    const lines = rawMetadata.split('\n');
    const metadata = {};
    
    let currentSection = '';
    for (const line of lines) {
      if (!line.trim()) continue;
      
      if (line.startsWith('format=')) {
        currentSection = 'format';
      } else if (line.startsWith('stream=')) {
        currentSection = 'stream';
      }
      
      const [key, value] = line.split('=');
      metadata[key] = value;
    }

    return metadata;
  }
}

module.exports = VideoProcessingService; 