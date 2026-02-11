import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { getDatabase } from './mongodb';
import { createToken } from './auth';
import { User } from './types';

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          const db = await getDatabase();
          const usersCollection = db.collection<User>('users');

          const googleId = profile?.sub || undefined;
          const email = user.email?.toLowerCase();

          if (!email) {
            console.error('No email provided by Google');
            return false;
          }

          // Build query conditions
          const orConditions: Array<{ googleId?: string; email?: string }> = [];
          if (googleId) {
            orConditions.push({ googleId });
          }
          orConditions.push({ email });

          // Check if user exists by googleId or email
          const existingUser = await usersCollection.findOne({
            $or: orConditions
          });

          if (existingUser) {
            // Link Google account if email matches but no googleId
            if (!existingUser.googleId && googleId) {
              await usersCollection.updateOne(
                { _id: existingUser._id },
                {
                  $set: {
                    googleId,
                    image: user.image || undefined,
                    emailVerified: true,
                    updatedAt: new Date()
                  }
                }
              );
            }
          } else {
            // Create new user
            await usersCollection.insertOne({
              email,
              name: user.name || 'User',
              authProvider: 'google',
              googleId,
              image: user.image || undefined,
              emailVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          return true;
        } catch (error) {
          console.error('Error during Google sign in:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account && user && user.email) {
        try {
          const db = await getDatabase();
          const dbUser = await db.collection<User>('users').findOne({
            email: user.email.toLowerCase()
          });

          if (dbUser) {
            token.userId = dbUser._id!.toString();
            token.customToken = createToken({
              id: dbUser._id!.toString(),
              email: dbUser.email,
              name: dbUser.name,
            });
          }
        } catch (error) {
          console.error('Error in jwt callback:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
        session.customToken = token.customToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});
