// NextAuth.js API route handler (v5)

import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth';

const { handlers } = NextAuth(authConfig);

export const { GET, POST } = handlers;
