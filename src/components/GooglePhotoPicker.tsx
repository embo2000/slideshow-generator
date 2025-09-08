import React, { useEffect, useState } from 'react';

interface MediaItem {
  id: string;
  baseUrl: string;
  filename: string;
  mimeType: string;
}

interface GooglePhotoPickerProps {
  onSelect: (items: MediaItem[]) => void;
  clientId: string;
}

declare const gapi: any;

const GooglePhotoPicker: React.FC<GooglePhotoPickerProps> = ({ onSelect, clientId }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Load gapi script dynamically
  const loadGapi = () =>
    new Promise<void>((resolve, reject) => {
      if (window.gapi) return resolve();
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject('Failed to load gapi');
      document.body.appendChild(script);
    });

  // Initialize gapi client and auth
  const initGapiClient = async () => {
    await gapi.load('client:auth2', async () => {
      await gapi.client.init({
        clientId,
        scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
        discoveryDocs: ['https://photoslibrary.googleapis.com/$discovery/rest?version=v1'],
      });

      const authInstance = gapi.auth2.getAuthInstance();
      setIsSignedIn(authInstance.isSignedIn.get());

      authInstance.isSignedIn.listen((signedIn: boolean) => {
        setIsSignedIn(signedIn);
      });
    });
  };

  useEffect(() => {
    loadGapi().then(initGapiClient).catch(console.error);
  }, []);

  const signIn = async () => {
    const authInstance = gapi.auth2.getAuthInstance();
    await authInstance.signIn();
  };

  const signOut = async () => {
    const authInstance = gapi.auth2.getAuthInstance();
    await authInstance.signOut();
  };

  const openPicker = async () => {
    if (!isSignedIn) {
      await signIn();
    }

    const token = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;

    // Fetch first 50 media items
    const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=50', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    const items: MediaItem[] = (data.mediaItems || []).map((item: any) => ({
      id: item.id,
      baseUrl: item.baseUrl,
      filename: item.filename,
      mimeType: item.mimeType,
    }));

    onSelect(items);
  };

  return (
    <div className="flex space-x-2">
      {isSignedIn ? (
        <>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={openPicker}
          >
            Pick Photos
          </button>
          <button
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded"
            onClick={signOut}
          >
            Sign Out
          </button>
        </>
      ) : (
        <button
          className="px-4 py-2 bg-green-600 text-white rounded"
          onClick={signIn}
        >
          Sign in with Google
        </button>
      )}
    </div>
  );
};

export default GooglePhotoPicker;
