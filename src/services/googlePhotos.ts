import { googleAuthService } from './googleAuth';

export interface GooglePhoto {
  id: string;
  baseUrl: string;
  filename: string;
  mimeType: string;
  mediaMetadata: {
    width: string;
    height: string;
    creationTime: string;
  };
}

export interface GooglePhotosAlbum {
  id: string;
  title: string;
  productUrl: string;
  mediaItemsCount: string;
  coverPhotoBaseUrl?: string;
}

class GooglePhotosService {
  private async getToken(): Promise<string> {
    const token = googleAuthService.getAccessToken();
    if (!token) {
      throw new Error('Not signed in');
    }
    return token;
  }

  private async fetchWithTokenRetry(input: RequestInfo, init?: RequestInit): Promise<any> {
    try {
      const token = await this.getToken();
      const headers = { ...init?.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const response = await fetch(input, { ...init, headers });

      if (response.status === 403) {
        // Token likely missing scopes; refresh
        await googleAuthService.signIn();
        const newToken = await this.getToken();
        const retryHeaders = { ...init?.headers, Authorization: `Bearer ${newToken}`, 'Content-Type': 'application/json' };
        const retryResponse = await fetch(input, { ...init, headers: retryHeaders });

        if (!retryResponse.ok) {
          const errText = await retryResponse.text();
          throw new Error(`Failed after token refresh: ${retryResponse.status} ${errText}`);
        }
        return retryResponse.json();
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Request failed: ${response.status} ${errText}`);
      }

      return response.json();
    } catch (err) {
      throw err;
    }
  }

  async getAlbums(): Promise<GooglePhotosAlbum[]> {
    const data = await this.fetchWithTokenRetry('https://photoslibrary.googleapis.com/v1/albums?pageSize=50');
    return data.albums || [];
  }

  async getPhotosFromAlbum(
    albumId: string,
    pageToken?: string
  ): Promise<{ photos: GooglePhoto[]; nextPageToken?: string }> {
    const body: any = { albumId, pageSize: 50 };
    if (pageToken) body.pageToken = pageToken;

    const data = await this.fetchWithTokenRetry('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      photos: data.mediaItems || [],
      nextPageToken: data.nextPageToken,
    };
  }

  async getAllPhotos(pageToken?: string): Promise<{ photos: GooglePhoto[]; nextPageToken?: string }> {
    const url = new URL('https://photoslibrary.googleapis.com/v1/mediaItems');
    url.searchParams.set('pageSize', '50');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const data = await this.fetchWithTokenRetry(url.toString());
    return {
      photos: data.mediaItems || [],
      nextPageToken: data.nextPageToken,
    };
  }

  async downloadPhoto(photo: GooglePhoto): Promise<File> {
    // Use original dimensions
    const downloadUrl = `${photo.baseUrl}=w${photo.mediaMetadata.width}-h${photo.mediaMetadata.height}`;
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error(`Failed to download photo: ${response.status}`);
    }

    const blob = await response.blob();
    return new File([blob], photo.filename, { type: photo.mimeType });
  }
}

export const googlePhotosService = new GooglePhotosService();
