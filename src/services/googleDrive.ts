import { googleAuthService } from './googleAuth';

interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
}

interface SlideshowData {
  id?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  classData: { [className: string]: string[] }; // Base64 encoded images
  selectedMusic: any;
  backgroundImage: string | null; // Base64 encoded
  selectedTransition: any;
  settings: {
    classes: string[];
  };
}

class GoogleDriveService {
  private folderName = 'Slideshow Generator';
  private folderId: string | null = null;

  private async authHeaders(): Promise<HeadersInit> {
    const token = googleAuthService.getAccessToken();
    if (!token) throw new Error('No access token available');
    return { Authorization: `Bearer ${token}` };
  }

  private async ensureFolder(): Promise<string> {
    if (this.folderId) return this.folderId;

    const headers = await this.authHeaders();

    // Search for existing folder
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        `name='${this.folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      )}&fields=files(id,name)`,
      { headers }
    );

    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      this.folderId = searchData.files[0].id;
      return this.folderId;
    }

    // Create folder if not found
    const createRes = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: this.folderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      }
    );

    const createData = await createRes.json();
    this.folderId = createData.id;
    return this.folderId;
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // strip prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private base64ToFile(base64: string, filename: string, mimeType: string): File {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], filename, { type: mimeType });
  }

  async saveSlideshow(
    name: string,
    classData: { [className: string]: File[] },
    selectedMusic: any,
    backgroundImage: { file: File; url: string } | null,
    selectedTransition: any,
    classes: string[]
  ): Promise<string> {
    if (!googleAuthService.isSignedIn()) {
      throw new Error('User not signed in');
    }

    const folderId = await this.ensureFolder();
    const headers = await this.authHeaders();

    // Convert files to base64
    const processedClassData: { [className: string]: string[] } = {};
    for (const [className, files] of Object.entries(classData)) {
      processedClassData[className] = await Promise.all(
        files.map((file) => this.fileToBase64(file))
      );
    }

    const processedBackgroundImage = backgroundImage
      ? await this.fileToBase64(backgroundImage.file)
      : null;

    const slideshowData: SlideshowData = {
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      classData: processedClassData,
      selectedMusic,
      backgroundImage: processedBackgroundImage,
      selectedTransition,
      settings: { classes },
    };

    // Metadata
    const metadata = {
      name: `${name}.json`,
      parents: [folderId],
      mimeType: 'application/json',
    };

    // Multipart body
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(slideshowData) +
      closeDelim;

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    const uploadData = await uploadRes.json();
    return uploadData.id;
  }

  async loadSlideshow(fileId: string): Promise<{
    name: string;
    classData: { [className: string]: File[] };
    selectedMusic: any;
    backgroundImage: { file: File; url: string } | null;
    selectedTransition: any;
    classes: string[];
  }> {
    if (!googleAuthService.isSignedIn()) {
      throw new Error('User not signed in');
    }

    const headers = await this.authHeaders();
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers }
    );

    const slideshowData: SlideshowData = await res.json();

    // Convert back to files
    const processedClassData: { [className: string]: File[] } = {};
    for (const [className, base64Array] of Object.entries(slideshowData.classData)) {
      processedClassData[className] = base64Array.map((base64, index) =>
        this.base64ToFile(base64, `${className}_${index}.jpg`, 'image/jpeg')
      );
    }

    const processedBackgroundImage = slideshowData.backgroundImage
      ? {
          file: this.base64ToFile(
            slideshowData.backgroundImage,
            'background.jpg',
            'image/jpeg'
          ),
          url: `data:image/jpeg;base64,${slideshowData.backgroundImage}`,
        }
      : null;

    return {
      name: slideshowData.name,
      classData: processedClassData,
      selectedMusic: slideshowData.selectedMusic,
      backgroundImage: processedBackgroundImage,
      selectedTransition: slideshowData.selectedTransition,
      classes: slideshowData.settings.classes,
    };
  }

  async listSlideshows(): Promise<DriveFile[]> {
    if (!googleAuthService.isSignedIn()) {
      throw new Error('User not signed in');
    }

    const folderId = await this.ensureFolder();
    const headers = await this.authHeaders();

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        `'${folderId}' in parents and name contains '.json' and trashed=false`
      )}&fields=files(id,name,createdTime,modifiedTime,size)&orderBy=modifiedTime desc`,
      { headers }
    );

    const data = await res.json();

    return data.files.map((file: any) => ({
      id: file.id,
      name: file.name.replace('.json', ''),
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      size: file.size,
    }));
  }

  async deleteSlideshow(fileId: string): Promise<void> {
    if (!googleAuthService.isSignedIn()) {
      throw new Error('User not signed in');
    }

    const headers = await this.authHeaders();
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers,
    });
  }
}

export const googleDriveService = new GoogleDriveService();
export type { DriveFile, SlideshowData };
