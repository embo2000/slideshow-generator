export interface GooglePhotoPickerResult {
  id: string;
  baseUrl: string;
  mimeType: string;
  filename: string;
}

class GooglePhotosService {
  private pickerScriptLoaded = false;

  /** Load the Google Photos Picker script dynamically */
  loadPickerScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.pickerScriptLoaded) return resolve();

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.pickerScriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google Photos Picker script.'));
      document.body.appendChild(script);
    });
  }

  /** Open the new Photos Picker API */
  async openPicker(accessToken: string, pageSize = 50): Promise<GooglePhotoPickerResult[]> {
    await this.loadPickerScript();

    if (!(window as any).google) {
      throw new Error('Google API not loaded.');
    }

    return new Promise<GooglePhotoPickerResult[]>((resolve, reject) => {
      const pickerConfig = {
        container: document.body,
        token: accessToken,
        limit: pageSize,
        callback: (selection: any) => {
          if (selection && selection.mediaItems) {
            const results: GooglePhotoPickerResult[] = selection.mediaItems.map((item: any) => ({
              id: item.id,
              baseUrl: item.baseUrl,
              mimeType: item.mimeType,
              filename: item.filename,
            }));
            resolve(results);
          } else {
            resolve([]);
          }
        },
      };

      try {
        // @ts-ignore
        const picker = new (window as any).GooglePhotosPicker(pickerConfig);
        picker.open();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const googlePhotosService = new GooglePhotosService();
