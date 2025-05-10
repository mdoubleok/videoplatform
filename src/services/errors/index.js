// Enhanced error classes for different types of failures
class VideoProcessingError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'VideoProcessingError';
    this.details = details;
    this.statusCode = 422; // Unprocessable Entity
    this.timestamp = new Date().toISOString();
    if (details.originalError) {
      this.stack = `${this.stack}\nCaused by: ${details.originalError.stack}`;
    }
  }
}

class AWSConfigurationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AWSConfigurationError';
    this.statusCode = 500; // Internal Server Error
    this.timestamp = new Date().toISOString();
    if (details) {
      this.details = details;
    }
  }
}

class AWSServiceError extends Error {
  constructor(message, serviceOperation, serviceResponse = null) {
    super(message);
    this.name = 'AWSServiceError';
    this.statusCode = 502; // Bad Gateway
    this.timestamp = new Date().toISOString();
    this.serviceOperation = serviceOperation;
    if (serviceResponse) {
      this.serviceResponse = serviceResponse;
    }
  }
}

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400; // Bad Request
  }
}

// Enhanced centralized error handler middleware with detailed responses
const errorHandler = (err, req, res, next) => {
  // Log the error with timestamp and request context
  console.error('Error:', {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    errorName: err.name,
    errorMessage: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  // Prepare response object with consistent structure
  const response = {
    success: false,
    timestamp: new Date().toISOString(),
    path: req.path,
    error: {
      name: err.name || 'Error',
      message: err.message || 'An unexpected error occurred'
    }
  };
  
  // Add environment-specific details in development mode
  if (process.env.NODE_ENV === 'development') {
    response.debug = {
      stack: err.stack,
      originalError: err.originalError ? {
        name: err.originalError.name,
        message: err.originalError.message,
        stack: err.originalError.stack.substring(0, 100) + '...'
      } : undefined
    };
  }
  
  // Handle specific error types with detailed information
  if (err instanceof VideoProcessingError) {
    response.error.type = 'Video Processing Error';
    response.statusCode = err.statusCode;
    if (err.details) {
      response.error.details = err.details;
    }
  } else if (err instanceof AWSConfigurationError) {
    response.error.type = 'AWS Configuration Error';
    response.statusCode = err.statusCode;
    if (err.details) {
      response.error.serviceDetails = err.details;
    }
  } else if (err instanceof AWSServiceError) {
    response.error.type = 'AWS Service Error';
    response.statusCode = err.statusCode;
    response.error.operation = err.serviceOperation;
    if (err.serviceResponse) {
      response.error.serviceResponse = {
        status: err.serviceResponse.status,
        message: err.serviceResponse.message || 'No additional details available'
      };
    }
  } else if (err instanceof ValidationError) {
    response.error.type = 'Validation Error';
    response.statusCode = err.statusCode;
    response.error.field = err.field;
    if (Array.isArray(err.errors)) {
      response.error.validationErrors = err.errors.map(e => ({
        field: e.field,
        message: e.message
      }));
    }
  } else {
    // Default to server error for unexpected issues
    response.error.type = 'Server Error';
    response.statusCode = err.statusCode || 500;
  }
  
  res.status(response.statusCode).json(response);
};

// Helper function to validate AWS configuration
const validateAWSConfig = () => {
  const requiredEnvVars = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET'
  ];
  
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      throw new AWSConfigurationError(`Missing required environment variable: ${varName}`);
    }
  }
};

// Helper function to validate video metadata
const validateVideoMetadata = (metadata) => {
  const errors = [];
  
  if (!metadata.title || metadata.title.trim() === '') {
    errors.push(new ValidationError('Title is required', 'title'));
  }
  
  if (!metadata.provider || !['local', 's3'].includes(metadata.provider)) {
    errors.push(new ValidationError('Invalid provider', 'provider'));
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Validation failed', { errors });
  }
};

module.exports = {
  VideoProcessingError,
  AWSConfigurationError,
  ValidationError,
  errorHandler,
  validateAWSConfig,
  validateVideoMetadata
};