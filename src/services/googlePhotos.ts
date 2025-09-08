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

async openPicker(accessToken: string, maxPhotos: number): Promise<GooglePhotoPickerResult[]> {
  if (!(window as any).google) {
    throw new Error('Google Picker API not loaded');
  }

  return new Promise((resolve) => {
    const view = new (window as any).google.picker.PhotosView()
      .setMimeTypes('image/jpeg,image/png,image/webp');

    const picker = new (window as any).google.picker.PickerBuilder()
      .setOAuthToken(accessToken)
      .setDeveloperKey(import.meta.env.VITE_GOOGLE_DEV_KEY)
      .setAppId(import.meta.env.VITE_GOOGLE_PROJECT_NUMBER)
      .addView(view)
      .setSelectableMimeTypes('image/jpeg,image/png,image/webp')
      .setOrigin(window.location.origin)
      .setCallback((data: any) => {
        if (data.action === (window as any).google.picker.Action.PICKED) {
          const result: GooglePhotoPickerResult[] = data.docs.slice(0, maxPhotos).map((doc: any) => ({
            id: doc.id,
            url: doc.url || doc.mediaUrl || doc.thumbnailUrl,
            name: doc.name || 'photo.jpg',
          }));
          resolve(result);
        } else if (data.action === (window as any).google.picker.Action.CANCEL) {
          resolve([]);
        }
      })
      .build();

    picker.setVisible(true);
  });
}

}

export const googlePhotosService = new GooglePhotosService();
