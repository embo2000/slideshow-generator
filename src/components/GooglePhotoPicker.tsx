import React, { useEffect } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { googleAuthService } from '../services/googleAuth';

interface GooglePhotoPickerProps {
  onPhotosSelected: (files: File[]) => void;
  onClose: () => void;
  maxPhotos?: number;
}

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const GooglePhotoPicker: React.FC<GooglePhotoPickerProps> = ({
  onPhotosSelected,
  onClose,
  maxPhotos = 5,
}) => {
  useEffect(() => {
    if (!googleAuthService.isSignedIn()) return;

    const openPicker = async () => {
      const accessToken = googleAuthService.getAccessToken();
      if (!accessToken) {
        alert('User not signed in.');
        return;
      }

      // Load the Picker API
      const pickerApiLoaded = new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          window.gapi.load('picker', () => resolve());
        };
        document.body.appendChild(script);
      });

      await pickerApiLoaded;

      const picker = new window.google.picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .addView(window.google.picker.ViewId.PHOTOS)
        .setSelectableMimeTypes('image/jpeg,image/png')
        .setMaxItems(maxPhotos)
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const docs = data.docs || [];
            try {
              const files: File[] = await Promise.all(
                docs.map(async (doc: any) => {
                  const url = doc.url || doc.baseUrl || doc.originalUrl;
                  const response = await fetch(url, {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  });
                  if (!response.ok) throw new Error(`Failed to fetch image: ${doc.name}`);
                  const blob = await response.blob();
                  return new File([blob], doc.name, { type: blob.type });
                })
              );

              onPhotosSelected(files);
              onClose();
            } catch (err) {
              console.error('Failed to download selected images:', err);
              alert('Failed to download selected images. Please try again.');
            }
          } else if (data.action === window.google.picker.Action.CANCEL) {
            onClose();
          }
        })
        .build();

      picker.setVisible(true);
    };

    openPicker();
  }, [maxPhotos, onClose, onPhotosSelected]);

  // Fallback UI if not signed in
  if (!googleAuthService.isSignedIn()) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
          <div className="text-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h2>
            <p className="text-gray-600 mb-4">
              Please sign in with your Google account to access Google Photos.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null; // Picker opens automatically; no UI needed
};

export default GooglePhotoPicker;
