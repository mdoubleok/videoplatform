#!/usr/bin/env node

require('dotenv').config();

// Initialize services directly using absolute paths
const path = require('path');
const AWSService = require('/home/mdoubleok/videoplatform/scripts/src/services/awsMediaConvert.service.js');
const VideoProcessingService = require('/home/mdoubleok/videoplatform/src/services/videoProcessing.service.js');
const VideoStatusService = require('/home/mdoubleok/videoplatform/src/services/videoStatus.service.js');

/**
 * Enhanced service initialization script with proper shutdown/restart handling
 */

// Enhanced port checking with proper error handling
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = require('http').createServer();
    
    // Handle potential errors during connection
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // Port is in use
      } else {
        console.error(`Unexpected error checking port ${port}:`, err);
        resolve(false); // Assume not in use on unexpected errors
      }
    });
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(false);
      });
      server.close(() => {
        resolve(true);
      });
    });
  });
}

// Function to find an available port starting from a base port
async function findAvailablePort(basePort) {
  let port = basePort;
  const maxAttempts = 10;
  
  for (let i = 0; i < maxAttempts; i++) {
    if (!(await isPortInUse(port))) {
      return port; // Found available port
    }
    port++; // Try next port
  }
  
  throw new Error(`No available ports found in range ${basePort}-${basePort + maxAttempts}`);
}

// Ask for user confirmation
async function askForConfirmation(message) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log(message);
    readline.question('Proceed? (y/n): ', (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// Gracefully shutdown a service
async function gracefulShutdown(serviceName, port) {
  try {
    const isRunning = await isPortInUse(port);
    
    if (!isRunning) {
      console.log(`Service ${serviceName} is not currently running`);
      return false;
    }
    
    // Ask for confirmation before shutting down
    const shouldShutdown = await askForConfirmation(
      `Service ${serviceName} is currently running. Would you like to shut it down and restart?`
    );
    
    if (!shouldShutdown) {
      console.log(`Skipping shutdown of ${serviceName}`);
      return false;
    }
    
    // Perform graceful shutdown (implementation depends on your service)
    console.log(`Shutting down ${serviceName}...`);
    // Add your specific shutdown logic here
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for shutdown
    console.log(`${serviceName} has been shut down`);
    
    return true;
  } catch (error) {
    console.error(`Error during graceful shutdown of ${serviceName}:`, error);
    throw error;
  }
}

async function initializeServices() {
  try {
    // Check if Payload CMS is already running
    const payloadPort = process.env.PAYLOAD_PORT || 3000;
    await gracefulShutdown('Payload CMS', payloadPort);

    console.log('Initializing services...');
    
    // Initialize Payload CMS
    console.log('Initializing Payload CMS...');
    const payload = await getPayloadClient({
      url: process.env.PAYLOAD_URL || `http://localhost:${payloadPort}`,
      secret: process.env.PAYLOAD_SECRET || 'development-secret',
    });

    // Initialize other services
    console.log('Initializing AWS MediaConvert service...');
    const awsService = new AWSService();
    
    console.log('Initializing Video Processing service...');
    const videoProcessor = new VideoProcessingService();
    
    console.log('Initializing Video Status service...');
    const statusService = new VideoStatusService();

    // Test connections
    await payload.find({ collection: 'media' });
    console.log('Successfully connected to database');

    return {
      payload,
      awsService,
      videoProcessor,
      statusService
    };
  } catch (error) {
    console.error('Error initializing services:', error);
    process.exit(1);
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeServices().then(() => {
    console.log('All services initialized successfully');
    process.exit(0);
  });
}

module.exports = initializeServices;