import { Inspector } from '../interfaces/inspector.interface';

export interface AuthResponse {
  user: Pick<Inspector, 'id' | 'email' | 'name'>;
  access_token: string;
}
