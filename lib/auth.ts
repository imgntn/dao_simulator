// Authentication configuration for NextAuth.js

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // In production, validate against a database
        // For now, use environment variables
        const validUsername = process.env.ADMIN_USERNAME || 'admin';
        const validPassword = process.env.ADMIN_PASSWORD || 'admin123';

        if (
          credentials?.username === validUsername &&
          credentials?.password === validPassword
        ) {
          return {
            id: '1',
            name: credentials.username,
            email: `${credentials.username}@daosimulator.local`,
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
};

/**
 * Middleware function to protect API routes
 */
export async function requireAuth(request: Request): Promise<Response | null> {
  // Check for API key in headers
  const apiKey = request.headers.get('X-API-Key');
  const validApiKey = process.env.API_KEY;

  if (validApiKey && apiKey === validApiKey) {
    return null; // Authorized
  }

  // In development, allow without auth
  if (process.env.NODE_ENV === 'development' && !validApiKey) {
    return null;
  }

  // Unauthorized
  return new Response(
    JSON.stringify({ error: 'Unauthorized - API key required' }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
