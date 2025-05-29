// User types
export interface User {
  id: string;
  email: string;
  name?: string;
}

// Auth state types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

//store type
export interface RootState {
  auth: AuthState;
}