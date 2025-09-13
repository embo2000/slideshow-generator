export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  duration: number;
  isCustom?: boolean;
  file?: File;
}

export interface ClassData {
  [className: string]: File[];
}

export interface VideoSettings {
  width: number;
  height: number;
  fps: number;
  duration: number;
  slideDuration: number; // Duration in seconds for each slide
}

export interface BackgroundImage {
  file: File;
  url: string;
  opacity?: number;
}

export interface BackgroundColor {
  color: string;
  opacity?: number;
}

export interface BackgroundOption {
  type: 'image' | 'color' | 'none';
  image?: BackgroundImage;
  color?: BackgroundColor;
}

export interface TransitionType {
  id: string;
  name: string;
  description: string;
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}