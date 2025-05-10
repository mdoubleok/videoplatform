// Video processing event logger
class VideoLogger {
  constructor() {
    // Initialize with empty logs
    this.logs = [];
    
    // Set max log size to prevent memory issues
    this.maxLogSize = process.env.MAX_LOG_SIZE || 1000;
  }

  /**
   * Log a video processing event
   * @param {string} level - The severity level (info, warn, error)
   * @param {string} message - The log message
   * @param {object} metadata - Additional metadata about the event
   */
  log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      videoId: metadata.videoId || null
    };

    // Add to logs array
    this.logs.push(logEntry);

    // Trim logs if they exceed max size
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }

    // Also log to console for immediate visibility
    const consoleMessage = `[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}`;
    switch (level) {
      case 'error':
        console.error(consoleMessage, metadata);
        break;
      case 'warn':
        console.warn(consoleMessage, metadata);
        break;
      default:
        console.log(consoleMessage, metadata);
    }

    return logEntry;
  }

  /**
   * Get all logs for a specific video
   * @param {string} videoId - The ID of the video to get logs for
   */
  getVideoLogs(videoId) {
    if (!videoId) return [];
    return this.logs.filter(log => log.videoId === videoId);
  }

  /**
   * Get all logs within a time range
   * @param {string} startTime - Start timestamp (ISO format)
   * @param {string} endTime - End timestamp (ISO format)
   */
  getLogsByTimeRange(startTime, endTime) {
    return this.logs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
  }
}

// Create a singleton instance
const videoLogger = new VideoLogger();

module.exports = {
  VideoLogger,
  logger: videoLogger
};