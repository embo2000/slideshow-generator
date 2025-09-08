declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export interface GooglePhoto {
  url: string;
  filename?: string;
}

class GooglePhotosService {
  private oauthToken: string | null = null;

  // Initialize the API and sign in the user
  async init(developerKey: string, clientId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      window.gapi.load('client:auth2', async () => {
        try {
          await window.gapi.client.init({
            apiKey: developerKey,
            clientId: clientId,
            scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
            discoveryDocs: ['https://photoslibrary.googleapis.com/$discovery/rest?version=v1'],
          });

          const authInstance = window.gapi.auth2.getAuthInstance();
          if (!authInstance.isSignedIn.get()) {
            const user = await authInstance.signIn();
            this.oauthToken = user.getAuthResponse().access_token;
          } else {
            this.oauthToken = authInstance.currentUser.get().getAuthResponse().access_token;
          }

          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  // Opens the Google Photos Picker UI
  openPicker(
    developerKey: string,
    maxPhotos: number = 10
  ): Promise<GooglePhoto[]> {
    return new Promise((resolve, reject) => {
      if (!this.oauthToken) {
        return reject(new Error('User is not signed in'));
      }

      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.PHOTOS)
        .setOAuthToken(this.oauthToken)
        .setDeveloperKey(developerKey)
        .setSelectableMimeTypes('image/png,image/jpeg')
        .setMaxItems(maxPhotos)
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const photos: GooglePhoto[] = data.docs.map((doc: any) => ({
              url: doc.url,
              filename: doc.name || undefined,
            }));
            resolve(photos);
          } else if (data.action === window.google.picker.Action.CANCEL) {
            resolve([]);
          }
        })
        .build();

      picker.setVisible(true);
    });
  }
}

export const googlePhotosService = new GooglePhotosService();
