import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  name: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
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
