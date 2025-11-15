import { GenerateContentResponse } from "@google/genai";

export type User = 'user' | 'bot';

export interface Message {
  id: string;
  text: string;
  sender: User;
  imageUrl?: string;
  isLoading?: boolean;
  sources?: { uri: string; title: string }[];
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  isThinkingMode: boolean;
  isSearchMode?: boolean;
  isResearchMode?: boolean;
  isEditMode?: boolean;
  isVideoMode?: boolean;
}

export type Plan = 'Free' | 'Pro' | 'Business' | 'Enterprise';

export interface AppUser {
  id:string;
  email: string;
  password?: string;
  name?: string;
  role: 'User' | 'Admin' | 'Moderator';
  lastLogin: string | null;
  knowledge?: string;
  plan: Plan;
  planEndDate?: string; // ISO string
  imageUsage: {
    count: number;
    lastReset: string; // ISO string
  };
  researchUsage: {
    count: number;
    lastReset: string; // ISO string
  };
  videoUsage: {
    count: number;
    lastReset: string; // ISO string
  };
}