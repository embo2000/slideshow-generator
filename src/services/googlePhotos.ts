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
    if (!token) throw new Error('Not signed in or token missing');
    return token;
  }

  async getAlbums(): Promise<GooglePhotosAlbum[]> {
    const token = await this.getToken();

    const response = await fetch('https://photoslibrary.googleapis.com/v1/albums?pageSize=50', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch albums: ${response.status}`);
    }

    const data = await response.json();
    return data.albums || [];
  }

  async getPhotosFromAlbum(
    albumId: string,
    pageToken?: string
  ): Promise<{ photos: GooglePhoto[]; nextPageToken?: string }> {
    const token = await this.getToken();

    const body: any = { albumId, pageSize: 50 };
    if (pageToken) body.pageToken = pageToken;

    const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch photos: ${response.status}`);
    }

    const data = await response.json();
    return { photos: data.mediaItems || [], nextPageToken: data.nextPageToken };
  }

  async downloadPhoto(photo: GooglePhoto): Promise<File> {
    const downloadUrl = `${photo.baseUrl}=w${photo.mediaMetadata.width}-h${photo.mediaMetadata.height}`;
    const resp = await fetch(downloadUrl);
    if (!resp.ok) throw new Error('Failed to download photo');

    const blob = await resp.blob();
    return new File([blob], photo.filename, { type: photo.mimeType });
  }
}

export const googlePhotosService = new GooglePhotosService();
