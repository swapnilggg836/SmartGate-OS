import { UserRole } from './enums';
import { UserProfile } from './user';

export interface LoginRequestDto {
  email: string;
  password?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponseDto {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}
