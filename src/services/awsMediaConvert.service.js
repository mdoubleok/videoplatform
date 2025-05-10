const { getPayloadClient } = require('payload');
require('dotenv').config();

// Initialize AWS MediaConvert client
// Add debug logging for AWS service initialization
console.log('Initializing AWSService with:', {
  awsRegion: process.env.AWS_REGION,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT_SET',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT_SET'
});
const AWS = require('aws-sdk');
const mediaConvert = new AWS.MediaConvert({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

class AWSService {
  constructor() {
    this.payload = getPayloadClient({
      url: process.env.PAYLOAD_URL || 'http://localhost:3000',
      secret: process.env.PAYLOAD_SECRET || 'development-secret',
    });
    
    // AWS MediaConvert settings from environment variables
    this.templates = JSON.parse(process.env.MEDIA_CONVERT_TEMPLATES || '{}');
  }

  async convertVideo(inputFile, templateName) {
    try {
      const job = await mediaConvert.CreateJob.promise({
        inputFile: { fileUri: inputFile },
        outputGroupSettings: this.templates[templateName].outputGroups,
        settings: {
          timecodeSource: 'SOURCE',
          inputResolution: 'AUTO'
        }
      });

      return job;
    } catch (error) {
      console.error('Error in AWS MediaConvert:', error);
      throw new Error(`Failed to convert video: ${error.message}`);
    }
  }

  async checkConversionStatus(jobId) {
    try {
      const status = await mediaConvert.GetJob.promise({
        jobId: jobId
      });
      
      return status;
    } catch (error) {
      console.error('Error checking conversion status:', error);
      throw new Error(`Failed to check conversion status: ${error.message}`);
    }
  }

  async getOutputFiles(jobId) {
    try {
      const job = await this.checkConversionStatus(jobId);
      
      if (job.status !== 'COMPLETE') {
        return null;
      }
      
      // Extract output files from the job
      const outputs = [];
      job.settings.outputGroups.forEach(group => {
        group.outputs.forEach(output => {
          outputs.push({
            name: `${output.outputName}${output.fileNameInfix}.${output.extension}`,
            uri: `s3://${process.env.AWS_S3_BUCKET}/${group.outputGroupName}/${output.outputName}${output.fileNameInfix}.${output.extension}`
          });
        });
      });
      
      return outputs;
    } catch (error) {
      console.error('Error getting output files:', error);
      throw new Error(`Failed to get output files: ${error.message}`);
    }
  }

  async uploadToS3(localPath, s3Key) {
    try {
      const s3 = new AWS.S3({
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      });
      
      await s3.upload.promise({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: require('fs').createReadStream(localPath)
      });
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new Error(`Failed to upload to S3: ${error.message}`);
    }
  }
}

module.exports = AWSService;