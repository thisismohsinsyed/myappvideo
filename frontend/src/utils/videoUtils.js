// Video utility functions for creating videos from images

/**
 * Creates a video blob from a base64 image with Ken Burns effect
 * @param {string} imageBase64 - Base64 encoded image data
 * @param {number} duration - Duration in seconds (default 10)
 * @returns {Promise<Blob>} - Video blob
 */
export async function createVideoFromImage(imageBase64, duration = 10) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set canvas size to 720p for better performance
      canvas.width = 1280;
      canvas.height = 720;
      
      // Check for MediaRecorder support
      if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        console.warn('VP8 not supported, trying default');
      }
      
      // Create video stream from canvas
      const stream = canvas.captureStream(30); // 30 fps
      
      let options = { mimeType: 'video/webm;codecs=vp8' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = {};
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      const chunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        console.log('Video created, size:', blob.size, 'bytes');
        resolve(blob);
      };
      
      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        reject(e);
      };
      
      // Start recording with timeslice to get data periodically
      mediaRecorder.start(100); // Get data every 100ms
      
      // Animation variables
      const fps = 30;
      const totalFrames = duration * fps;
      const frameDuration = 1000 / fps;
      let frame = 0;
      let lastTime = performance.now();
      
      // Ken Burns effect parameters
      const startScale = 1.0;
      const endScale = 1.2;
      
      // Draw image to fill canvas maintaining aspect ratio
      const imgRatio = img.width / img.height;
      const canvasRatio = canvas.width / canvas.height;
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (imgRatio > canvasRatio) {
        drawHeight = canvas.height;
        drawWidth = drawHeight * imgRatio;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = canvas.width;
        drawHeight = drawWidth / imgRatio;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      }
      
      const animate = () => {
        const now = performance.now();
        const elapsed = now - lastTime;
        
        if (elapsed >= frameDuration) {
          lastTime = now - (elapsed % frameDuration);
          
          const progress = frame / totalFrames;
          const scale = startScale + (endScale - startScale) * progress;
          const panX = -20 * progress;
          const panY = -15 * progress;
          
          // Clear canvas
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Apply transformations
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.scale(scale, scale);
          ctx.translate(-canvas.width / 2 + panX, -canvas.height / 2 + panY);
          
          // Draw the image
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
          ctx.restore();
          
          frame++;
        }
        
        if (frame < totalFrames) {
          requestAnimationFrame(animate);
        } else {
          // Stop recording after all frames
          setTimeout(() => {
            mediaRecorder.stop();
          }, 200);
        }
      };
      
      // Start animation
      animate();
    };
    
    img.onerror = (e) => {
      console.error('Image load error:', e);
      reject(new Error('Failed to load image'));
    };
    
    // Handle both with and without data URI prefix
    if (imageBase64.startsWith('data:')) {
      img.src = imageBase64;
    } else {
      img.src = `data:image/png;base64,${imageBase64}`;
    }
  });
}

/**
 * Creates a video using a simpler interval-based approach (more reliable)
 */
export async function createVideoFromImageSimple(imageBase64, duration = 10) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 1280;
      canvas.height = 720;
      
      const stream = canvas.captureStream(30);
      
      let options = {};
      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          options.mimeType = mimeType;
          break;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      const chunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const mimeType = options.mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: mimeType });
        console.log('Video created:', blob.size, 'bytes, type:', mimeType);
        resolve(blob);
      };
      
      mediaRecorder.onerror = (e) => {
        reject(e);
      };
      
      // Calculate image dimensions
      const imgRatio = img.width / img.height;
      const canvasRatio = canvas.width / canvas.height;
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (imgRatio > canvasRatio) {
        drawHeight = canvas.height;
        drawWidth = drawHeight * imgRatio;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = canvas.width;
        drawHeight = drawWidth / imgRatio;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      }
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      
      const totalMs = duration * 1000;
      const startTime = Date.now();
      const startScale = 1.0;
      const endScale = 1.15;
      
      // Use setInterval for more reliable timing
      const intervalId = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / totalMs, 1);
        
        const scale = startScale + (endScale - startScale) * progress;
        const panX = -15 * progress;
        const panY = -10 * progress;
        
        // Clear and draw
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvas.width / 2 + panX, -canvas.height / 2 + panY);
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        ctx.restore();
        
        if (elapsed >= totalMs) {
          clearInterval(intervalId);
          setTimeout(() => mediaRecorder.stop(), 100);
        }
      }, 33); // ~30fps
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    
    if (imageBase64.startsWith('data:')) {
      img.src = imageBase64;
    } else {
      img.src = `data:image/png;base64,${imageBase64}`;
    }
  });
}

/**
 * Combines multiple video blobs into one by concatenating
 * Note: This creates a playlist-style combination
 */
export async function combineVideos(videos) {
  if (videos.length === 0) return null;
  if (videos.length === 1) return videos[0].blob;
  
  // For proper video concatenation, we need to re-encode
  // This is a simplified version that creates a combined blob
  const combinedChunks = [];
  
  for (const video of videos) {
    const arrayBuffer = await video.blob.arrayBuffer();
    combinedChunks.push(new Uint8Array(arrayBuffer));
  }
  
  // Calculate total size
  const totalSize = combinedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalSize);
  
  let offset = 0;
  for (const chunk of combinedChunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  
  return new Blob([combined], { type: 'video/webm' });
}

/**
 * Downloads a blob as a file
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Creates a video URL from base64 image for preview
 */
export async function createVideoPreviewUrl(imageBase64, duration = 10) {
  try {
    const blob = await createVideoFromImageSimple(imageBase64, duration);
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error creating video preview:', error);
    return null;
  }
}
