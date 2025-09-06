import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Play, Pause, RotateCcw } from 'lucide-react';
import { ClassData, MusicTrack } from '../types';

interface VideoGeneratorProps {
  classData: ClassData;
  selectedMusic: MusicTrack | null;
  onClose: () => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({
  classData,
  selectedMusic,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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
    const photoDuration = 2000; // 2 seconds per photo
    const totalDuration = allPhotos.length * photoDuration;
    const startTime = Date.now();

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

      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1e3a8a');
      gradient.addColorStop(1, '#3b82f6');
      ctx.fillStyle = gradient;
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