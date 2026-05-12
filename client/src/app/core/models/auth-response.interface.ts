import { Inspector } from './inspector.interface';

export interface AuthResponse {
  user: Pick<Inspector, 'id' | 'email' | 'name' | 'subscription_status'>;
  access_token: string;
  refresh_token: string;
}
