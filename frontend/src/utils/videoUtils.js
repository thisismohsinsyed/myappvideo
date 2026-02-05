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
      // Set canvas size to 1080p
      canvas.width = 1920;
      canvas.height = 1080;
      
      // Create video stream from canvas
      const stream = canvas.captureStream(30); // 30 fps
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000
      });
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };
      
      mediaRecorder.onerror = (e) => {
        reject(e);
      };
      
      // Start recording
      mediaRecorder.start();
      
      // Animation variables
      const fps = 30;
      const totalFrames = duration * fps;
      let frame = 0;
      
      // Ken Burns effect parameters
      const startScale = 1.0;
      const endScale = 1.15;
      const startX = 0;
      const startY = 0;
      const endX = -50;
      const endY = -30;
      
      const animate = () => {
        if (frame >= totalFrames) {
          mediaRecorder.stop();
          return;
        }
        
        const progress = frame / totalFrames;
        const scale = startScale + (endScale - startScale) * progress;
        const x = startX + (endX - startX) * progress;
        const y = startY + (endY - startY) * progress;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw image with Ken Burns effect
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvas.width / 2 + x, -canvas.height / 2 + y);
        
        // Draw image to fill canvas
        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;
        let drawWidth, drawHeight, drawX, drawY;
        
        if (imgRatio > canvasRatio) {
          drawHeight = canvas.height;
          drawWidth = drawHeight * imgRatio;
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        } else {
          drawWidth = canvas.width;
          drawHeight = drawWidth / imgRatio;
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        }
        
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
        
        frame++;
        requestAnimationFrame(animate);
      };
      
      animate();
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = `data:image/png;base64,${imageBase64}`;
  });
}

/**
 * Combines multiple video blobs into one
 * @param {Array<{blob: Blob, duration: number}>} videos - Array of video data
 * @returns {Promise<Blob>} - Combined video blob
 */
export async function combineVideos(videos) {
  // For browser compatibility, we'll create a simple concatenation
  // In production, this would use ffmpeg.wasm or server-side processing
  
  const chunks = [];
  for (const video of videos) {
    const arrayBuffer = await video.blob.arrayBuffer();
    chunks.push(new Uint8Array(arrayBuffer));
  }
  
  // Simple blob concatenation (works for preview purposes)
  const combined = new Blob(chunks, { type: 'video/webm' });
  return combined;
}

/**
 * Downloads a blob as a file
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Creates a video URL from base64 image for preview
 * @param {string} imageBase64 - Base64 encoded image
 * @param {number} duration - Duration in seconds
 * @returns {Promise<string>} - Object URL for the video
 */
export async function createVideoPreviewUrl(imageBase64, duration = 10) {
  const blob = await createVideoFromImage(imageBase64, duration);
  return URL.createObjectURL(blob);
}
