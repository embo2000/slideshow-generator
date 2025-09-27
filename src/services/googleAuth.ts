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
  refresh_token?: string;
}

interface TokenInfo {
  access_token: string;
  expires_at: number;
  refresh_token?: string;
}

class GoogleAuthService {
  private clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  private scopes =
    'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

  private tokenClient: any = null;
  private isInitialized = false;
  private refreshTimer: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.clientId) {
      throw new Error(
        'Google API credentials not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.'
      );
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Google Sign-In script failed to load within 10 seconds'));
      }, 10000);

      const gsiScript = document.createElement('script');
      gsiScript.src = 'https://accounts.google.com/gsi/client';
      gsiScript.onload = () => {
        this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: this.scopes,
          callback: () => {}, // will be set per request
          prompt: '', // Don't force consent screen every time
        });
        this.isInitialized = true;
        
        // Check if we have a valid stored token and set up refresh
        this.checkStoredToken();
        
        clearTimeout(timeout);
        resolve();
      };
      gsiScript.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load Google Sign-In script'));
      };
      document.head.appendChild(gsiScript);
    });
  }

  private checkStoredToken(): void {
    const tokenData = localStorage.getItem('google_token_info');
    if (tokenData) {
      try {
        const tokenInfo: TokenInfo = JSON.parse(tokenData);
        const now = Date.now();
        
        if (tokenInfo.expires_at > now + 300000) { // Token valid for more than 5 minutes
          // Token is still valid, set up refresh timer
          this.scheduleTokenRefresh(tokenInfo.expires_at - now - 300000); // Refresh 5 minutes before expiry
        } else {
          // Token expired or about to expire, try to refresh
          this.refreshTokenIfNeeded();
        }
      } catch (error) {
        console.error('Error parsing stored token:', error);
        localStorage.removeItem('google_token_info');
      }
    }
  }

  private scheduleTokenRefresh(delayMs: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    this.refreshTimer = setTimeout(() => {
      this.refreshTokenIfNeeded();
    }, Math.max(delayMs, 60000)); // At least 1 minute delay
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    const tokenData = localStorage.getItem('google_token_info');
    if (!tokenData) return;

    try {
      const tokenInfo: TokenInfo = JSON.parse(tokenData);
      const now = Date.now();
      
      if (tokenInfo.expires_at <= now + 300000) { // Less than 5 minutes left
        console.log('Token needs refresh, requesting new token...');
        
        // Request a new token silently
        if (this.tokenClient) {
          this.tokenClient.callback = (response: GoogleAuthResponse) => {
            if (!(response as any).error) {
              this.handleTokenResponse(response);
            } else {
              console.error('Token refresh failed:', response);
              // Token refresh failed, user will need to sign in again
              this.signOut();
            }
          };
          
          // Request token without showing consent screen
          this.tokenClient.requestAccessToken({ prompt: '' });
        }
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  }

  private handleTokenResponse(response: GoogleAuthResponse): void {
    const expiresAt = Date.now() + (response.expires_in * 1000);
    const tokenInfo: TokenInfo = {
      access_token: response.access_token,
      expires_at: expiresAt,
      refresh_token: response.refresh_token
    };
    
    localStorage.setItem('google_access_token', response.access_token);
    localStorage.setItem('google_token_info', JSON.stringify(tokenInfo));
    
    // Schedule next refresh 5 minutes before expiry
    this.scheduleTokenRefresh(response.expires_in * 1000 - 300000);
    
    console.log('Token refreshed successfully, expires at:', new Date(expiresAt));
  }

  async signIn(): Promise<GoogleUser> {
    if (!this.isInitialized || !this.tokenClient) {
      throw new Error('Google Auth service not initialized. Please wait for initialization to complete.');
    }

    return new Promise((resolve, reject) => {
      this.tokenClient.callback = async (response: GoogleAuthResponse) => {
        if ((response as any).error) {
          reject(response);
          return;
        }

        // Handle the token response
        this.handleTokenResponse(response);

        try {
          // Call Google UserInfo endpoint directly
          const userResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
            headers: { Authorization: `Bearer ${response.access_token}` },
          });
          const userData = await userResponse.json();

          const user: GoogleUser = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            picture: userData.picture,
          };

          localStorage.setItem('google_user', JSON.stringify(user));

          resolve(user);
        } catch (err) {
          reject(err);
        }
      };

      // For initial sign-in, we might need consent
      this.tokenClient.requestAccessToken({ 
        prompt: this.getCurrentUser() ? '' : 'select_account' 
      });
    });
  }

  async signOut(): Promise<void> {
    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    const token = localStorage.getItem('google_access_token');
    if (token) {
      try {
        (window as any).google.accounts.oauth2.revoke(token);
      } catch (error) {
        console.error('Error revoking token:', error);
      }
    }
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_info');
    localStorage.removeItem('google_user');
  }

  getCurrentUser(): GoogleUser | null {
    const userData = localStorage.getItem('google_user');
    return userData ? JSON.parse(userData) : null;
  }

  isSignedIn(): boolean {
    const token = localStorage.getItem('google_access_token');
    const tokenInfo = localStorage.getItem('google_token_info');
    
    if (!token || !tokenInfo) return false;
    
    try {
      const info: TokenInfo = JSON.parse(tokenInfo);
      return info.expires_at > Date.now();
    } catch {
      return false;
    }
  }

  getAccessToken(): string | null {
    const tokenInfo = localStorage.getItem('google_token_info');
    if (!tokenInfo) return null;
    
    try {
      const info: TokenInfo = JSON.parse(tokenInfo);
      if (info.expires_at > Date.now()) {
        return info.access_token;
      }
    } catch {
      return null;
    }
    
    return null;
  }
}

export const googleAuthService = new GoogleAuthService();
export type { GoogleUser };
