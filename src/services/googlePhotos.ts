interface GooglePickerPhoto {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  mimeType: string;
}

class GooglePhotosPickerService {
  private pickerApiLoaded = false;
  private gapi: any = null;

  async initialize(): Promise<void> {
    if (this.pickerApiLoaded) return;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Google APIs failed to load within 15 seconds'));
      }, 15000);

      // Load Google APIs
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        (window as any).gapi.load('auth2:picker', {
          callback: () => {
            this.gapi = (window as any).gapi;
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
    if (!this.pickerApiLoaded || !this.gapi) {
      await this.initialize();
    }

    // Get OAuth token
    const token = localStorage.getItem('google_access_token');
    if (!token) {
      throw new Error('Not signed in to Google');
    }

    return new Promise((resolve, reject) => {
      try {
        const picker = new this.gapi.picker.PickerBuilder()
          .enableFeature(this.gapi.picker.Feature.MULTISELECT_ENABLED)
          .setOAuthToken(token)
          .addView(this.gapi.picker.ViewId.PHOTOS)
          .addView(new this.gapi.picker.PhotosView()
            .setType(this.gapi.picker.PhotosView.Type.UPLOADED))
          .setCallback(async (data: any) => {
            if (data.action === this.gapi.picker.Action.PICKED) {
              try {
                const files = await this.downloadSelectedPhotos(data.docs);
                resolve(files);
              } catch (error) {
                reject(error);
              }
            } else if (data.action === this.gapi.picker.Action.CANCEL) {
              resolve([]);
            }
          })
          .build();

        picker.setVisible(true);
      } catch (error) {
        reject(new Error('Failed to create Google Photos picker'));
      }
    });
  }

  private async downloadSelectedPhotos(docs: any[]): Promise<File[]> {
    const files: File[] = [];
    
    for (const doc of docs) {
      try {
        // For Google Photos, we need to use the thumbnailUrl or url
        const imageUrl = doc.thumbnails?.[doc.thumbnails.length - 1]?.url || doc.url;
        
        if (!imageUrl) {
          console.warn(`No URL available for photo: ${doc.name}`);
          continue;
        }

        // Fetch the image with proper headers
        const response = await fetch(imageUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('google_access_token')}`,
          },
        });
        
        if (!response.ok) {
          console.warn(`Failed to download photo: ${doc.name} (${response.status})`);
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