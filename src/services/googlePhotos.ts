export interface GooglePhotoPickerResult {
  id: string;
  url: string;
  name: string;
  mimeType: string;
}

class GooglePhotosService {
  /**
   * Opens the Google Photos Picker.
   * @param accessToken - Google OAuth2 access token
   * @param maxSelectable - Maximum number of photos user can select
   */
  async openPicker(accessToken: string, maxSelectable: number): Promise<GooglePhotoPickerResult[]> {
    return new Promise((resolve, reject) => {
      if (!(window as any).google || !(window as any).google.picker) {
        reject(new Error('Google Picker API is not loaded'));
        return;
      }

      const view = new (window as any).google.picker.View((window as any).google.picker.ViewId.PHOTOS);
      view.setMimeTypes('image/png,image/jpeg,image/jpg');
      view.setEnableDrives(true);

      const picker = new (window as any).google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setSelectableMimeTypes('image/png,image/jpeg,image/jpg')
        .setMultiselect(maxSelectable > 1)
        .setDeveloperKey(import.meta.env.VITE_GOOGLE_DEV_KEY)
        .setCallback((data: any) => {
          if (data.action === (window as any).google.picker.Action.PICKED) {
            const photos: GooglePhotoPickerResult[] = data.docs.map((doc: any) => ({
              id: doc.id,
              url: doc.url,
              name: doc.name,
              mimeType: doc.mimeType,
            }));
            resolve(photos);
          } else if (data.action === (window as any).google.picker.Action.CANCEL) {
            resolve([]);
          }
        })
        .build();

      picker.setVisible(true);
    });
  }

  /**
   * Loads the Google Picker API script dynamically.
   */
  loadPickerScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google?.picker) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        (window as any).google.load('picker', { callback: resolve });
      };
      script.onerror = () => reject(new Error('Failed to load Google Picker script'));
      document.head.appendChild(script);
    });
  }
}

export const googlePhotosService = new GooglePhotosService();
