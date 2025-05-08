// Main application logic
document.addEventListener('DOMContentLoaded', function() {
  // Load videos on page load
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    loadVideos();
  }
  
  // Set up event listeners for the video player page
  if (window.location.pathname.includes('/video/')) {
    const videoId = window.location.pathname.split('/').pop();
    loadVideoDetails(videoId);
    
    // Add any additional initialization needed for the video player page
    setupVideoPlayerEvents();
  }
});

// Video grid functionality
function loadVideos() {
  fetch('/api/videos')
    .then(response => response.json())
    .then(data => {
      const videoGrid = document.getElementById('videoGrid');
      videoGrid.innerHTML = '';
      
      if (data.docs && data.docs.length > 0) {
        data.docs.forEach(video => {
          const statusClass = getStatusClass(video.status);
          
          const videoCard = `
            <div class="col-md-4">
              <div class="card">
                <img src="${video.thumbnailUrl || 'https://picsum.photos/seed/video${video.id}/400/180.jpg'}" 
                     class="video-thumbnail" alt="${video.title}">
                <div class="card-body">
                  <h5 class="card-title">${video.title}</h5>
                  <p class="card-text text-truncate">${video.description || 'No description available'}</p>
                  <span class="badge ${statusClass} status-badge float-end">${video.status}</span>
                  <div class="mt-2">
                    <small class="text-muted">Duration: ${video.duration || 'Unknown'}</small>
                  </div>
                  <div class="mt-3 d-flex justify-content-between">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewVideo('${video.id}')">
                      View
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="editVideo('${video.id}')">
                      Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteVideo('${video.id}')">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
          
          videoGrid.innerHTML += videoCard;
        });
      } else {
        videoGrid.innerHTML = `
          <div class="col-12 text-center py-5">
            <p>No videos found. Upload your first video!</p>
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#uploadModal">
              Upload Video
            </button>
          </div>
        `;
      }
    })
    .catch(error => {
      console.error('Error loading videos:', error);
      const videoGrid = document.getElementById('videoGrid');
      videoGrid.innerHTML = `
            <div class="col-12 text-center py-5">
              <p>Error loading videos. Please try again later.</p>
              <button id="retryBtn" class="btn btn-primary mt-3" onclick="loadVideos()">
                Retry
              </button>
            </div>
          `;
    });
}

function getStatusClass(status) {
  switch (status) {
    case 'processing':
      return 'bg-warning text-dark';
    case 'ready':
      return 'bg-success';
    case 'error':
      return 'bg-danger';
    default:
      return 'bg-secondary';
  }
}

// Video player functionality
async function loadVideoDetails(id) {
  try {
    const response = await fetch(`/api/videos/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const video = await response.json();
    
    // Set video player source
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.src = `${process.env.PAYLOAD_URL}/media/${video.file.filename}`;
    
    // Set video information
    document.getElementById('videoTitle').textContent = video.title;
    document.getElementById('videoStatus').textContent = video.status;
    document.getElementById('videoDuration').textContent = video.duration || 'Unknown';
    document.getElementById('videoDescription').textContent = video.description || 'No description available';
    
    // Update status badge color
    const statusBadge = document.getElementById('videoStatus');
    switch (video.status) {
      case 'processing':
        statusBadge.className = 'badge bg-warning text-dark status-badge me-2';
        break;
      case 'ready':
        statusBadge.className = 'badge bg-success status-badge me-2';
        break;
      case 'error':
        statusBadge.className = 'badge bg-danger status-badge me-2';
        break;
      default:
        statusBadge.className = 'badge bg-secondary status-badge me-2';
    }
    
    // Load related videos
    await loadRelatedVideos(id);
  } catch (error) {
    console.error('Error loading video details:', error);
    window.location.href = '/';
  }
}

async function loadRelatedVideos(currentId) {
  try {
    const response = await fetch('/api/videos');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const videos = await response.json();
    
    // Filter out the current video
    const relatedVideos = videos.docs.filter(video => video.id !== currentId);
    
    // Display related videos
    const relatedVideosList = document.getElementById('relatedVideosList');
    
    if (relatedVideos.length > 0) {
      let html = '';
      
      for (const video of relatedVideos.slice(0, 4)) { // Show only first 4 videos
        html += `
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <img src="${video.thumbnailUrl || `https://picsum.photos/seed/video${video.id}/400/225.jpg`}" 
                   class="card-img-top" alt="${video.title}">
              <div class="card-body">
                <h6 class="card-title">${video.title}</h6>
                <p class="card-text small text-muted">${video.description || 'No description'}</p>
                <a href="/video/${video.id}" class="btn btn-sm btn-primary">View</a>
              </div>
            </div>
          </div>
        `;
      }
      
      relatedVideosList.innerHTML = html;
    } else {
      relatedVideosList.innerHTML = `
        <div class="col-12 text-center py-3">
          <p>No related videos found.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading related videos:', error);
    document.getElementById('relatedVideosList').innerHTML = `
      <div class="col-12 text-center py-3">
        <p>Error loading related videos. Please try again later.</p>
      </div>
    `;
  }
}

function setupVideoPlayerEvents() {
  // Add any additional initialization needed for the video player page
  const videoPlayer = document.getElementById('videoPlayer');
  
  if (videoPlayer) {
    videoPlayer.addEventListener('play', function() {
      // Handle play event
    });
    
    videoPlayer.addEventListener('pause', function() {
      // Handle pause event
    });
    
    videoPlayer.addEventListener('ended', function() {
      // Handle ended event
    });
  }
}

// Upload functionality
async function uploadVideo() {
  const fileInput = document.getElementById('videoFile');
  const titleInput = document.getElementById('videoTitle');
  const descriptionInput = document.getElementById('videoDescription');
  
  if (!fileInput.files[0]) {
    alert('Please select a video file to upload.');
    return;
  }
  
  try {
    // Create FormData object
    const formData = new FormData();
    formData.append('video', fileInput.files[0]);
    
    // Add metadata
    formData.append('title', titleInput.value);
    formData.append('description', descriptionInput.value || '');
    
    // Show loading state
    document.getElementById('uploadBtn').innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
    document.getElementById('uploadBtn').disabled = true;
    
    // Make API call
    const response = await fetch('/api/videos/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Show success message
    const toast = new bootstrap.Toast(document.getElementById('successToast'));
    toast.show();
    
    // Close modal and reset form
    const modal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
    document.getElementById('uploadForm').reset();
    
    // Refresh video list
    loadVideos();
  } catch (error) {
    console.error('Error uploading video:', error);
    alert(`Failed to upload video: ${error.message}`);
  } finally {
    // Reset button state
    document.getElementById('uploadBtn').innerHTML = 'Upload Video';
    document.getElementById('uploadBtn').disabled = false;
  }
}

// Search and filter functionality
function filterVideos() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;
  
  fetch('/api/videos')
    .then(response => response.json())
    .then(data => {
      const videoGrid = document.getElementById('videoGrid');
      videoGrid.innerHTML = '';
      
      if (data.docs && data.docs.length > 0) {
        let filteredVideos = data.docs;
        
        // Apply search filter
        if (searchTerm) {
          filteredVideos = filteredVideos.filter(video => 
            video.title.toLowerCase().includes(searchTerm) || 
            (video.description && video.description.toLowerCase().includes(searchTerm))
          );
        }
        
        // Apply status filter
        if (statusFilter) {
          filteredVideos = filteredVideos.filter(video => video.status === statusFilter);
        }
        
        // Display filtered results
        if (filteredVideos.length > 0) {
          filteredVideos.forEach(video => {
            const statusClass = getStatusClass(video.status);
            
            const videoCard = `
              <div class="col-md-4">
                <div class="card">
                  <img src="${video.thumbnailUrl || 'https://picsum.photos/seed/video${video.id}/400/180.jpg'}" 
                       class="video-thumbnail" alt="${video.title}">
                  <div class="card-body">
                    <h5 class="card-title">${video.title}</h5>
                    <p class="card-text text-truncate">${video.description || 'No description available'}</p>
                    <span class="badge ${statusClass} status-badge float-end">${video.status}</span>
                    <div class="mt-2">
                      <small class="text-muted">Duration: ${video.duration || 'Unknown'}</small>
                    </div>
                    <div class="mt-3 d-flex justify-content-between">
                      <button class="btn btn-sm btn-outline-primary" onclick="viewVideo('${video.id}')">
                        View
                      </button>
                      <button class="btn btn-sm btn-outline-secondary" onclick="editVideo('${video.id}')">
                        Edit
                      </button>
                      <button class="btn btn-sm btn-outline-danger" onclick="deleteVideo('${video.id}')">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `;
            
            videoGrid.innerHTML += videoCard;
          });
        } else {
          videoGrid.innerHTML = `
            <div class="col-12 text-center py-5">
              <p>No videos match your search criteria.</p>
              <button id="clearFiltersBtn" class="btn btn-primary mt-3" onclick="loadVideos()">
                Clear Filters
              </button>
            </div>
          `;
        }
      } else {
        videoGrid.innerHTML = `
          <div class="col-12 text-center py-5">
            <p>No videos found. Upload your first video!</p>
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#uploadModal">
              Upload Video
            </button>
          </div>
        `;
      }
    })
    .catch(error => {
      console.error('Error filtering videos:', error);
      const videoGrid = document.getElementById('videoGrid');
      videoGrid.innerHTML = `
            <div class="col-12 text-center py-5">
              <p>Error loading related videos. Please try again later.</p>
              <button id="retryBtn" class="btn btn-primary mt-3" onclick="loadVideos()">
                Retry
              </button>
            </div>
          `;
    });
}

// Video actions
function viewVideo(id) {
  window.location.href = `/video/${id}`;
}

function editVideo(id) {
  // In a real application, this would open an edit form
  alert(`Edit video functionality would be implemented here`);
}

async function deleteVideo(id) {
  if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/videos/${id}`, {
      method: 'DELETE',
    });
    
    if (response.ok) {
      loadVideos();
    } else {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting video:', error);
    alert(`Failed to delete video: ${error.message}`);
  }
}

function downloadVideo() {
  // In a real application, this would trigger the video download
  const videoId = window.location.pathname.split('/').pop();
  const videoUrl = `${process.env.PAYLOAD_URL}/media/${videoId}`;
  
  // Create a temporary link and trigger download
  const link = document.createElement('a');
  link.href = videoUrl;
  link.download = `video-${videoId}.mp4`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}