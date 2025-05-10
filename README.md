# Payload CMS Video Engine

A Reach Engine replacement using Payload CMS for video asset management.

## Features

- Video upload with support for multiple formats
- Automatic thumbnail generation 
- Video status tracking (processing, ready, error)
- Search and filter functionality
- Responsive admin interface
- Related videos suggestions
- Video playback with basic controls

## System Requirements

- Node.js v16 or higher
- MongoDB (local or cloud instance)
- AWS S3 bucket for video storage (optional but recommended)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/payload-video-engine.git
   cd payload-video-engine
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables by creating a `.env` file in the root directory with:

   ```
   PAYLOAD_SECRET=your-secret-key
   MONGODB_URI=mongodb://localhost:27017/video-engine
   PAYLOAD_URL=http://localhost:3000
   AWS_ACCESS_KEY_ID=your-aws-access-key-id # Only needed if using S3 storage
   AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key # Only needed if using S3 storage
   ```

4. Start the application:
   ```bash
   npm run dev
   ```

## Usage

### Video Management

1. **Upload Videos**
   - Navigate to the dashboard at `http://localhost:3000`
   - Click "Upload Video" in the top navigation
   - Fill out the form and select a video file
   - Click "Upload Video"

2. **View Videos**
   - After uploading, videos will appear in the library grid
   - Click on any video to view it

3. **Manage Videos**
   - Edit video details by clicking the "Edit" button
   - Delete videos with the "Delete" button
   - Update video status manually if needed

### API Endpoints

- `GET /api/videos` - List all videos
- `POST /api/videos/upload` - Upload a new video
- `GET /api/videos/:id` - Get a specific video
- `PATCH /api/videos/:id/status` - Update video status
- `DELETE /api/videos/:id` - Delete a video

## Development

### Adding New Features

1. **Add a new field to the video schema**
   - Edit `src/config/payload.config.js`
   - Add your new field in the videos collection definition

2. **Create a new API endpoint**
   - Create a new controller file in `src/controllers/`
   - Implement the logic
   - Add the route in `src/middleware/video.middleware.js`

### Customizing the Interface

1. **Modify the admin interface**
   - Edit `public/index.html` for dashboard changes
   - Edit `public/video.html` for video player changes

2. **Add new pages**
   - Create a new HTML file in the public directory
   - Add routes to access it

## Deployment

For production deployment, you'll need to:

1. Set up MongoDB with proper indexing
2. Configure AWS S3 or another storage solution
3. Build the application for production:
   ```bash
   npm run build
   ```
4. Deploy using your preferred hosting provider

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch (`feat/new-feature` or `fix/bug`)
3. Make your changes
4. Run tests to ensure everything works
5. Submit a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.