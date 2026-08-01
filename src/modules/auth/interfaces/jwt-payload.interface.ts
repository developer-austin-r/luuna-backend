export interface JwtPayload {
  /** User ID */
  sub: string;
  email: string;
  role: string | null;
}
