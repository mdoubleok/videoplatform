import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VideoExplorer = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get('/api/videos');
      setVideos(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('Failed to load videos. Please try again later.');
      setLoading(false);
    }
  };

  if (loading) return <div>Loading videos...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="video-explorer">
      <h2>Video Library</h2>
      
      {videos.length === 0 ? (
        <p>No videos found. Upload your first video!</p>
      ) : (
        <div className="video-grid">
          {videos.map(video => (
            <div key={video.id} className="video-card">
              <img 
                src={`/thumbnails/${video.thumbnail}`} 
                alt={`Thumbnail for ${video.title}`}
                className="thumbnail"
              />
              
              <h3>{video.title}</h3>
              
              <p>Status: {video.status}</p>
              
              <div className="video-actions">
                <button onClick={() => window.location.href = `/preview?id=${video.id}`}>
                  Preview
                </button>
                
                <button 
                  onClick={() => window.location.href = `/api/videos/${video.id}/proxy`}
                  disabled={video.status !== 'ready'}
                >
                  Download Proxy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoExplorer;