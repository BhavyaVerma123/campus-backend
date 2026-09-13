import type { User, UserRole } from '@prisma/client';

export type AuthenticatedUser = Pick<User, 'id' | 'name' | 'email' | 'profilePicture' | 'role'>;

export type SessionData = {
  userId: string;
};

export type Role = UserRole;