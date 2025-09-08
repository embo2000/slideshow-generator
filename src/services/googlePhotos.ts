export interface GooglePhotoPickerResult {
  id: string;
  url: string;
  name: string;
}

class GooglePhotosService {
  private pickerApiLoaded = false;

  loadPickerScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.pickerApiLoaded) return resolve();

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        (window as any).gapi.load('picker', () => {
          this.pickerApiLoaded = true;
          resolve();
        });
      };
      script.onerror = () => reject(new Error('Failed to load Google Picker API'));
      document.body.appendChild(script);
    });
  }

  openPicker(accessToken: string, maxPhotos: number): Promise<GooglePhotoPickerResult[]> {
    return new Promise((resolve, reject) => {
      if (!(window as any).google) {
        reject(new Error('Google Picker API not loaded'));
        return;
      }

      const view = new (window as any).google.picker.View((window as any).google.picker.ViewId.PHOTOS);
      view.setMimeTypes('image/jpeg,image/png,image/webp');

      const picker = new (window as any).google.picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .addView(view)
        .setDeveloperKey(import.meta.env.VITE_GOOGLE_DEV_KEY)
        .setSelectableMimeTypes('image/jpeg,image/png,image/webp')
        .setOrigin(window.location.origin)
        .setCallback((data: any) => {
          if (data.action === (window as any).google.picker.Action.PICKED) {
            const result: GooglePhotoPickerResult[] = data.docs.map((doc: any) => ({
              id: doc.id,
              url: doc.url || doc.thumbnailUrl,
              name: doc.name,
            }));
            resolve(result);
          } else if (data.action === (window as any).google.picker.Action.CANCEL) {
            resolve([]);
          }
        })
        .setSize({ width: 800, height: 600 })
        .build();

      picker.setVisible(true);
    });
  }
}

export const googlePhotosService = new GooglePhotosService();
