export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  duration: number;
}

export interface ClassData {
  [className: string]: File[];
}

export interface VideoSettings {
  width: number;
  height: number;
  fps: number;
  duration: number;
}

export interface BackgroundImage {
  file: File;
  url: string;
}

export interface TransitionType {
  id: string;
  name: string;
  description: string;
}