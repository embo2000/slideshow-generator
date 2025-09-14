import { googleAuthService } from "./googleAuth";

export interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
}

export interface SlideshowData {
  id?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  classData: { [className: string]: string[] }; // Base64 encoded images
  selectedMusic: any;
  backgroundOption: any; // BackgroundOption with encoded data
  selectedTransition: any;
  slideDuration: number;
  slideshowName: string;
  settings: {
    classes: string[];
  };
}

export interface GroupsSettings {
  classes: string[];
  updatedAt: string;
}

class GoogleDriveService {
  private folderName = "Slideshow Generator";
  private folderId: string | null = null;
  private settingsFileName = "groups-settings.json";

  private async getToken(): Promise<string> {
    const token = googleAuthService.getAccessToken();
    if (!token) throw new Error("Not signed in");
    return token;
  }

  private async ensureFolder(): Promise<string> {
    if (this.folderId) return this.folderId;
    const token = await this.getToken();

    // 1. Search for folder
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        `name='${this.folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      )}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      this.folderId = searchData.files[0].id;
      return this.folderId;
    }

    // 2. Create folder if not found
    const createRes = await fetch(`https://www.googleapis.com/drive/v3/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: this.folderName,
        mimeType: "application/vnd.google-apps.folder",
      }),
    });

    const folder = await createRes.json();
    this.folderId = folder.id;
    return this.folderId;
  }

  async saveSlideshow(
    name: string,
    classData: { [className: string]: File[] },
    selectedMusic: any,
    backgroundOption: any,
    selectedTransition: any,
    classes: string[],
    slideDuration: number = 3,
    slideshowName: string = ''
  ): Promise<string> {
    console.log('Starting slideshow save process for:', name);
    console.log('Class data keys:', Object.keys(classData));
    console.log('Total photos:', Object.values(classData).reduce((total, photos) => total + photos.length, 0));
    
    const token = await this.getToken();
    const folderId = await this.ensureFolder();

    // Check if a file with the same name already exists
    const fileName = `${name}.json`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        `name='${fileName}' and '${folderId}' in parents and trashed=false`
      )}&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const searchData = await searchRes.json();
    const existingFileId = searchData.files?.[0]?.id;

    // Convert files to base64
    const fileToBase64 = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // remove prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    const processedClassData: { [className: string]: string[] } = {};
    for (const [className, files] of Object.entries(classData)) {
      console.log(`Processing ${files.length} files for class: ${className}`);
      processedClassData[className] = await Promise.all(
        files.map((f) => fileToBase64(f))
      );
    }

    // Process background option
    let processedBackgroundOption = backgroundOption;
    if (backgroundOption?.type === 'image' && backgroundOption.image) {
      console.log('Processing background image');
      try {
        // Check if we have a file to save
        if (backgroundOption.image.file) {
          // Save background image to Drive Assets folder
          const assetId = await this.saveAssetToDriveWithName(backgroundOption.image.file, 'image', 'Background Image');
          console.log('Background image saved to Drive with ID:', assetId);
          
          processedBackgroundOption = {
            ...backgroundOption,
            image: {
              ...backgroundOption.image,
              assetId: assetId,
              fileName: backgroundOption.image.file.name,
              data: await fileToBase64(backgroundOption.image.file), // Keep as fallback
              file: undefined,
              url: undefined
            }
          };
        } else if (backgroundOption.image.assetId) {
          // Already saved to Drive, just keep the reference
          console.log('Background image already saved to Drive with ID:', backgroundOption.image.assetId);
          processedBackgroundOption = {
            ...backgroundOption,
            image: {
              ...backgroundOption.image,
              file: undefined,
              url: undefined
            }
          };
        } else {
          // No file and no asset ID, convert to base64 fallback
          console.log('No file or asset ID, using fallback method');
          processedBackgroundOption = backgroundOption;
        }
      } catch (error) {
        console.error('Failed to save background image to Drive:', error);
        // Fallback to base64 only if we have a file
        if (backgroundOption.image.file) {
          processedBackgroundOption = {
            ...backgroundOption,
            image: {
              ...backgroundOption.image,
              data: await fileToBase64(backgroundOption.image.file),
              file: undefined,
              url: undefined
            }
          };
        } else {
          processedBackgroundOption = backgroundOption;
        }
      }
    }

    // Process selected music
    let processedSelectedMusic = selectedMusic;
    if (selectedMusic?.file) {
      console.log('Processing background music file');
      try {
        // Save music file to Drive Assets folder
        const assetId = await this.saveAssetToDriveWithName(selectedMusic.file, 'audio', selectedMusic.name);
        console.log('Background music saved to Drive with ID:', assetId);
        
        processedSelectedMusic = {
          ...selectedMusic,
          assetId: assetId,
          fileName: selectedMusic.file.name,
          file: undefined // Remove file reference after saving
        };
      } catch (error) {
        console.error('Failed to save background music to Drive:', error);
        // Keep original music data as fallback
        processedSelectedMusic = {
          ...selectedMusic,
          file: undefined
        };
      }
    }

    const slideshowData: SlideshowData = {
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      classData: processedClassData,
      selectedMusic: processedSelectedMusic,
      backgroundOption: processedBackgroundOption,
      selectedTransition,
      slideDuration,
      slideshowName,
      settings: { classes },
    };

    console.log('Slideshow data prepared, uploading to Drive...');

    const metadata = {
      name: `${name}.json`,
      ...(existingFileId ? {} : { parents: [folderId] }),
      mimeType: "application/json",
    };

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const body =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(slideshowData) +
      closeDelim;

    // Use PATCH for existing files, POST for new files
    const url = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    
    const method = existingFileId ? "PATCH" : "POST";

    const res = await fetch(
      url,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Drive API error:', res.status, errorText);
      throw new Error(`Failed to save slideshow: ${res.status} ${errorText}`);
    }
    const result = await res.json();
    const fileId = existingFileId || result.id;
    console.log(`Slideshow ${existingFileId ? 'updated' : 'saved'} successfully with ID:`, fileId);
    return fileId;
  }

  async loadSlideshow(fileId: string): Promise<SlideshowData> {
    const token = await this.getToken();

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to load slideshow:', res.status, errorText);
      throw new Error(`Failed to load slideshow: ${res.status}`);
    }
    const data = await res.json();
    
    console.log('Raw slideshow data loaded:', {
      name: data.name,
      classDataKeys: Object.keys(data.classData || {}),
      classes: data.classes || data.settings?.classes,
      hasBackgroundOption: !!data.backgroundOption,
      hasSelectedMusic: !!data.selectedMusic
    });
    if (data.backgroundOption?.image?.assetId) {
      try {
        const assetUrl = await this.loadAssetFromDrive(data.backgroundOption.image.assetId);
        data.backgroundOption.image.url = assetUrl;
        console.log('Background image loaded from Drive');
      } catch (error) {
        console.error('Failed to load background image from Drive:', error);
        if (data.backgroundOption.image.data) {
          data.backgroundOption.image.url = `data:image/jpeg;base64,${data.backgroundOption.image.data}`;
        }
      }
    }
    
    if (data.selectedMusic?.assetId) {
      try {
        const assetUrl = await this.loadAssetFromDrive(data.selectedMusic.assetId);
        data.selectedMusic.url = assetUrl;
        console.log('Background music loaded from Drive');
      } catch (error) {
        console.error('Failed to load background music from Drive:', error);
      }
    }
    
    console.log('Slideshow loaded successfully:', data.name);
    return data;
  }

  async listSlideshows(): Promise<DriveFile[]> {
    const token = await this.getToken();
    const folderId = await this.ensureFolder();

    await new Promise(resolve => setTimeout(resolve, 1000));

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        `'${folderId}' in parents and trashed=false`
      )}&fields=files(id,name,createdTime,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=100`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      console.error('Failed to list files:', await res.text());
      throw new Error(`Failed to list files: ${res.status}`);
    }

    const data = await res.json();
    console.log('Drive API response:', data);
    
    const jsonFiles = (data.files ?? []).filter((file: DriveFile) => {
      return file.name.endsWith('.json') && file.name !== this.settingsFileName;
    });
    
    console.log('Filtered JSON files:', jsonFiles);
    return jsonFiles;
  }

  async saveGroupsSettings(classes: string[]): Promise<void> {
    const token = await this.getToken();
    const folderId = await this.ensureFolder();

    const settingsData: GroupsSettings = {
      classes,
      updatedAt: new Date().toISOString(),
    };

    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        `name='${this.settingsFileName}' and '${folderId}' in parents and trashed=false`
      )}&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const searchData = await searchRes.json();
    const existingFileId = searchData.files?.[0]?.id;

    const metadata = {
      name: this.settingsFileName,
      ...(existingFileId ? {} : { parents: [folderId] }),
      mimeType: "application/json",
    };

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const body =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(settingsData) +
      closeDelim;

    const url = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

    const method = existingFileId ? "PATCH" : "POST";

    await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });
  }

  async loadGroupsSettings(): Promise<string[] | null> {
    try {
      const token = await this.getToken();
      const folderId = await this.ensureFolder();

      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `name='${this.settingsFileName}' and '${folderId}' in parents and trashed=false`
        )}&fields=files(id)`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const searchData = await searchRes.json();
      const fileId = searchData.files?.[0]?.id;

      if (!fileId) {
        return null;
      }

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const settingsData: GroupsSettings = await res.json();
      return settingsData.classes;
    } catch (error) {
      console.error('Failed to load groups settings:', error);
      return null;
    }
  }

  async deleteSlideshow(fileId: string): Promise<void> {
    const token = await this.getToken();

    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async listBackgroundImages(): Promise<Array<{
    id: string;
    name: string;
    url: string;
    createdTime: string;
  }>> {
    try {
      const token = await this.getToken();
      const assetsFolderId = await this.ensureAssetsFolder();

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `'${assetsFolderId}' in parents and mimeType contains 'image/' and trashed=false`
        )}&fields=files(id,name,description,createdTime)&orderBy=createdTime desc`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        console.error('Failed to list background images:', await res.text());
        return [];
      }

      const data = await res.json();
      const images = data.files || [];

      const imagesWithUrls = await Promise.all(
        images.map(async (image: any) => {
          try {
            const url = await this.loadAssetFromDrive(image.id);
            // Use description (original filename) if available, otherwise extract from Drive filename
            let displayName = image.description || image.name;
            if (!image.description && image.name.includes('-')) {
              // Extract original filename from Drive filename pattern: type-timestamp-originalname
              const parts = image.name.split('-');
              if (parts.length >= 3) {
                displayName = parts.slice(2).join('-'); // Rejoin in case original name had dashes
              }
            }
            
            return {
              id: image.id,
              name: displayName,
              url,
              createdTime: image.createdTime
            };
          } catch (error) {
            console.error(`Failed to load URL for image ${image.name}:`, error);
            return null;
          }
        })
      );

      return imagesWithUrls.filter(image => image !== null) as Array<{
        id: string;
        name: string;
        url: string;
        createdTime: string;
      }>;
    } catch (error) {
      console.error('Failed to list background images:', error);
      return [];
    }
  }

  async listMusicFiles(): Promise<Array<{
    id: string;
    name: string;
    url: string;
    createdTime: string;
    size?: string;
  }>> {
    try {
      const token = await this.getToken();
      const assetsFolderId = await this.ensureAssetsFolder();

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `'${assetsFolderId}' in parents and mimeType contains 'audio/' and trashed=false`
        )}&fields=files(id,name,description,createdTime,size)&orderBy=createdTime desc`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        console.error('Failed to list music files:', await res.text());
        return [];
      }

      const data = await res.json();
      const musicFiles = data.files || [];

      const musicWithUrls = await Promise.all(
        musicFiles.map(async (music: any) => {
          try {
            const url = await this.loadAssetFromDrive(music.id);
            // Use description (original filename) if available, otherwise extract from Drive filename
            let displayName = music.description || music.name;
            if (!music.description && music.name.includes('-')) {
              // Extract original filename from Drive filename pattern: type-timestamp-originalname
              const parts = music.name.split('-');
              if (parts.length >= 3) {
                displayName = parts.slice(2).join('-'); // Rejoin in case original name had dashes
              }
            }
            
            return {
              id: music.id,
              name: displayName,
              url,
              createdTime: music.createdTime,
              size: music.size
            };
          } catch (error) {
            console.error(`Failed to load URL for music ${music.name}:`, error);
            return null;
          }
        })
      );

      return musicWithUrls.filter(m => m !== null) as Array<{
        id: string;
        name: string;
        url: string;
        createdTime: string;
        size?: string;
      }>;
    } catch (error) {
      console.error('Failed to list music files:', error);
      return [];
    }
  }

  private async ensureAssetsFolder(): Promise<string> {
    const token = await this.getToken();
    const mainFolderId = await this.ensureFolder();

    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        `name='Assets' and mimeType='application/vnd.google-apps.folder' and '${mainFolderId}' in parents and trashed=false`
      )}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    const createRes = await fetch(`https://www.googleapis.com/drive/v3/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Assets",
        mimeType: "application/vnd.google-apps.folder",
        parents: [mainFolderId],
      }),
    });

    const folder = await createRes.json();
    return folder.id;
  }

  async saveAssetToDrive(file: File, type: 'image' | 'audio'): Promise<string> {
    const token = await this.getToken();
    const assetsFolderId = await this.ensureAssetsFolder();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const driveFileName = `${type}-${timestamp}-${file.name}`;

    const metadata = {
      name: driveFileName,
      parents: [assetsFolderId],
      mimeType: file.type,
      description: file.name, // This will be overridden by the caller with user-provided name
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", file);

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to save asset: ${res.status}`);
    }

    const result = await res.json();
    return result.id;
  }

  async saveAssetToDriveWithName(file: File, type: 'image' | 'audio', userProvidedName: string): Promise<string> {
    const token = await this.getToken();
    const assetsFolderId = await this.ensureAssetsFolder();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const driveFileName = `${type}-${timestamp}-${file.name}`;

    const metadata = {
      name: driveFileName,
      parents: [assetsFolderId],
      mimeType: file.type,
      description: userProvidedName, // Store user-provided name in description
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", file);

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to save asset: ${res.status}`);
    }

    const result = await res.json();
    return result.id;
  }

  async loadAssetFromDrive(assetId: string): Promise<string> {
    const token = await this.getToken();

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${assetId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to load asset: ${res.status}`);
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }
}

export const googleDriveService = new GoogleDriveService();