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

export interface GoogleAlbum {
  id: string;
  title: string;
  productUrl: string;
  mediaItemsCount: string;
  coverPhotoBaseUrl?: string;
  coverPhotoMediaItemId?: string;
}

class GooglePhotosService {
  private async getToken(): Promise<string> {
    const token = googleAuthService.getAccessToken();
    if (!token) throw new Error('Not signed in');
    return token;
  }

  async getAlbums(): Promise<GoogleAlbum[]> {
    const token = await this.getToken();
    
    const response = await fetch('https://photoslibrary.googleapis.com/v1/albums', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch albums: ${response.status}`);
    }

    const data = await response.json();
    return data.albums || [];
  }

  async getPhotos(albumId?: string, pageToken?: string): Promise<{
    photos: GooglePhoto[];
    nextPageToken?: string;
  }> {
    const token = await this.getToken();
    
    let url = 'https://photoslibrary.googleapis.com/v1/mediaItems';
    const params = new URLSearchParams();
    
    if (pageToken) {
      params.append('pageToken', pageToken);
    }
    
    params.append('pageSize', '50');
    
    if (albumId) {
      // For album-specific photos, we need to use the search endpoint
      url = 'https://photoslibrary.googleapis.com/v1/mediaItems:search';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          albumId,
          pageSize: 50,
          pageToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch album photos: ${response.status}`);
      }

      const data = await response.json();
      return {
        photos: data.mediaItems || [],
        nextPageToken: data.nextPageToken,
      };
    } else {
      // For all photos
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch photos: ${response.status}`);
      }

      const data = await response.json();
      return {
        photos: data.mediaItems || [],
        nextPageToken: data.nextPageToken,
      };
    }
  }

  async searchPhotos(query: string): Promise<GooglePhoto[]> {
    const token = await this.getToken();
    
    const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters: {
          contentFilter: {
            includedContentCategories: ['NONE']
          }
        },
        pageSize: 50,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to search photos: ${response.status}`);
    }

    const data = await response.json();
    const allPhotos = data.mediaItems || [];
    
    // Filter by filename on client side since API doesn't support filename search
    return allPhotos.filter((photo: GooglePhoto) => 
      photo.filename.toLowerCase().includes(query.toLowerCase())
    );
  }

  async downloadPhoto(photo: GooglePhoto): Promise<File> {
    // Add download parameters to get full resolution
    const downloadUrl = `${photo.baseUrl}=d`;
    
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download photo: ${response.status}`);
    }

    const blob = await response.blob();
    return new File([blob], photo.filename, { type: photo.mimeType });
  }

  getThumbnailUrl(photo: GooglePhoto, size: number = 200): string {
    return `${photo.baseUrl}=w${size}-h${size}-c`;
  }
}

export const googlePhotosService = new GooglePhotosService();