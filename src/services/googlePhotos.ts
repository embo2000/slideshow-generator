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
    if (!token) throw new Error('Not signed in');
    return token;
  }

  async getAlbums(pageSize = 50, pageToken?: string): Promise<{ albums: GooglePhotosAlbum[]; nextPageToken?: string }> {
    const token = await this.getToken();

    const url = new URL('https://photoslibrary.googleapis.com/v1/albums');
    url.searchParams.set('pageSize', pageSize.toString());
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch albums: ${res.status}`);
    }

    const data = await res.json();
    return { albums: data.albums || [], nextPageToken: data.nextPageToken };
  }

  async getPhotosFromAlbum(
    albumId: string,
    pageSize = 50,
    pageToken?: string
  ): Promise<{ photos: GooglePhoto[]; nextPageToken?: string }> {
    const token = await this.getToken();

    const body: any = { albumId, pageSize };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch photos: ${res.status}`);
    }

    const data = await res.json();
    return { photos: data.mediaItems || [], nextPageToken: data.nextPageToken };
  }

  async getAllPhotos(pageSize = 50, pageToken?: string): Promise<{ photos: GooglePhoto[]; nextPageToken?: string }> {
    const token = await this.getToken();

    const url = new URL('https://photoslibrary.googleapis.com/v1/mediaItems');
    url.searchParams.set('pageSize', pageSize.toString());
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch photos: ${res.status}`);
    }

    const data = await res.json();
    return { photos: data.mediaItems || [], nextPageToken: data.nextPageToken };
  }

  async downloadPhoto(photo: GooglePhoto): Promise<File> {
    const downloadUrl = `${photo.baseUrl}=w${photo.mediaMetadata.width}-h${photo.mediaMetadata.height}`;
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`Failed to download photo: ${res.status}`);

    const blob = await res.blob();
    return new File([blob], photo.filename, { type: photo.mimeType });
  }
}

export const googlePhotosService = new GooglePhotosService();
