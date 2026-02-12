import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  name: string;
  password?: string; // Optional for OAuth users
  createdAt: Date;
  updatedAt: Date;

  // Email verification
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;

  // OAuth
  authProvider: 'credentials' | 'google';
  googleId?: string;
  image?: string; // Profile picture from Google
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

// Document block types
export type BlockType = 'text' | 'image';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: number;
  fontSize?: number;
  isBold?: boolean;
}

// Document stored in MongoDB
export interface Document {
  _id?: ObjectId;
  userId: string;
  title: string;
  blocks: Block[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentResponse {
  id: string;
  userId: string;
  title: string;
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
}

// Signature placement on a specific PDF page
export interface SignaturePlacement {
  id: string;
  pageNumber: number;          // 1-indexed page number
  imageData: string;           // Base64 encoded signature image
  x: number;                   // Position as percentage (0-100)
  y: number;                   // Position as percentage (0-100)
  width: number;               // Width as percentage
  height: number;              // Height as percentage
  aspectRatio: number;         // Original aspect ratio for maintaining proportions
}
