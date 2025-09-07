import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Play, Pause, RotateCcw } from 'lucide-react';
import { ClassData, MusicTrack, BackgroundImage, TransitionType } from '../types';

interface VideoGeneratorProps {
  classData: ClassData;
  selectedMusic: MusicTrack | null;
  backgroundImage: BackgroundImage | null;
  selectedTransition: TransitionType;
  onClose: () => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({
  classData,
  selectedMusic,
  backgroundImage,
  selectedTransition,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Transition helper functions
  const applyTransition = (
    ctx: CanvasRenderingContext2D,
    currentImg: HTMLImageElement,
    nextImg: HTMLImageElement | null,
    progress: number,
    transitionType: string,
    canvas: HTMLCanvasElement,
    drawParams: { x: number; y: number; width: number; height: number }
  ) => {
    const { x, y, width, height } = drawParams;
    
    switch (transitionType) {
      case 'fade':
        if (nextImg && progress > 0.8) {
          const fadeProgress = (progress - 0.8) / 0.2;
          ctx.globalAlpha = 1 - fadeProgress;
          ctx.drawImage(currentImg, x, y, width, height);
          ctx.globalAlpha = fadeProgress;
          ctx.drawImage(nextImg, x, y, width, height);
          ctx.globalAlpha = 1;
        } else {
          ctx.drawImage(currentImg, x, y, width, height);
        }
        break;
        
      case 'slide':
        if (nextImg && progress > 0.7) {
          const slideProgress = (progress - 0.7) / 0.3;
          const slideOffset = width * slideProgress;
          ctx.drawImage(currentImg, x - slideOffset, y, width, height);
          ctx.drawImage(nextImg, x + width - slideOffset, y, width, height);
        } else {
          ctx.drawImage(currentImg, x, y, width, height);
        }
        break;
        
      case 'zoom':
        const zoomFactor = 1 + (progress * 0.1);
        const zoomedWidth = width * zoomFactor;
        const zoomedHeight = height * zoomFactor;
        const zoomedX = x - (zoomedWidth - width) / 2;
        const zoomedY = y - (zoomedHeight - height) / 2;
        ctx.drawImage(currentImg, zoomedX, zoomedY, zoomedWidth, zoomedHeight);
        break;
        
      case 'flip':
        if (nextImg && progress > 0.5) {
          const flipProgress = (progress - 0.5) / 0.5;
          const scaleX = Math.cos(flipProgress * Math.PI);
          ctx.save();
          ctx.translate(x + width / 2, y + height / 2);
          ctx.scale(Math.abs(scaleX), 1);
          const imgToShow = scaleX > 0 ? currentImg : nextImg;
          ctx.drawImage(imgToShow, -width / 2, -height / 2, width, height);
          ctx.restore();
        } else {
          ctx.drawImage(currentImg, x, y, width, height);
        }
        break;
        
      case 'dissolve':
        if (nextImg && progress > 0.6) {
          const dissolveProgress = (progress - 0.6) / 0.4;
          // Create a pixelated dissolve effect
          const pixelSize = 8;
          for (let px = 0; px < width; px += pixelSize) {
            for (let py = 0; py < height; py += pixelSize) {
              if (Math.random() < dissolveProgress) {
                ctx.drawImage(nextImg, x + px, y + py, pixelSize, pixelSize, x + px, y + py, pixelSize, pixelSize);
              } else {
                ctx.drawImage(currentImg, x + px, y + py, pixelSize, pixelSize, x + px, y + py, pixelSize, pixelSize);
              }
            }
          }
        } else {
          ctx.drawImage(currentImg, x, y, width, height);
        }
        break;
        
      default:
        ctx.drawImage(currentImg, x, y, width, height);
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
    if (selectedMusic) {
      backgroundAudio = new Audio(selectedMusic.url);
      backgroundAudio.volume = 0.3; // Lower volume for background
      backgroundAudio.loop = true;
    }

    // Load background image if provided
    let backgroundImg: HTMLImageElement | null = null;
    if (backgroundImage) {
      backgroundImg = new Image();
      backgroundImg.src = backgroundImage.url;
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
    const stream = canvas.captureStream(30); // 30 fps
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
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
    };

    // Start recording
    mediaRecorder.start();
    
    // Start background music
    if (backgroundAudio) {
      backgroundAudio.play().catch(error => {
        console.warn('Background music failed to play:', error);
      });
    }

    // Animation parameters
    const photoDuration = 3000; // 3 seconds per photo for better transitions
    const totalDuration = allPhotos.length * photoDuration;
    const startTime = Date.now();
    
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
        
        // Add overlay for better text readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
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
          { x, y, width: drawWidth, height: drawHeight }
        );
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Enhanced class name overlay with animation
        const overlayHeight = 140;
        const overlayY = canvas.height - overlayHeight;
        
        // Animated gradient overlay
        const overlayGradient = ctx.createLinearGradient(0, overlayY, 0, canvas.height);
        overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = overlayGradient;
        ctx.fillRect(0, overlayY, canvas.width, overlayHeight);
        
        // Animated text with glow effect
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 52px Arial';
        ctx.textAlign = 'center';
        
        // Add text animation based on photo progress
        const textScale = 1 + Math.sin(photoProgress * Math.PI * 2) * 0.05;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height - 50);
        ctx.scale(textScale, textScale);
        ctx.fillText(currentPhoto.className, 0, 0);
        ctx.restore();
        
        // Reset text shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

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
    a.download = `karate-slideshow-${new Date().toISOString().split('T')[0]}.webm`;
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
              Transition: {selectedTransition.name} • 
              {backgroundImage ? ' Custom Background' : ' Default Background'} • 
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
                <span>Generating enhanced video with {selectedTransition.name.toLowerCase()} transitions...</span>
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
            {!isGenerating && !videoUrl && (
              <button
                onClick={generateVideo}
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg transform hover:scale-105"
              >
                <Play className="h-5 w-5 mr-2" />
                Generate Enhanced Video
              </button>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Video Features:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
              <div>• 1920x1080 (1080p)</div>
              <div>• {selectedTransition.name} transitions</div>
              <div>• {backgroundImage ? 'Custom' : 'Gradient'} background</div>
              <div>• Enhanced animations</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load and draw image
      const img = new Image();
      img.onload = () => {
        // Calculate dimensions to fit image while maintaining aspect ratio
        const imageAspect = img.width / img.height;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawWidth, drawHeight, x, y;
        
        if (imageAspect > canvasAspect) {
          drawWidth = canvas.width * 0.8;
          drawHeight = drawWidth / imageAspect;
          x = canvas.width * 0.1;
          y = (canvas.height - drawHeight) / 2;
        } else {
          drawHeight = canvas.height * 0.8;
          drawWidth = drawHeight * imageAspect;
          x = (canvas.width - drawWidth) / 2;
          y = canvas.height * 0.1;
        }

        // Add shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Add class name overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - 120, canvas.width, 120);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(currentPhoto.className, canvas.width / 2, canvas.height - 40);

        // Add progress indicator
        const progressBarWidth = canvas.width * 0.8;
        const progressBarHeight = 8;
        const progressBarX = canvas.width * 0.1;
        const progressBarY = 30;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
        
        ctx.fillStyle = 'white';
        ctx.fillRect(progressBarX, progressBarY, progressBarWidth * progress, progressBarHeight);

        requestAnimationFrame(animate);
      };
      
      img.src = URL.createObjectURL(currentPhoto.file);
    };

    animate();
  };

  const downloadVideo = () => {
    if (!videoUrl) return;
    
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `karate-slideshow-${new Date().toISOString().split('T')[0]}.webm`;
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Video Generator</h2>
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
              className="w-full max-w-2xl mx-auto border rounded-lg bg-gray-100"
              style={{ aspectRatio: '16/9' }}
            />
          </div>

          {isGenerating && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Generating video...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {videoUrl && (
            <div className="mb-4 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-green-800 font-medium">Video ready for download!</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={downloadVideo}
                    className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200"
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
            {!isGenerating && !videoUrl && (
              <button
                onClick={generateVideo}
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <Play className="h-5 w-5 mr-2" />
                Generate Video
              </button>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-500 text-center">
            Output: 1920x1080 (1080p) • WebM format • {selectedMusic?.name || 'No background music'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;