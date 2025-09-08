interface GooglePickerPhoto {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  mimeType: string;
}

class GooglePhotosPickerService {
  private pickerApiLoaded = false;
  private oauthToken: string | null = null;

  async initialize(): Promise<void> {
    if (this.pickerApiLoaded) return;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Google Picker API failed to load within 10 seconds'));
      }, 10000);

      // Load Google Picker API
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        (window as any).gapi.load('picker', {
          callback: () => {
            this.pickerApiLoaded = true;
            clearTimeout(timeout);
            resolve();
          },
          onerror: () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load Google Picker API'));
          }
        });
      };
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load Google API script'));
      };
      document.head.appendChild(script);
    });
  }

  async openPhotoPicker(): Promise<File[]> {
    if (!this.pickerApiLoaded) {
      await this.initialize();
    }

    // Get OAuth token
    const token = localStorage.getItem('google_access_token');
    if (!token) {
      throw new Error('Not signed in to Google');
    }

    return new Promise((resolve, reject) => {
      const picker = new (window as any).google.picker.PickerBuilder()
        .enableFeature((window as any).google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(token)
        .addView((window as any).google.picker.ViewId.PHOTOS)
        .addView(new (window as any).google.picker.PhotosView()
          .setType((window as any).google.picker.PhotosView.Type.UPLOADED))
        .setCallback(async (data: any) => {
          if (data.action === (window as any).google.picker.Action.PICKED) {
            try {
              const files = await this.downloadSelectedPhotos(data.docs);
              resolve(files);
            } catch (error) {
              reject(error);
            }
          } else if (data.action === (window as any).google.picker.Action.CANCEL) {
            resolve([]);
          }
        })
        .build();

      picker.setVisible(true);
    });
  }

  private async downloadSelectedPhotos(docs: any[]): Promise<File[]> {
    const files: File[] = [];
    
    for (const doc of docs) {
      try {
        // Get the download URL for the photo
        const downloadUrl = doc.url;
        
        // Fetch the image
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          console.warn(`Failed to download photo: ${doc.name}`);
          continue;
        }

        const blob = await response.blob();
        const file = new File([blob], doc.name || 'photo.jpg', { 
          type: doc.mimeType || 'image/jpeg' 
        });
        
        files.push(file);
      } catch (error) {
        console.warn(`Error downloading photo ${doc.name}:`, error);
      }
    }

    return files;
  }
}

export const googlePhotosPickerService = new GooglePhotosPickerService();