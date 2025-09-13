import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Play, Pause, RotateCcw } from 'lucide-react';
import { ClassData, MusicTrack, BackgroundOption, TransitionType } from '../types';

interface VideoGeneratorProps {
  classData: ClassData;
  selectedMusic: MusicTrack | null;
  backgroundOption: BackgroundOption;
  selectedTransition: TransitionType;
  slideDuration: number;
  slideshowName: string;
  onClose: () => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({
  classData,
  selectedMusic,
  backgroundOption,
  selectedTransition,
  slideDuration,
  slideshowName,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Track previous image dimensions for smooth transitions
  const [prevImageDimensions, setPrevImageDimensions] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Auto-start video generation when component mounts
  useEffect(() => {
    generateVideo();
  }, []);

  // Transition helper functions
  const applyTransition = (
    ctx: CanvasRenderingContext2D,
    currentImg: HTMLImageElement,
    nextImg: HTMLImageElement | null,
    progress: number,
    transitionType: string,
    canvas: HTMLCanvasElement,
    drawParams: { x: number; y: number; width: number; height: number },
    prevDimensions: { x: number; y: number; width: number; height: number } | null
  ) => {
    const { x, y, width, height } = drawParams;
    
    // Calculate smooth dimension transition for aspect ratio changes
    let finalX = x, finalY = y, finalWidth = width, finalHeight = height;
    
    if (prevDimensions && progress < 0.3) {
      // Smooth transition from previous dimensions to current dimensions
      const transitionProgress = progress / 0.3;
      const easeProgress = 1 - Math.pow(1 - transitionProgress, 3); // Ease-out cubic
      
      finalX = prevDimensions.x + (x - prevDimensions.x) * easeProgress;
      finalY = prevDimensions.y + (y - prevDimensions.y) * easeProgress;
      finalWidth = prevDimensions.width + (width - prevDimensions.width) * easeProgress;
      finalHeight = prevDimensions.height + (height - prevDimensions.height) * easeProgress;
    }
    
    switch (transitionType) {
      case 'fade':
        if (nextImg && progress > 0.8) {
          const fadeProgress = (progress - 0.8) / 0.2;
          ctx.globalAlpha = 1 - fadeProgress;
          ctx.drawImage(currentImg, finalX, finalY, finalWidth, finalHeight);
          ctx.globalAlpha = fadeProgress;
          
          // For next image, calculate its dimensions
          const nextImageAspect = nextImg.width / nextImg.height;
          const canvasAspect = canvas.width / canvas.height;
          
          let nextDrawWidth, nextDrawHeight, nextX, nextY;
          if (nextImageAspect > canvasAspect) {
            nextDrawWidth = canvas.width * 0.7;
            nextDrawHeight = nextDrawWidth / nextImageAspect;
            nextX = canvas.width * 0.15;
            nextY = (canvas.height - nextDrawHeight) / 2;
          } else {
            nextDrawHeight = canvas.height * 0.7;
            nextDrawWidth = nextDrawHeight * nextImageAspect;
            nextX = (canvas.width - nextDrawWidth) / 2;
            nextY = canvas.height * 0.15;
          }
          
          ctx.drawImage(nextImg, nextX, nextY, nextDrawWidth, nextDrawHeight);
          ctx.globalAlpha = 1;
        } else {
          ctx.drawImage(currentImg, finalX, finalY, finalWidth, finalHeight);
        }
        break;
        
      case 'slide':
        if (nextImg && progress > 0.7) {
          const slideProgress = (progress - 0.7) / 0.3;
          const slideOffset = finalWidth * slideProgress;
          ctx.drawImage(currentImg, finalX - slideOffset, finalY, finalWidth, finalHeight);
          
          // Calculate next image dimensions for slide
          const nextImageAspect = nextImg.width / nextImg.height;
          const canvasAspect = canvas.width / canvas.height;
          
          let nextDrawWidth, nextDrawHeight, nextX, nextY;
          if (nextImageAspect > canvasAspect) {
            nextDrawWidth = canvas.width * 0.7;
            nextDrawHeight = nextDrawWidth / nextImageAspect;
            nextX = canvas.width * 0.15;
            nextY = (canvas.height - nextDrawHeight) / 2;
          } else {
            nextDrawHeight = canvas.height * 0.7;
            nextDrawWidth = nextDrawHeight * nextImageAspect;
            nextX = (canvas.width - nextDrawWidth) / 2;
            nextY = canvas.height * 0.15;
          }
          
          ctx.drawImage(nextImg, nextX + nextDrawWidth - slideOffset, nextY, nextDrawWidth, nextDrawHeight);
        } else {
          ctx.drawImage(currentImg, finalX, finalY, finalWidth, finalHeight);
        }
        break;
        
      case 'zoom':
        const zoomFactor = 1 + (progress * 0.1);
        const zoomedWidth = finalWidth * zoomFactor;
        const zoomedHeight = finalHeight * zoomFactor;
        const zoomedX = finalX - (zoomedWidth - finalWidth) / 2;
        const zoomedY = finalY - (zoomedHeight - finalHeight) / 2;
        ctx.drawImage(currentImg, zoomedX, zoomedY, zoomedWidth, zoomedHeight);
        break;
        
      case 'flip':
        if (nextImg && progress > 0.5) {
          const flipProgress = (progress - 0.5) / 0.5;
          const scaleX = Math.cos(flipProgress * Math.PI);
          ctx.save();
          ctx.translate(finalX + finalWidth / 2, finalY + finalHeight / 2);
          ctx.scale(Math.abs(scaleX), 1);
          
          if (scaleX > 0) {
            ctx.drawImage(currentImg, -finalWidth / 2, -finalHeight / 2, finalWidth, finalHeight);
          } else {
            // Calculate next image dimensions for flip
            const nextImageAspect = nextImg.width / nextImg.height;
            const canvasAspect = canvas.width / canvas.height;
            
            let nextDrawWidth, nextDrawHeight;
            if (nextImageAspect > canvasAspect) {
              nextDrawWidth = canvas.width * 0.7;
              nextDrawHeight = nextDrawWidth / nextImageAspect;
            } else {
              nextDrawHeight = canvas.height * 0.7;
              nextDrawWidth = nextDrawHeight * nextImageAspect;
            }
            
            ctx.drawImage(nextImg, -nextDrawWidth / 2, -nextDrawHeight / 2, nextDrawWidth, nextDrawHeight);
          }
          ctx.restore();
        } else {
          ctx.drawImage(currentImg, finalX, finalY, finalWidth, finalHeight);
        }
        break;
        
      case 'dissolve':
        if (nextImg && progress > 0.6) {
          const dissolveProgress = (progress - 0.6) / 0.4;
          // Create a smooth dissolve effect using alpha blending
          ctx.drawImage(currentImg, finalX, finalY, finalWidth, finalHeight);
          
          // Create dissolve mask using noise pattern
          const imageData = ctx.getImageData(finalX, finalY, finalWidth, finalHeight);
          const data = imageData.data;
          
          // Create a temporary canvas for the next image
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = finalWidth;
          tempCanvas.height = finalHeight;
          const tempCtx = tempCanvas.getContext('2d')!;
          
          // Calculate next image dimensions for dissolve
          const nextImageAspect = nextImg.width / nextImg.height;
          const canvasAspect = canvas.width / canvas.height;
          
          let nextDrawWidth, nextDrawHeight;
          if (nextImageAspect > canvasAspect) {
            nextDrawWidth = canvas.width * 0.7;
            nextDrawHeight = nextDrawWidth / nextImageAspect;
          } else {
            nextDrawHeight = canvas.height * 0.7;
            nextDrawWidth = nextDrawHeight * nextImageAspect;
          }
          
          // Scale next image to match current image dimensions for dissolve
          tempCtx.drawImage(nextImg, 0, 0, finalWidth, finalHeight);
          const nextImageData = tempCtx.getImageData(0, 0, finalWidth, finalHeight);
          const nextData = nextImageData.data;
          
          // Apply dissolve effect pixel by pixel with smooth noise
          for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            const pixelX = pixelIndex % finalWidth;
            const pixelY = Math.floor(pixelIndex / finalWidth);
            
            // Create smooth noise pattern based on position
            const noiseValue = (Math.sin(pixelX * 0.1) + Math.cos(pixelY * 0.1) + 
                              Math.sin((pixelX + pixelY) * 0.05)) / 3;
            const threshold = (noiseValue + 1) / 2; // Normalize to 0-1
            
            // Blend pixels based on dissolve progress and noise threshold
            if (dissolveProgress > threshold) {
              data[i] = nextData[i];         // Red
              data[i + 1] = nextData[i + 1]; // Green
              data[i + 2] = nextData[i + 2]; // Blue
              data[i + 3] = nextData[i + 3]; // Alpha
            }
          }
          
          ctx.putImageData(imageData, finalX, finalY);
        } else {
          ctx.drawImage(currentImg, finalX, finalY, finalWidth, finalHeight);
        }
        break;
        
      default:
        ctx.drawImage(currentImg, finalX, finalY, finalWidth, finalHeight);
    }
  };

  const generateVideo = async () => {
    if (!canvasRef.current) return;

    setIsGenerating(true);
    setProgress(0);
    setVideoUrl(null);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to 1080p
    canvas.width = 1920;
    canvas.height = 1080;

    // Load background music if selected
    let backgroundAudio: HTMLAudioElement | null = null;
    let audioContext: AudioContext | null = null;
    let audioSource: MediaElementAudioSourceNode | null = null;
    let gainNode: GainNode | null = null;
    let destination: MediaStreamAudioDestinationNode | null = null;
    
    if (selectedMusic) {
      backgroundAudio = new Audio(selectedMusic.url);
      backgroundAudio.volume = 0.3; // Lower volume for background
      backgroundAudio.loop = true;
      backgroundAudio.crossOrigin = "anonymous"; // Enable CORS for audio processing
      
      // Set up audio context for proper stream mixing
      try {
        audioContext = new AudioContext();
        audioSource = audioContext.createMediaElementSource(backgroundAudio);
        gainNode = audioContext.createGain();
        gainNode.gain.value = 0.3; // Set volume
        destination = audioContext.createMediaStreamDestination();
        
        audioSource.connect(gainNode);
        gainNode.connect(destination);
        gainNode.connect(audioContext.destination); // Also connect to speakers for monitoring
      } catch (error) {
        console.warn('Audio context setup failed:', error);
        audioContext = null;
      }
    }

    // Load background image if provided
    let backgroundImg: HTMLImageElement | null = null;
    if (backgroundOption.type === 'image' && backgroundOption.image) {
      backgroundImg = new Image();
      backgroundImg.src = backgroundOption.image.url;
      await new Promise((resolve) => {
        backgroundImg!.onload = resolve;
      });
    }

    // Collect all photos
    const allPhotos: { file: File; className: string }[] = [];
    Object.entries(classData).forEach(([className, photos]) => {
      photos.forEach(photo => {
        allPhotos.push({ file: photo, className });
      });
    });

    if (allPhotos.length === 0) {
      setIsGenerating(false);
      return;
    }

    // Create video recorder
    let combinedStream: MediaStream;
    
    if (backgroundAudio && audioContext && destination) {
      // Combine video and audio streams
      const videoStream = canvas.captureStream(30);
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);
      
      console.log('Combined stream created with audio tracks:', destination.stream.getAudioTracks().length);
    } else {
      combinedStream = canvas.captureStream(30);
      console.log('Video-only stream created');
    }
    
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: 'video/webm;codecs=vp9,opus'
    });

    const chunks: BlobPart[] = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsGenerating(false);
      
      // Stop background music
      if (backgroundAudio) {
        backgroundAudio.pause();
        backgroundAudio.currentTime = 0;
      }
      
      // Clean up audio context
      if (audioContext) {
        audioContext.close();
      }
    };

    // Start recording
    mediaRecorder.start();
    
    // Start background music
    if (backgroundAudio) {
      try {
        // Resume audio context if suspended (required by some browsers)
        if (audioContext && audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        // Start playing the audio
        await backgroundAudio.play();
        console.log('Background music started successfully');
      } catch (error) {
        console.warn('Background music failed to play:', error);
      }
    }

    // Animation parameters
    const photoDuration = slideDuration * 1000; // Convert seconds to milliseconds
    const totalDuration = allPhotos.length * photoDuration;
    const fadeOutDuration = 2000; // 2 seconds fade out
    const fadeOutStartTime = totalDuration - fadeOutDuration;
    const startTime = Date.now();
    let previousDimensions: { x: number; y: number; width: number; height: number } | null = null;
    
    // Preload all images
    const loadedImages: { [key: string]: HTMLImageElement } = {};
    for (let i = 0; i < allPhotos.length; i++) {
      const img = new Image();
      img.src = URL.createObjectURL(allPhotos[i].file);
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      loadedImages[i] = img;
    }

    const animate = async () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      setProgress(progress * 100);

      // Handle music fade out
      if (backgroundAudio && elapsed >= fadeOutStartTime) {
        const fadeProgress = (elapsed - fadeOutStartTime) / fadeOutDuration;
        if (gainNode) {
          const volume = Math.max(0, 0.3 * (1 - fadeProgress)); // Fade from 0.3 to 0
          gainNode.gain.value = volume;
        } else {
          const volume = Math.max(0, 0.3 * (1 - fadeProgress));
          backgroundAudio.volume = volume;
        }
      }
      
      if (progress >= 1) {
        mediaRecorder.stop();
        return;
      }

      const currentPhotoIndex = Math.floor((elapsed / photoDuration) % allPhotos.length);
      const currentPhoto = allPhotos[currentPhotoIndex];
      const photoProgress = (elapsed % photoDuration) / photoDuration;
      const nextPhotoIndex = (currentPhotoIndex + 1) % allPhotos.length;

      // Clear canvas and draw background
      if (backgroundImg) {
        // Set background opacity
        const backgroundOpacity = backgroundOption.image?.opacity || 0.8;
        ctx.globalAlpha = backgroundOpacity;
        
        // Draw background image to fill canvas
        const bgAspect = backgroundImg.width / backgroundImg.height;
        const canvasAspect = canvas.width / canvas.height;
        
        let bgWidth, bgHeight, bgX, bgY;
        if (bgAspect > canvasAspect) {
          bgHeight = canvas.height;
          bgWidth = bgHeight * bgAspect;
          bgX = (canvas.width - bgWidth) / 2;
          bgY = 0;
        } else {
          bgWidth = canvas.width;
          bgHeight = bgWidth / bgAspect;
          bgX = 0;
          bgY = (canvas.height - bgHeight) / 2;
        }
        
        ctx.drawImage(backgroundImg, bgX, bgY, bgWidth, bgHeight);
        
        // Reset alpha for overlay
        ctx.globalAlpha = 1;
        
        // Add overlay for better text readability
        const overlayOpacity = Math.max(0.1, 0.4 - backgroundOpacity * 0.2);
        ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (backgroundOption.type === 'color' && backgroundOption.color) {
        // Solid color background
        const colorOpacity = backgroundOption.color.opacity || 0.8;
        ctx.globalAlpha = colorOpacity;
        ctx.fillStyle = backgroundOption.color.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        
        // Add overlay for better text readability
        const overlayOpacity = Math.max(0.1, 0.4 - colorOpacity * 0.2);
        ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // Default gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1e3a8a');
        gradient.addColorStop(1, '#3b82f6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Get current and next images
      const currentImg = loadedImages[currentPhotoIndex];
      const nextImg = loadedImages[nextPhotoIndex];

      if (currentImg) {
        // Calculate dimensions to fit image while maintaining aspect ratio
        const imageAspect = currentImg.width / currentImg.height;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawWidth, drawHeight, x, y;
        
        if (imageAspect > canvasAspect) {
          drawWidth = canvas.width * 0.7;
          drawHeight = drawWidth / imageAspect;
          x = canvas.width * 0.15;
          y = (canvas.height - drawHeight) / 2;
        } else {
          drawHeight = canvas.height * 0.7;
          drawWidth = drawHeight * imageAspect;
          x = (canvas.width - drawWidth) / 2;
          y = canvas.height * 0.15;
        }

        // Add enhanced shadow and glow effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 15;
        
        // Add white border/frame
        ctx.fillStyle = 'white';
        ctx.fillRect(x - 10, y - 10, drawWidth + 20, drawHeight + 20);
        
        // Apply transition effect
        applyTransition(
          ctx,
          currentImg,
          nextImg,
          photoProgress,
          selectedTransition.id,
          canvas,
          { x, y, width: drawWidth, height: drawHeight },
          previousDimensions
        );
        
        // Store current dimensions for next transition
        if (photoProgress > 0.7) {
          previousDimensions = { x, y, width: drawWidth, height: drawHeight };
        }
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Compact class name overlay with semi-transparent background
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        
        // Measure text to create a fitted rectangle
        const textMetrics = ctx.measureText(currentPhoto.className);
        const textWidth = textMetrics.width;
        const textHeight = 32; // Font size
        
        // Calculate rectangle dimensions with padding
        const padding = 20;
        const rectWidth = textWidth + (padding * 2);
        const rectHeight = textHeight + (padding * 1.5);
        
        // Position rectangle at bottom center
        const rectX = (canvas.width - rectWidth) / 2;
        const rectY = canvas.height - rectHeight - 30; // 30px from bottom
        
        // Draw semi-transparent rounded rectangle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // 50% opacity black
        ctx.beginPath();
        ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 8);
        ctx.fill();
        
        // Draw text with subtle glow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = 'white';
        
        // Center text in rectangle
        const textX = canvas.width / 2;
        const textY = rectY + (rectHeight / 2) + (textHeight / 3); // Vertically center
        ctx.fillText(currentPhoto.className, textX, textY);
        
        // Reset text shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Enhanced progress indicator with animation
        const progressBarWidth = canvas.width * 0.6;
        const progressBarHeight = 12;
        const progressBarX = canvas.width * 0.2;
        const progressBarY = 40;
        
        // Progress bar background with rounded corners
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.roundRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 6);
        ctx.fill();
        
        // Animated progress bar with gradient
        const progressGradient = ctx.createLinearGradient(progressBarX, 0, progressBarX + progressBarWidth, 0);
        progressGradient.addColorStop(0, '#3b82f6');
        progressGradient.addColorStop(1, '#1d4ed8');
        ctx.fillStyle = progressGradient;
        ctx.beginPath();
        ctx.roundRect(progressBarX, progressBarY, progressBarWidth * progress, progressBarHeight, 6);
        ctx.fill();
        
        // Add sparkle effect on progress bar
        if (progress > 0) {
          const sparkleX = progressBarX + (progressBarWidth * progress) - 5;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(sparkleX, progressBarY + progressBarHeight / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  const downloadVideo = () => {
    if (!videoUrl) return;
    
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${slideshowName || 'slideshow'}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetGenerator = () => {
    setVideoUrl(null);
    setProgress(0);
    setIsGenerating(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Enhanced Video Generator</h2>
            <p className="text-sm text-gray-500 mt-1">
              {slideDuration}s per slide • Transition: {selectedTransition.name} • 
              {backgroundOption.type === 'image' ? ' Custom Image' : 
               backgroundOption.type === 'color' ? ' Solid Color' : ' Default Background'} • 
              {selectedMusic?.name || 'No Music'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 p-6">
          <div className="mb-6">
            <canvas
              ref={canvasRef}
              className="w-full max-w-4xl mx-auto border rounded-lg bg-gray-100 shadow-lg"
              style={{ aspectRatio: '16/9' }}
            />
          </div>

          {isGenerating && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Generating video ({slideDuration}s per slide) with {selectedTransition.name.toLowerCase()} transitions...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {videoUrl && (
            <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-800 font-medium">Enhanced video ready for download!</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={downloadVideo}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium transition-all duration-200 shadow-sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                  <button
                    onClick={resetGenerator}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center space-x-4">
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Video Features:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
              <div>• 1920x1080 (1080p)</div>
              <div>• {slideDuration}s per slide</div>
              <div>• {selectedTransition.name} transitions</div>
              <div>• {backgroundOption.type === 'image' ? 'Custom Image' : 
                       backgroundOption.type === 'color' ? 'Solid Color' : 'Gradient'} background</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;