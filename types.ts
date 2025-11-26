export enum ModelId {
  // Nano (Flash Image)
  NANO = 'gemini-2.5-flash-image',
  // Nano Pro (Pro Image Preview)
  NANO_PRO = 'gemini-3-pro-image-preview',
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageSize = '1K' | '2K' | '4K';

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  model: string;
  timestamp: number;
}

export interface GenerationSettings {
  model: ModelId;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
}