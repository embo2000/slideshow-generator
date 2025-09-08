interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture: string;
}

interface GoogleAuthResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

class GoogleAuthService {
  private clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  private apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  private discoveryDocs = [
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    'https://www.googleapis.com/discovery/v1/apis/oauth2/v2/rest'
  ];
  private scopes = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
  
  private gapi: any = null;
  private tokenClient: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Check if required environment variables are present
    if (!this.clientId || !this.apiKey) {
      throw new Error('Google API credentials not configured. Please set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY in your .env file.');
    }

    return new Promise((resolve, reject) => {
      // Set a timeout for script loading
      const timeout = setTimeout(() => {
        reject(new Error('Google API scripts failed to load within 10 seconds'));
      }, 10000);

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = async () => {
        try {
          await this.loadGapi();
          
          const gsiScript = document.createElement('script');
          gsiScript.src = 'https://accounts.google.com/gsi/client';
          gsiScript.onload = async () => {
            try {
              await this.initializeGapi();
              this.isInitialized = true;
              clearTimeout(timeout);
              resolve();
            } catch (error) {
              clearTimeout(timeout);
              reject(error);
            }
          };
          gsiScript.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load Google Sign-In script'));
          };
          document.head.appendChild(gsiScript);
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load Google API script'));
      };
      document.head.appendChild(script);
    });
  }

  private async loadGapi(): Promise<void> {
    return new Promise((resolve) => {
      (window as any).gapi.load('client', resolve);
    });
  }

  private async initializeGapi(): Promise<void> {
    this.gapi = (window as any).gapi;
    
    try {
      await this.gapi.client.init({
        apiKey: this.apiKey,
        discoveryDocs: this.discoveryDocs,
      });
    } catch (error) {
      throw new Error('Google APIs not properly enabled. Please enable Google Drive API and Google+ API in your Google Cloud Console project, then restart the development server.');
    }

    this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: this.scopes,
      callback: '', // Will be set per request
    });
  }

  async signIn(): Promise<GoogleUser> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.tokenClient.callback = async (response: GoogleAuthResponse) => {
        if (response.error !== undefined) {
          reject(response);
          return;
        }

        // Set the access token
        this.gapi.client.setToken({ access_token: response.access_token });

        try {
          // Get user info
          const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${response.access_token}`,
            },
          });
          
          const userData = await userResponse.json();
          
          const user: GoogleUser = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            picture: userData.picture,
          };

          // Store token for later use
          localStorage.setItem('google_access_token', response.access_token);
          localStorage.setItem('google_user', JSON.stringify(user));
          
          resolve(user);
        } catch (error) {
          reject(error);
        }
      };

      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  async signOut(): Promise<void> {
    const token = localStorage.getItem('google_access_token');
    if (token) {
      (window as any).google.accounts.oauth2.revoke(token);
    }
    
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_user');
    
    if (this.gapi?.client) {
      this.gapi.client.setToken(null);
    }
  }

  getCurrentUser(): GoogleUser | null {
    const userData = localStorage.getItem('google_user');
    return userData ? JSON.parse(userData) : null;
  }

  isSignedIn(): boolean {
    return !!localStorage.getItem('google_access_token');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('google_access_token');
  }
}

export const googleAuthService = new GoogleAuthService();
export type { GoogleUser };