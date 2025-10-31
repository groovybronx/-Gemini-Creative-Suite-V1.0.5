import type { ReactNode } from 'react';

export enum Author {
  USER = 'user',
  MODEL = 'model',
}

export type TextPart = { type: 'text'; text: string };
export type ImagePart = { type: 'image'; url: string; mimeType: string; base64: string };
export type ImageGenerationResultPart = {
  type: 'imageGenerationResult';
  images: { url: string }[];
  prompt: string;
  parameters: GenerationEvent['parameters'];
};
export type MessagePart = TextPart | ImagePart | ImageGenerationResultPart;


export interface ChatMessage {
  id: string;
  author: Author;
  parts: MessagePart[];
}


export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export type ThemeName = 'dark' | 'light' | 'high-contrast' | 'custom';

export interface Theme {
  name: string;
  colors: {
    'base-bg': string;
    'component-bg': string;
    'border-color': string;
    'text-primary': string;
    'text-secondary': string;
    'accent-khaki': string;
    'accent-yellow': string;
    'accent-orange': string;
  };
}

export type ImagenModel = 'imagen-4.0-generate-001' | 'imagen-4.0-ultra-generate-001' | 'imagen-4.0-fast-generate-001' | 'imagen-3.0-generate-002';
export type GeminiChatModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export type ConversationType = 'chat' | 'imageGeneration' | 'imageEditing';

interface BaseConversation {
  id: string;
  title: string;
  createdAt: number;
  isFavorite: boolean;
  type: ConversationType;
}

export interface ChatConversation extends BaseConversation {
  type: 'chat';
  messages: ChatMessage[];
  modelUsed: GeminiChatModel;
}

export interface GenerationEvent {
  prompt: string;
  parameters: {
    model: ImagenModel;
    aspectRatio: AspectRatio;
    numberOfImages: number;
    outputMimeType?: 'image/jpeg' | 'image/png';
  };
  generatedImages: string[];
  timestamp: number;
}

export interface ImageGenerationConversation extends BaseConversation {
  type: 'imageGeneration';
  history: GenerationEvent[];
}

export interface EditEvent {
  prompt: string;
  editedImage: {
    url: string;
    base64: string;
    mimeType: string;
  };
  timestamp: number;
}

export interface ImageEditingConversation extends BaseConversation {
    type: 'imageEditing';
    baseImage: {
      url: string;
      base64: string;
      mimeType: string;
    };
    history: EditEvent[];
    analysisResult?: string;
}

export type Conversation = ChatConversation | ImageGenerationConversation | ImageEditingConversation;