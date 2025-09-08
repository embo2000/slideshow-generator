export interface GooglePhotoPickerResult {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  type: 'IMAGE' | 'VIDEO';
}

declare global {
  interface Window {
    GooglePhotosPicker: any;
  }
}

class GooglePhotosService {
  private pickerScriptLoaded = false;

  // Load the new Picker script
  loadPickerScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.pickerScriptLoaded) return resolve();

      const script = document.createElement('script');
      script.src = 'https://photoslibrary.googleapis.com/photospicker/v1/js';
      script.onload = () => {
        this.pickerScriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google Photos Picker script'));
      document.body.appendChild(script);
    });
  }

  // Open the Google Photos Picker
  openPicker(
    accessToken: string,
    sessionData: any, // obtained from your backend via /get_session
    maxSelectable = 50
  ): Promise<GooglePhotoPickerResult[]> {
    return new Promise(async (resolve, reject) => {
      if (!window.GooglePhotosPicker) {
        reject(new Error('GooglePhotosPicker is not available on window'));
        return;
      }

      try {
        const picker = window.GooglePhotosPicker({
          developerKey: import.meta.env.VITE_GOOGLE_DEV_KEY,
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          token: accessToken,
          session: sessionData,
          maxSelectable,
          view: 'ALBUMS', // or 'MEDIA_ITEMS', 'SHARED_ALBUMS' depending on what you want
          callback: (result: any) => {
            if (result && result.mediaItems) {
              const mapped: GooglePhotoPickerResult[] = result.mediaItems.map((item: any) => ({
                id: item.id,
                url: item.baseUrl, // you can append =w128-h128 for thumbnail sizing
                name: item.filename,
                mimeType: item.mimeType,
                type: item.mediaType, // IMAGE or VIDEO
              }));
              resolve(mapped);
            } else {
              resolve([]);
            }
          },
        });

        picker.open();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const googlePhotosService = new GooglePhotosService();
