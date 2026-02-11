import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';
import { User } from '@/lib/types';
import { generateVerificationToken, getVerificationExpiry } from '@/lib/verification';
import { sendVerificationEmail } from '@/lib/email';

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

    // Hash password and create verification token
    const hashedPassword = await hashPassword(password);
    const verificationToken = generateVerificationToken();
    const now = new Date();

    const newUser: User = {
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      authProvider: 'credentials',
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: getVerificationExpiry(),
      createdAt: now,
      updatedAt: now,
    };

    await usersCollection.insertOne(newUser);

    // Send verification email
    try {
      await sendVerificationEmail(newUser.email, newUser.name, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails, user can resend
    }

    return NextResponse.json(
      {
        message: 'Registration successful. Please check your email to verify your account.',
        email: newUser.email,
        requiresVerification: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
