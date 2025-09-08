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
  private scopes =
    'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/photospicker.mediaitems.readonly';

  private tokenClient: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.clientId) throw new Error('VITE_GOOGLE_CLIENT_ID not set');

    return new Promise((resolve, reject) => {
      const gsiScript = document.createElement('script');
      gsiScript.src = 'https://accounts.google.com/gsi/client';
      gsiScript.onload = () => {
        this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: this.scopes,
          callback: () => {}, // will be set per request
        });
        this.isInitialized = true;
        resolve();
      };
      gsiScript.onerror = () => reject(new Error('Failed to load Google Sign-In script'));
      document.head.appendChild(gsiScript);
    });
  }

  async signIn(): Promise<GoogleUser> {
    if (!this.isInitialized || !this.tokenClient)
      throw new Error('Google Auth service not initialized');

    return new Promise((resolve, reject) => {
      this.tokenClient.callback = async (response: GoogleAuthResponse) => {
        if ((response as any).error) return reject(response);

        const accessToken = response.access_token;

        try {
          const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const userData = await userResp.json();

          const user: GoogleUser = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            picture: userData.picture,
          };

          localStorage.setItem('google_access_token', accessToken);
          localStorage.setItem('google_user', JSON.stringify(user));

          resolve(user);
        } catch (err) {
          reject(err);
        }
      };

      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  async signOut(): Promise<void> {
    const token = localStorage.getItem('google_access_token');
    if (token) (window as any).google.accounts.oauth2.revoke(token);

    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_user');
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
