import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { User } from '@/lib/types';
import { sendVerificationEmail } from '@/lib/email';
import { generateVerificationToken, getVerificationExpiry } from '@/lib/verification';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const usersCollection = db.collection<User>('users');

    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Return success even if user doesn't exist (security)
      return NextResponse.json({ message: 'If the email exists, a verification link has been sent.' });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: 'Email is already verified.' });
    }

    const token = generateVerificationToken();

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerificationToken: token,
          emailVerificationExpires: getVerificationExpiry(),
          updatedAt: new Date(),
        },
      }
    );

    await sendVerificationEmail(user.email, user.name, token);

    return NextResponse.json({ message: 'Verification email sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
