import React, { useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import WizardProgress from './components/WizardProgress';
import WizardNavigation from './components/WizardNavigation';
import ClassUploadStep from './components/ClassUploadStep';
import TransitionStep from './components/TransitionStep';
import BackgroundStep from './components/BackgroundStep';
import MusicStep from './components/MusicStep';
import PreviewStep from './components/PreviewStep';
import VideoGenerator from './components/VideoGenerator';
import SettingsModal from './components/SettingsModal';
import SlideshowManager from './components/SlideshowManager';
import GoogleAuthButton from './components/GoogleAuthButton';
import type { GoogleUser } from './services/googleAuth';
import { backendService, StoredFile } from './services/api';
import { ClassData, MusicTrack, BackgroundOption, TransitionType } from './types';
import { useDialog } from './components/ui/DialogProvider';
import { subscribeUploadSync } from './utils/slideshowSync';
import { dedupeClassDataByAssetId } from './utils/classDataOrder';
import { revokePhotoPreview } from './utils/photoPreviewCache';

const TRANSITION_TYPES: TransitionType[] = [
  { id: 'fade', name: 'Fade', description: 'Smooth fade between images' },
  { id: 'slide', name: 'Slide', description: 'Slide images from side to side' },
  { id: 'zoom', name: 'Zoom', description: 'Zoom in/out effect' },
  { id: 'flip', name: 'Flip', description: '3D flip transition' },
  { id: 'dissolve', name: 'Dissolve', description: 'Pixelated dissolve effect' }
];

const DEFAULT_CLASSES = [
  'Image Group 1',
  'Image Group 2', 
  'Image Group 3',
  'Image Group 4',
  'Image Group 5'
];

const MUSIC_TRACKS: MusicTrack[] = [];

function App() {
  const { alertDialog, confirmDialog, promptDialog, toast } = useDialog();
  const [classes, setClasses] = useState<string[]>(DEFAULT_CLASSES);
  const [defaultClasses, setDefaultClasses] = useState<string[]>(DEFAULT_CLASSES);
  const [classData, setClassData] = useState<ClassData>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [weeklyMusic, setWeeklyMusic] = useState<MusicTrack | null>(null);
  const [currentUser, setCurrentUser] = useState<GoogleUser | null>(null);
  const [backgroundOption, setBackgroundOption] = useState<BackgroundOption>({ type: 'none' });
  const [selectedTransition, setSelectedTransition] = useState<TransitionType>(TRANSITION_TYPES[0]);
  const [showSlideshowManager, setShowSlideshowManager] = useState(false);
  const [slideDuration, setSlideDuration] = useState(3); // Default 3 seconds per slide
  const [loadedSlideshowLabel, setLoadedSlideshowLabel] = useState<string | null>(null);
  const [currentSlideshowId, setCurrentSlideshowId] = useState<string | null>(null);
  const [recoverablePhotoCount, setRecoverablePhotoCount] = useState(0);
  const [isRestoringPhotos, setIsRestoringPhotos] = useState(false);
  const [slideshowName, setSlideshowName] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday to 6, others to dayOfWeek - 1
    
    // Get Monday of current week
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    
    // Get Sunday of current week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const formatDate = (date: Date) => {
      const month = monthNames[date.getMonth()];
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month} ${day}, ${year}`;
    };
    
    return `${formatDate(monday)} to ${formatDate(sunday)}`;
  });
  const [existingMusicFiles, setExistingMusicFiles] = useState<Array<{
    id: string;
    name: string;
    url: string;
    createdTime: string;
    size?: string;
  }>>([]);
  const [existingBackgroundImages, setExistingBackgroundImages] = useState<Array<{
    id: string;
    name: string;
    url: string;
    createdTime: string;
    size?: string;
  }>>([]);
  const [customMusicTracks, setCustomMusicTracks] = useState<MusicTrack[]>([]);
  const stepAutoSaveInProgressRef = useRef(false);
  const stepAutoSaveQueuedRef = useRef(false);
  const contentAutoSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerStepAutoSaveRef = useRef<(() => void) | null>(null);
  const uploadedPhotoAssetsRef = useRef<WeakMap<File, StoredFile>>(new WeakMap());
  const uploadingPhotoAssetsRef = useRef<WeakMap<File, Promise<StoredFile>>>(new WeakMap());
  const uploadingMusicTrackIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    backendService.setCurrentUserEmail(currentUser?.email ?? null);
  }, [currentUser]);

  // Load app settings and asset libraries
  useEffect(() => {
    if (!currentUser) return;

    const loadAppData = async () => {
      try {
        const savedClasses = await backendService.loadGroupsSettings();
        if (savedClasses && savedClasses.length > 0) {
          setClasses(savedClasses);
          setDefaultClasses(savedClasses);
          const newClassData: ClassData = {};
          savedClasses.forEach(className => {
            newClassData[className] = classData[className] || [];
          });
          setClassData(newClassData);
        }

        const [musicFiles, backgroundImages] = await Promise.all([
          backendService.listMusicFiles(),
          backendService.listBackgroundImages(),
        ]);
        setExistingMusicFiles(musicFiles);
        setExistingBackgroundImages(backgroundImages);
      } catch (error) {
        console.error('Failed to load app data:', error);
      }
    };

    loadAppData();
  }, [currentUser]);

  // Initialize weekly music selection
  useEffect(() => {
    // No default music selection since we removed sample tracks
    setWeeklyMusic(null);
    setSelectedMusic(null);
  }, []);

  const ensurePhotoUploaded = async (file: File): Promise<StoredFile> => {
    const cached = uploadedPhotoAssetsRef.current.get(file);
    if (cached) return cached;

    const inFlight = uploadingPhotoAssetsRef.current.get(file);
    if (inFlight) return inFlight;

    const uploadPromise = backendService.uploadAsset(file, 'photo', file.name)
      .then((uploaded) => {
        uploadedPhotoAssetsRef.current.set(file, uploaded);
        uploadingPhotoAssetsRef.current.delete(file);
        return uploaded;
      })
      .catch((error) => {
        uploadingPhotoAssetsRef.current.delete(file);
        throw error;
      });

    uploadingPhotoAssetsRef.current.set(file, uploadPromise);
    return uploadPromise;
  };

  const updateClassPhotos = (className: string, photos: File[]) => {
    setClassData(prev => ({
      ...prev,
      [className]: photos
    }));

    photos.forEach((file) => {
      if (!uploadedPhotoAssetsRef.current.get(file)) {
        ensurePhotoUploaded(file).catch((error) => {
          console.error(`Failed to upload photo "${file.name}"`, error);
        });
      }
    });
  };

  const movePhotoToGroup = (fromGroup: string, photoIndex: number, toGroup: string): boolean => {
    if (fromGroup === toGroup) return false;

    const sourcePhotos = classData[fromGroup] ?? [];
    const photo = sourcePhotos[photoIndex];
    if (!photo) return false;

    const targetPhotos = classData[toGroup] ?? [];
    if (targetPhotos.length >= 5) {
      toast('That group already has 5 photos.', 'error');
      return false;
    }

    const nextClassData: ClassData = {
      ...classData,
      [fromGroup]: sourcePhotos.filter((_, index) => index !== photoIndex),
      [toGroup]: [...targetPhotos, photo],
    };
    setClassData(nextClassData);
    void persistSlideshow(nextClassData, { notifyOnSuccess: true, successMessage: 'Photo moved and saved.' });
    return true;
  };

  const reorderPhotoInGroup = (groupName: string, fromIndex: number, toIndex: number) => {
    const photos = classData[groupName] ?? [];
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= photos.length || toIndex >= photos.length) return;

    const nextPhotos = [...photos];
    const [moved] = nextPhotos.splice(fromIndex, 1);
    nextPhotos.splice(toIndex, 0, moved);

    const nextClassData: ClassData = {
      ...classData,
      [groupName]: nextPhotos,
    };
    setClassData(nextClassData);
    void persistSlideshow(nextClassData);
  };

  const removePhotoFromGroup = (groupName: string, photoIndex: number) => {
    const photos = classData[groupName] ?? [];
    const photo = photos[photoIndex];
    if (!photo) return;

    revokePhotoPreview(photo);
    const nextClassData: ClassData = {
      ...classData,
      [groupName]: photos.filter((_, index) => index !== photoIndex),
    };
    setClassData(nextClassData);
    void persistSlideshow(nextClassData, {
      notifyOnSuccess: true,
      successMessage: 'Photo removed and saved.',
    });
  };

  const groupPhotoCounts = Object.fromEntries(
    classes.map((groupName) => [groupName, (classData[groupName] ?? []).length])
  );

const getTotalPhotos = () => {
  return Object.values(classData).reduce((total, photos) => 
    total + (photos && Array.isArray(photos) ? photos.length : 0), 0
  );
};

  const hasSlideshowContent = () => {
    if (getTotalPhotos() > 0) return true;
    if (selectedMusic !== null) return true;
    if (backgroundOption.type !== 'none') return true;
    return false;
  };

  const getClassesWithPhotos = () => {
    return classes.filter(groupName => (classData[groupName] ?? []).length > 0);
  };

  // Calculate total steps: image groups + transitions + background + music + preview
  const totalSteps = classes.length + 4;
  
  // Generate step titles
  const getStepTitles = () => {
    const groupTitles = classes.map((groupName, index) => `${groupName}`);
    return [...groupTitles, 'Transitions', 'Background', 'Music', 'Preview'];
  };

  const getCompletedSteps = () => {
    const completed = new Array(totalSteps).fill(false);
    
    // Mark image group steps as completed if they have photos
    classes.forEach((groupName, index) => {
      if ((classData[groupName] ?? []).length> 0) {
        completed[index] = true;
      }
    });
    
    // Mark other steps as completed
    completed[classes.length] = true; // Transitions (always has default)
    completed[classes.length + 1] = true; // Background (optional)
    completed[classes.length + 2] = selectedMusic !== null; // Music
    completed[classes.length + 3] = getTotalPhotos() > 0; // Preview
    
    return completed;
  };

  const handleLoadExistingBackgroundImage = (imageData: {
    id: string;
    name: string;
    url: string;
    createdTime: string;
    size?: string;
  }) => {
    setBackgroundOption({
      type: 'image',
      image: {
        url: imageData.url,
        opacity: 0.8,
        assetId: imageData.id
      }
    });
  };

  const handleBackgroundOptionUpdate = (option: BackgroundOption) => {
    setBackgroundOption(option);

    if (option.type === 'image' && option.image?.file && !option.image.assetId) {
      backendService.uploadAsset(option.image.file, 'image', option.image.file.name)
        .then((uploaded) => {
          setBackgroundOption((prev) => {
            if (prev.type !== 'image' || !prev.image || prev.image.file !== option.image?.file) {
              return prev;
            }
            return {
              ...prev,
              image: {
                ...prev.image,
                assetId: uploaded.id,
                url: uploaded.url,
              },
            };
          });

          setExistingBackgroundImages((prev) => [
            uploaded,
            ...prev.filter((item) => item.id !== uploaded.id),
          ]);
        })
        .catch((error) => {
          console.error('Failed to upload background image:', error);
        });
    }
  };

  const uploadMusicTrackIfNeeded = (track: MusicTrack) => {
    if (!track.file || track.assetId || uploadingMusicTrackIdsRef.current.has(track.id)) {
      return;
    }

    uploadingMusicTrackIdsRef.current.add(track.id);
    backendService.uploadAsset(track.file, 'audio', track.name)
      .then((uploaded) => {
        setSelectedMusic((prev) => {
          if (!prev || prev.id !== track.id) return prev;
          return { ...prev, assetId: uploaded.id, url: uploaded.url };
        });
        setCustomMusicTracks((prev) => prev.map((item) => (
          item.id === track.id ? { ...item, assetId: uploaded.id, url: uploaded.url } : item
        )));
        setExistingMusicFiles((prev) => [
          uploaded,
          ...prev.filter((item) => item.id !== uploaded.id),
        ]);
      })
      .catch((error) => {
        console.error('Failed to upload music track:', error);
      })
      .finally(() => {
        uploadingMusicTrackIdsRef.current.delete(track.id);
      });
  };

  const handleSelectMusic = (track: MusicTrack | null) => {
    setSelectedMusic(track);
    if (track) {
      uploadMusicTrackIfNeeded(track);
    }
  };

  const handleCustomTracksUpdate = (tracks: MusicTrack[]) => {
    setCustomMusicTracks(tracks);
    tracks.forEach((track) => {
      uploadMusicTrackIfNeeded(track);
    });
  };

  const handleLoadExistingMusic = (musicData: {
    id: string;
    name: string;
    url: string;
    createdTime: string;
    size?: string;
  }) => {
    const selectTrack = (duration: number) => {
      handleSelectMusic({
        id: musicData.id,
        name: musicData.name,
        title: musicData.name,
        artist: 'Your Music',
        duration,
        url: musicData.url,
        assetId: musicData.id
      });
    };

    const loadMetadata = async () => {
      let playableUrl: string;
      try {
        playableUrl = await backendService.getPlayableAssetUrl({
          url: musicData.url,
          assetId: musicData.id,
        });
      } catch (error) {
        console.error('Failed to prepare audio metadata URL for:', musicData.name, error);
        selectTrack(0);
        return;
      }

      const cleanupPlayableUrl = () => {
        if (playableUrl.startsWith('blob:')) {
          URL.revokeObjectURL(playableUrl);
        }
      };

      // Create audio element to get duration
      const audio = new Audio(playableUrl);
      audio.addEventListener('loadedmetadata', () => {
        const durationInSeconds = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0;
        selectTrack(durationInSeconds);
        cleanupPlayableUrl();
      });
      
      audio.addEventListener('error', () => {
        console.error('Failed to load audio metadata for:', musicData.name);
        // Set music without duration if metadata loading fails
        selectTrack(0);
        cleanupPlayableUrl();
      });
      
      // Load the audio to trigger metadata loading
      audio.load();
    };
    
    void loadMetadata();
  };

  const handleRenameExistingMusic = async (musicId: string, newName: string) => {
    const updated = await backendService.renameAsset(musicId, newName);
    setExistingMusicFiles((prev) => prev.map((item) => (
      item.id === musicId ? { ...item, name: updated.name } : item
    )));
    setSelectedMusic((prev) => (
      prev?.assetId === musicId ? { ...prev, name: updated.name, title: updated.name } : prev
    ));
  };

  const handleDeleteExistingMusic = async (musicId: string) => {
    await backendService.deleteAsset(musicId);
    setExistingMusicFiles((prev) => prev.filter((item) => item.id !== musicId));
    setSelectedMusic((prev) => (prev?.assetId === musicId ? null : prev));
  };

  const handleCreateUploadLink = async () => {
    try {
      const created = await backendService.getPersonalIntakeLink();
      const intakeUrl = `${window.location.origin}/intake/${created.token}`;

      try {
        await navigator.clipboard.writeText(intakeUrl);
        toast('Personal upload link copied to clipboard.', 'success');
      } catch {
        await promptDialog('Copy this upload link:', intakeUrl, {
          title: 'Personal Upload Link',
          confirmText: 'Done',
          cancelText: 'Close',
        });
      }
    } catch (error) {
      console.error('Failed to create upload link:', error);
      await alertDialog('Failed to create upload link. Please try again.', {
        title: 'Upload Link Error',
      });
    }
  };

  const canProceedFromCurrentStep = () => {
    if (currentStep < classes.length) {
      // For image group steps, allow proceeding even without photos (optional)
      return true;
    } else if (currentStep === classes.length) {
      // Transitions step - always can proceed (has default)
      return true;
    } else if (currentStep === classes.length + 1) {
      // Background step - always can proceed (optional)
      return true;
    } else if (currentStep === classes.length + 2) {
      // Music step - always can proceed (optional)
      return true;
    } else if (currentStep === classes.length + 3) {
      // Preview step - need at least one photo
      return getTotalPhotos() > 0;
    }
    return false;
  };

const handleLoadSlideshow = (data: {
  id?: string;
  name?: string;
  classData?: ClassData;
  selectedMusic?: MusicTrack | null;
  backgroundOption?: BackgroundOption;
  selectedTransition?: TransitionType;
  classes?: string[];
  slideDuration?: number;
  slideshowName?: string;
}) => {
  // Use classes from slideshow data, fallback to settings.classes, then DEFAULT_CLASSES
  const slideshowClasses = Array.isArray(data.classes) 
    ? data.classes 
    : Array.isArray((data as any).settings?.classes) 
    ? (data as any).settings.classes 
    : DEFAULT_CLASSES;

  console.log('slideshowClasses:', slideshowClasses);
  
  // Convert loaded data back to File objects
  const processLoadedData = async () => {
    let processedClassData: ClassData = {};
    
    if (data.classData) {
      // Handle both base64 strings and already processed data
      const rawClassData = data.classData as { [className: string]: any[] };
      for (const [className, images] of Object.entries(rawClassData)) {
        if (Array.isArray(images)) {
          processedClassData[className] = await Promise.all(
            images.map(async (img: any, index: number) => {
              try {
                // If it's already a File object, use it
                if (img instanceof File) {
                  return img;
                }
                
                // If it's a base64 string, convert it
                if (typeof img === 'string') {
                  const imageSource = img.startsWith('data:') || img.startsWith('http')
                    ? img
                    : `data:image/jpeg;base64,${img}`;
                  const response = await fetch(imageSource);
                  if (!response.ok) {
                    throw new Error(`Failed to fetch image source (${response.status})`);
                  }
                  const blob = await response.blob();
                  return new File(
                    [blob],
                    `${className}-image-${index + 1}.${blob.type.split('/')[1] || 'jpg'}`,
                    { type: blob.type || 'image/jpeg' }
                  );
                }
                
                // If it's an object with data property
                if (img && typeof img === 'object' && img.data) {
                  const base64Data = `data:image/jpeg;base64,${img.data}`;
                  const response = await fetch(base64Data);
                  if (!response.ok) {
                    throw new Error(`Failed to fetch base64 image (${response.status})`);
                  }
                  const blob = await response.blob();
                  return new File([blob], `${className}-image-${index + 1}.jpg`, { type: 'image/jpeg' });
                }

                // Placeholder when S3 upload failed but slideshow row was still saved
                if (img && typeof img === 'object' && img.pendingUpload && !img.url) {
                  console.warn('Skipping photo that was not uploaded to storage:', img.name);
                  return null;
                }

                // If it's an object with URL from backend storage
                if (img && typeof img === 'object' && img.url) {
                  // Keep a lightweight file placeholder and always render from backend URL.
                  // This avoids CORS/signature issues from trying to fetch-and-rebuild remote images.
                  const loadedFile = new File(
                    [new Blob([], { type: 'image/jpeg' })],
                    img.name || `${className}-image-${index + 1}.jpg`,
                    { type: 'image/jpeg' }
                  );
                  (loadedFile as File & { previewUrl?: string }).previewUrl = img.url;
                  if (img.id) {
                    uploadedPhotoAssetsRef.current.set(loadedFile, {
                      id: img.id,
                      name: img.name || loadedFile.name,
                      url: img.url,
                      createdTime: img.createdTime || new Date().toISOString(),
                    });
                  }
                  return loadedFile;
                }
                
                console.warn('Unknown image format:', img);
                return null;
              } catch (error) {
                console.error('Failed to convert image:', error);
                return null;
              }
            })
          ).then(files => files.filter(file => file !== null) as File[]);
        } else {
          processedClassData[className] = [];
        }
      }
    }

    // Ensure every class has an array (even if missing in loaded data)
    slideshowClasses.forEach(className => {
      if (!processedClassData[className]) processedClassData[className] = [];
    });

    processedClassData = dedupeClassDataByAssetId(
      slideshowClasses,
      processedClassData,
      (file) => uploadedPhotoAssetsRef.current.get(file)?.id
    );

    // Handle background option loading
    let loadedBackgroundOption: BackgroundOption = { type: 'none' };
    if (data.backgroundOption) {
      loadedBackgroundOption = data.backgroundOption;
      
      // Handle background image loading (from Drive asset or base64 fallback)
      if (loadedBackgroundOption.type === 'image' && loadedBackgroundOption.image) {
        if (loadedBackgroundOption.image.url) {
          // Image already loaded from Drive, just use the URL
          console.log('Using background image from Drive');
        } else if (loadedBackgroundOption.image.data) {
          // Fallback to base64 data
          loadedBackgroundOption.image.url = `data:image/jpeg;base64,${loadedBackgroundOption.image.data}`;
          console.log('Using background image from base64 fallback');
        }
      }
    }

    // Handle music loading
    const loadedSelectedMusic = data.selectedMusic;
    if (loadedSelectedMusic?.assetId && loadedSelectedMusic.url) {
      console.log('Using background music from Drive');
    }

    console.log('Final processed class data:', Object.keys(processedClassData));
    console.log('Total photos loaded:', Object.values(processedClassData).reduce((total, photos) => total + photos.length, 0));
    setClassData(processedClassData);
    setSelectedMusic(loadedSelectedMusic ?? null);
    setBackgroundOption(loadedBackgroundOption);
    setSelectedTransition(data.selectedTransition ?? TRANSITION_TYPES[0]);
    setSlideDuration(data.slideDuration ?? 3);
    setSlideshowName(data.slideshowName ?? (() => {
      const today = new Date();
      const year = today.getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[today.getMonth()];
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })());
    setCurrentSlideshowId(data.id ?? null);
    setLoadedSlideshowLabel(data.slideshowName ?? (data as any).name ?? null);
    setClasses(slideshowClasses);
    setCurrentStep(0);
  };
  
  processLoadedData().catch(console.error);
};

const handleLoadSlideshowOld = (data: {
  classData?: ClassData;
  selectedMusic?: MusicTrack | null;
  backgroundOption?: BackgroundOption;
  selectedTransition?: TransitionType;
  classes?: string[];
  slideDuration?: number;
  slideshowName?: string;
}) => {
  const slideshowClasses = Array.isArray(data.classes) ? data.classes : DEFAULT_CLASSES;

  console.log('slideshowClasses:', slideshowClasses);
  
  // Convert loaded data back to File objects
  const processLoadedData = async () => {
    let processedClassData: ClassData = {};
    
    if (data.classData) {
      processedClassData = await convertBase64ToFiles(data.classData as { [className: string]: string[] });
    }

    // Ensure every class has an array (even if missing in loaded data)
    slideshowClasses.forEach(className => {
      if (!processedClassData[className]) processedClassData[className] = [];
    });

    // Handle background option loading
    let loadedBackgroundOption: BackgroundOption = { type: 'none' };
    if (data.backgroundOption) {
      loadedBackgroundOption = data.backgroundOption;
      
      // Convert base64 background image back to File if needed
      if (loadedBackgroundOption.type === 'image' && loadedBackgroundOption.image?.data) {
        try {
          const response = await fetch(`data:image/jpeg;base64,${loadedBackgroundOption.image.data}`);
          const blob = await response.blob();
          const file = new File([blob], 'background.jpg', { type: 'image/jpeg' });
          loadedBackgroundOption = {
            type: 'image',
            image: {
              file,
              url: URL.createObjectURL(file),
              opacity: loadedBackgroundOption.image.opacity || 0.8
            }
          };
        } catch (error) {
          console.error('Failed to load background image:', error);
          loadedBackgroundOption = { type: 'none' };
        }
      }
    }

    setClassData(processedClassData);
    setSelectedMusic(data.selectedMusic ?? null);
    setBackgroundOption(loadedBackgroundOption);
    setSelectedTransition(data.selectedTransition ?? TRANSITION_TYPES[0]);
    setSlideDuration(data.slideDuration ?? 3);
    setSlideshowName(data.slideshowName ?? (() => {
      const today = new Date();
      const year = today.getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[today.getMonth()];
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })());
    setClasses(slideshowClasses);
    setCurrentStep(0);
  };
  
  processLoadedData().catch(console.error);
};


const normalizeLoadedClassData = (loaded: any) => {
  const normalized: ClassData = {};
  Object.entries(loaded || {}).forEach(([className, images]) => {
    normalized[className] = Array.isArray(images)
      ? images.map((img: string | File) => {
          if (typeof img === 'string') {
            // Check if the string already has a data URL prefix
            if (img.startsWith('data:image/')) return { url: img };

            // Optionally detect image type from first few bytes
            let type = 'jpeg';
            if (img.startsWith('iVBOR')) type = 'png'; // PNG signature in Base64
            return { url: `data:image/${type};base64,${img}` };
          } else {
            return img;
          }
        })
      : [];
  });
  return normalized;
};
  
  // Convert File objects back to actual File objects for loaded data
  const convertBase64ToFiles = async (classData: { [className: string]: string[] }): Promise<ClassData> => {
    const result: ClassData = {};
    
    for (const [className, base64Images] of Object.entries(classData)) {
      result[className] = await Promise.all(
        base64Images.map(async (base64: string) => {
          try {
            const response = await fetch(`data:image/jpeg;base64,${base64}`);
            const blob = await response.blob();
            return new File([blob], `${className}-image.jpg`, { type: 'image/jpeg' });
          } catch (error) {
            console.error('Failed to convert base64 to file:', error);
            // Return a placeholder or skip this image
            return null;
          }
        })
      ).then(files => files.filter(file => file !== null) as File[]);
    }
    
    return result;
  };
  const handleClassesUpdate = async (newClasses: string[]) => {
    // Update class names and migrate existing photo data
    const newClassData: ClassData = {};   
    
    newClasses.forEach((newClassName, index) => {
      const oldClassName = classes[index];
      if (oldClassName && classData[oldClassName]) {
        // Migrate photos from old class name to new class name
        newClassData[newClassName] = classData[oldClassName];
      }
    });
    
    setClasses(newClasses);
    setDefaultClasses(newClasses);
    setClassData(newClassData);

    try {
      await backendService.saveGroupsSettings(newClasses);

      // Persist group changes immediately on the active slideshow as well.
      const saved = await backendService.saveSlideshow({
        id: currentSlideshowId,
        name: slideshowName,
        classData: newClassData,
        selectedMusic,
        backgroundOption,
        selectedTransition,
        classes: newClasses,
        slideDuration,
        slideshowName,
        uploadedPhotoAssets: uploadedPhotoAssetsRef.current,
      });
      setCurrentSlideshowId(saved.id);
      setLoadedSlideshowLabel(saved.name || slideshowName);
    } catch (error) {
      console.error('Failed to save groups settings/current slideshow:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      triggerStepAutoSave();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      triggerStepAutoSave();
    }
  };

  const handleEditStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    triggerStepAutoSave();
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    triggerStepAutoSave();
  };

  const handleAutoSave = async (overrideClassData?: ClassData) => {
    await persistSlideshow(overrideClassData ?? classData);
  };

  const persistSlideshow = async (
    dataToSave: ClassData,
    options?: { notifyOnSuccess?: boolean; successMessage?: string }
  ) => {
    if (!slideshowName.trim()) {
      return;
    }

    const photoCount = Object.values(dataToSave).reduce(
      (total, photos) => total + (photos && Array.isArray(photos) ? photos.length : 0),
      0
    );

    // Never overwrite a saved slideshow's photos when local state has none loaded yet.
    if (photoCount === 0 && currentSlideshowId) {
      return;
    }
    // Prevent accidental overwrite of an existing slideshow name with an empty wizard state.
    if (photoCount === 0 && selectedMusic === null && backgroundOption.type === 'none') {
      return;
    }

    try {
      const saved = await backendService.saveSlideshow({
        id: currentSlideshowId,
        name: slideshowName,
        classData: dataToSave,
        selectedMusic,
        backgroundOption,
        selectedTransition,
        classes,
        slideDuration,
        slideshowName,
        uploadedPhotoAssets: uploadedPhotoAssetsRef.current,
      });
      setCurrentSlideshowId(saved.id);
      setLoadedSlideshowLabel(saved.name || slideshowName);
      console.log('Auto-save successful for:', slideshowName);
      if (options?.notifyOnSuccess) {
        toast(options.successMessage || 'Slideshow saved.', 'success');
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast('Could not save slideshow changes.', 'error');
      throw error;
    }
  };

  const triggerStepAutoSave = () => {
    if (!slideshowName.trim()) {
      return;
    }

    if (stepAutoSaveInProgressRef.current) {
      stepAutoSaveQueuedRef.current = true;
      return;
    }

    stepAutoSaveInProgressRef.current = true;

    const runAutoSave = async () => {
      do {
        stepAutoSaveQueuedRef.current = false;
        await handleAutoSave();
      } while (stepAutoSaveQueuedRef.current);
      stepAutoSaveInProgressRef.current = false;
    };

    runAutoSave().catch((error) => {
      console.error('Step auto-save failed:', error);
      stepAutoSaveInProgressRef.current = false;
    });
  };

  triggerStepAutoSaveRef.current = triggerStepAutoSave;

  // Persist when photos/music/background/settings change — not only on step navigation.
  // Without this, users who add images but never tap Next see nothing saved to the server.
  useEffect(() => {
    if (!currentUser) return;
    if (!slideshowName.trim()) return;
    const photoCount = Object.values(classData).reduce(
      (total, photos) => total + (photos && Array.isArray(photos) ? photos.length : 0),
      0
    );
    if (photoCount === 0 && selectedMusic === null && backgroundOption.type === 'none') {
      return;
    }
    if (photoCount === 0 && currentSlideshowId) {
      return;
    }

    if (contentAutoSaveDebounceRef.current) {
      clearTimeout(contentAutoSaveDebounceRef.current);
    }
    contentAutoSaveDebounceRef.current = setTimeout(() => {
      contentAutoSaveDebounceRef.current = null;
      triggerStepAutoSaveRef.current?.();
    }, 900);

    return () => {
      if (contentAutoSaveDebounceRef.current) {
        clearTimeout(contentAutoSaveDebounceRef.current);
        contentAutoSaveDebounceRef.current = null;
      }
    };
  }, [
    currentUser,
    slideshowName,
    classData,
    selectedMusic,
    backgroundOption,
    selectedTransition,
    classes,
    slideDuration,
    currentSlideshowId,
  ]);

  const generateVideo = async () => {
    if (getTotalPhotos() === 0) return;
    // Persist slideshow to the database (POST /api/slideshows) before recording. Video upload
    // can succeed even when this fails, which otherwise looks like "video saved but slideshow didn't."
    try {
      await handleAutoSave();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not save slideshow to the server.';
      console.error('Save before video generation failed:', error);
      toast(
        'Slideshow was not saved. Fix the issue below, then try Generate again.',
        'error'
      );
      await alertDialog(
        `The slideshow could not be saved before generating your video. Without this step, it will not appear in your saved slideshows.\n\n${message}`,
        { title: 'Save failed' }
      );
      return;
    }
    setShowVideoGenerator(true);
  };

  const handleNewSlideshow = async () => {
    if (getTotalPhotos() > 0 || selectedMusic || backgroundOption.type !== 'none') {
      const confirmReset = await confirmDialog(
        'Are you sure you want to start a new slideshow? This will clear all current photos, music, and settings.',
        {
          title: 'Start New Slideshow',
          confirmText: 'Start New',
          cancelText: 'Keep Current',
          danger: true,
        }
      );
      if (!confirmReset) return;
    }

    // Reset all slideshow data
    const newClassData: ClassData = {};
    defaultClasses.forEach(className => {
      newClassData[className] = [];
    });
    
    setClasses(defaultClasses);
    setClassData(newClassData);
    setSelectedMusic(null);
    setWeeklyMusic(null);
    setBackgroundOption({ type: 'none' });
    setSelectedTransition(TRANSITION_TYPES[0]);
    setSlideDuration(3);
    setCustomMusicTracks([]);
    setCurrentStep(0);
    setCurrentSlideshowId(null);
    setLoadedSlideshowLabel(null);
    
    // Generate new default slideshow name
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const formatDate = (date: Date) => {
      const month = monthNames[date.getMonth()];
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month} ${day}, ${year}`;
    };
    
    setSlideshowName(`${formatDate(monday)} to ${formatDate(sunday)}`);
  };

  const loadSlideshowFromUrlRef = useRef(false);

  useEffect(() => {
    if (!currentUser || loadSlideshowFromUrlRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const loadId = params.get('loadSlideshow');
    if (!loadId) return;

    loadSlideshowFromUrlRef.current = true;

    params.delete('loadSlideshow');
    const remaining = params.toString();
    const cleanUrl = remaining ? `${window.location.pathname}?${remaining}` : window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    backendService
      .loadSlideshow(loadId)
      .then((data) => {
        handleLoadSlideshow(data);
        toast('Slideshow loaded.', 'success');
      })
      .catch((error) => {
        console.error('Failed to load slideshow from URL:', error);
        toast('Could not open the slideshow. It may have been deleted.', 'error');
      });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeUploadSync(async (event) => {
      const matchesCurrent =
        (currentSlideshowId && event.slideshowId === currentSlideshowId) ||
        (!!event.slideshowName && event.slideshowName === slideshowName);

      if (!matchesCurrent) return;

      try {
        const previousStep = currentStep;
        const refreshed = await backendService.loadSlideshow(event.slideshowId);
        handleLoadSlideshow(refreshed);
        setCurrentStep(previousStep);
        toast('New photos synced from Upload Link.', 'info');
      } catch (error) {
        console.error('Failed to sync upload-link update:', error);
      }
    });

    return unsubscribe;
  }, [currentUser, currentSlideshowId, slideshowName, currentStep]);

  useEffect(() => {
    if (!currentUser || !currentSlideshowId || getTotalPhotos() > 0) {
      setRecoverablePhotoCount(0);
      return;
    }

    let cancelled = false;
    backendService
      .getRecoverablePhotos(currentSlideshowId)
      .then((result) => {
        if (!cancelled) setRecoverablePhotoCount(result.count);
      })
      .catch(() => {
        if (!cancelled) setRecoverablePhotoCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, currentSlideshowId, classData]);

  const handleRestorePhotos = async () => {
    if (!currentSlideshowId || recoverablePhotoCount === 0) return;

    const shouldRestore = await confirmDialog(
      `Restore ${recoverablePhotoCount} photo${recoverablePhotoCount === 1 ? '' : 's'} from storage back into this slideshow? Photos will be placed across your image groups in upload order.`,
      {
        title: 'Restore Missing Photos',
        confirmText: 'Restore Photos',
        cancelText: 'Cancel',
      }
    );
    if (!shouldRestore) return;

    setIsRestoringPhotos(true);
    try {
      const result = await backendService.restorePhotos(currentSlideshowId);
      const refreshed = await backendService.loadSlideshow(currentSlideshowId);
      handleLoadSlideshow(refreshed);
      setRecoverablePhotoCount(0);
      toast(
        `Restored ${result.restoredCount} photo${result.restoredCount === 1 ? '' : 's'}.`,
        'success'
      );
    } catch (error) {
      console.error('Failed to restore photos:', error);
      await alertDialog('Could not restore photos. Please try again.', { title: 'Restore Failed' });
    } finally {
      setIsRestoringPhotos(false);
    }
  };

  const renderCurrentStep = () => {
    if (currentStep < classes.length) {
      // Image group upload steps
      const groupName = classes[currentStep];
      return (
        <ClassUploadStep
          className={groupName}
          photos={classData[groupName] || []}
          onPhotosUpdate={(photos) => updateClassPhotos(groupName, photos)}
          stepNumber={currentStep + 1}
          totalClasses={classes.length}
          allGroups={classes}
          groupPhotoCounts={groupPhotoCounts}
          onMovePhotoToGroup={(targetGroup, photoIndex) =>
            movePhotoToGroup(groupName, photoIndex, targetGroup)
          }
        />
      );
    } else if (currentStep === classes.length) {
      // Transitions step
      return (
        <TransitionStep
          selectedTransition={selectedTransition}
          transitionTypes={TRANSITION_TYPES}
          onTransitionUpdate={setSelectedTransition}
        />
      );
    } else if (currentStep === classes.length + 1) {
      // Background step
      return (
        <BackgroundStep
          backgroundOption={backgroundOption}
          onBackgroundOptionUpdate={handleBackgroundOptionUpdate}
          existingBackgroundImages={existingBackgroundImages}
          onLoadExistingImage={handleLoadExistingBackgroundImage}
        />
      );
    } else if (currentStep === classes.length + 2) {
      // Music step
      return (
        <MusicStep
          tracks={MUSIC_TRACKS}
          selectedTrack={selectedMusic}
          weeklyTrack={weeklyMusic}
          onSelectTrack={handleSelectMusic}
          existingMusicFiles={existingMusicFiles}
          onLoadExistingMusic={handleLoadExistingMusic}
          onRenameExistingMusic={handleRenameExistingMusic}
          onDeleteExistingMusic={handleDeleteExistingMusic}
          customTracks={customMusicTracks}
          onCustomTracksUpdate={handleCustomTracksUpdate}
        />
      );
    } else if (currentStep === classes.length + 3) {
      // Preview step
      return (
        <PreviewStep
          classData={classData}
          selectedMusic={selectedMusic}
          backgroundOption={backgroundOption}
          selectedTransition={selectedTransition}
          slideDuration={slideDuration}
          onSlideDurationChange={setSlideDuration}
          onGenerate={generateVideo}
          onEdit={handleEditStep}
          slideshowName={slideshowName}
          onSlideshowNameChange={setSlideshowName}
          onAutoSave={handleAutoSave}
          classes={classes}
          onMovePhotoToGroup={movePhotoToGroup}
          onReorderPhotoInGroup={reorderPhotoInGroup}
          onRemovePhotoFromGroup={removePhotoFromGroup}
        />
      );
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white border-b shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Slideshow Generator</h1>
              <p className="text-sm text-gray-600">Create beautiful photo slideshows step by step</p>
            </div>
            <GoogleAuthButton onAuthChange={setCurrentUser} />
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl border shadow-sm p-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-100 text-teal-700 mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">What this app does</h2>
            <p className="text-gray-700 mt-3 leading-7">
              Slideshow Generator helps schools and teams quickly create photo slideshows.
              Upload photos into groups (such as class sessions), choose transitions,
              background music, and branding options, then generate and save a final slideshow video.
            </p>
            <p className="text-gray-700 mt-4 leading-7">
              You can store slideshow data in a database, keep uploaded media in secure S3 storage,
              and share tokenized upload links so others can send photos to a specific slideshow and group.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <GoogleAuthButton onAuthChange={setCurrentUser} />
              <a
                href="/privacy"
                className="text-sm font-medium text-teal-700 hover:text-teal-800 underline"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="text-sm font-medium text-teal-700 hover:text-teal-800 underline"
              >
                Terms and Conditions
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleNewSlideshow}
                className="p-2 bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors cursor-pointer"
                title="Start a new slideshow from scratch"
              >
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <rect x="1" y="2" width="2" height="18" rx="1" fill="currentColor"/>
                  <rect x="21" y="2" width="2" height="18" rx="1" fill="currentColor"/>
                  <rect x="4" y="2" width="1" height="18" rx="0.5" fill="currentColor"/>
                  <rect x="19" y="2" width="1" height="18" rx="0.5" fill="currentColor"/>
                  <circle cx="12" cy="8" r="1.5" fill="currentColor"/>
                  <path d="M6 14l3-3 2 2 4-4 3 3v2H6v-2z" fill="currentColor"/>
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Slideshow Generator</h1>
                <p className="text-xs text-teal-700 mt-0.5">
                  Working on: <span className="font-semibold">{loadedSlideshowLabel || slideshowName}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <GoogleAuthButton
                onAuthChange={setCurrentUser}
                onShowSettings={() => setShowSettings(true)}
                onShowSlideshowManager={() => setShowSlideshowManager(true)}
                onCreateUploadLink={handleCreateUploadLink}
              />
            </div>
          </div>
        </div>
      </header>

      {recoverablePhotoCount > 0 && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-amber-900">
              {recoverablePhotoCount} photo{recoverablePhotoCount === 1 ? '' : 's'} from this slideshow
              are still in storage but missing from the editor.
            </p>
            <button
              type="button"
              onClick={handleRestorePhotos}
              disabled={isRestoringPhotos}
              className="shrink-0 px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {isRestoringPhotos ? 'Restoring…' : 'Restore Photos'}
            </button>
          </div>
        </div>
      )}

      {/* Wizard Progress */}
      <WizardProgress
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepTitles={getStepTitles()}
        completedSteps={getCompletedSteps()}
        onStepClick={handleStepClick}
      />

      {/* Main Content */}
      <main className="min-h-0">
        {renderCurrentStep()}
      </main>

      {/* Navigation */}
      <WizardNavigation
        currentStep={currentStep}
        totalSteps={totalSteps}
        canProceed={canProceedFromCurrentStep()}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onGenerate={generateVideo}
        isLastStep={currentStep === totalSteps - 1}
      />

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          classes={classes}
          onUpdateClasses={handleClassesUpdate}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showSlideshowManager && (
        <SlideshowManager
          currentSlideshow={{
            classData,
            selectedMusic,
            backgroundOption,
            selectedTransition,
            classes,
            slideDuration,
            slideshowName,
          }}
          onLoadSlideshow={handleLoadSlideshow}
          onClose={() => setShowSlideshowManager(false)}
        />
      )}

      {showVideoGenerator && (
        <VideoGenerator
          classData={classData}
          classes={classes}
          selectedMusic={selectedMusic}
          backgroundOption={backgroundOption}
          selectedTransition={selectedTransition}
          slideDuration={slideDuration}
          slideshowName={slideshowName}
          onClose={() => setShowVideoGenerator(false)}
        />
      )}
    </div>
  );
}

export default App;