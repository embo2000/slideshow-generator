export interface GooglePhotoPickerResult {
  id: string;
  name: string;
  url: string;
  mimeType: string;
}

class GooglePhotosService {
  private pickerApiLoaded = false;

  async loadPickerApi(): Promise<void> {
    if (this.pickerApiLoaded) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        (window as any).gapi.load('picker', {
          callback: () => {
            this.pickerApiLoaded = true;
            resolve();
          },
          onerror: () => reject(new Error('Failed to load Google Picker API')),
        });
      };
      script.onerror = () => reject(new Error('Failed to load Google APIs script'));
      document.head.appendChild(script);
    });
  }

  async openPicker(oauthToken: string, maxPhotos = 5): Promise<GooglePhotoPickerResult[]> {
    await this.loadPickerApi();

    return new Promise((resolve) => {
      const view = new (window as any).google.picker.DocsView()
        .setIncludeFolders(false)
        .setMimeTypes('image/png,image/jpeg,image/jpg')
        .setSelectFolderEnabled(false);

      const picker = new (window as any).google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(oauthToken)
        .setCallback((data: any) => {
          if (data.action === (window as any).google.picker.Action.PICKED) {
            const docs = data.docs || [];
            const results: GooglePhotoPickerResult[] = docs.slice(0, maxPhotos).map((doc: any) => ({
              id: doc.id,
              name: doc.name,
              url: doc.url || doc.thumbnails?.[0]?.url,
              mimeType: doc.mimeType,
            }));
            resolve(results);
          } else {
            resolve([]);
          }
        })
        .build();

      picker.setVisible(true);
    });
  }
}

export const googlePhotosService = new GooglePhotosService();
