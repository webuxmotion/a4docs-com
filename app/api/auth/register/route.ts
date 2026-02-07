import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { hashPassword, createToken } from '@/lib/auth';
import { User, AuthResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    // Validate input
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const usersCollection = db.collection<User>('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const now = new Date();

    const newUser: User = {
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    };

    const result = await usersCollection.insertOne(newUser);

    // Create token
    const token = createToken({
      id: result.insertedId.toString(),
      email: newUser.email,
      name: newUser.name,
    });

    const response: AuthResponse = {
      user: {
        id: result.insertedId.toString(),
        email: newUser.email,
        name: newUser.name,
      },
      token,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
