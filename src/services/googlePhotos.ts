export interface GooglePhotoPickerResult {
  id: string;
  baseUrl: string;
  filename?: string;
  mimeType?: string;
  type: 'PHOTO' | 'VIDEO';
}

class GooglePhotosService {
  // Get a new session URL from the server
  async getSessionUrl(): Promise<string> {
    const res = await fetch('/new_session', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to get Google Photos session');
    const data = await res.json();
    return data.url; // session URL returned by your server
  }

  // Poll the server for selected media items
  async pollSelectedMedia(): Promise<GooglePhotoPickerResult[]> {
    const res = await fetch('/get_session', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to get selected media');
    const data = await res.json();

    if (!data.mediaItemsSet) return []; // no selection yet

    return data.mediaItemsSet.map((item: any) => ({
      id: item.id,
      baseUrl: item.baseUrl,
      filename: item.filename,
      mimeType: item.mimeType,
      type: item.mimeType?.startsWith('video') ? 'VIDEO' : 'PHOTO',
    }));
  }
}

export const googlePhotosService = new GooglePhotosService();
