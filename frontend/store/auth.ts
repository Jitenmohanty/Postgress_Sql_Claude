import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/lib/types';
import { authAPI } from '@/lib/api';
import socketManager from '@/lib/socket';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });
          const response = await authAPI.login(email, password);
          const { user, token, refreshToken } = response.data;
          
          localStorage.setItem('auth_token', token);
          localStorage.setItem('refresh_token', refreshToken);
          
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false 
          });

          // Connect to socket
          socketManager.connect(token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        socketManager.disconnect();
        
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        });
      },

      register: async (data: any) => {
        try {
          set({ isLoading: true });
          const response = await authAPI.register(data);
          const { user, token, refreshToken } = response.data;
          
          localStorage.setItem('auth_token', token);
          localStorage.setItem('refresh_token', refreshToken);
          
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false 
          });

          socketManager.connect(token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      updateProfile: (data: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...data } });
        }
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);