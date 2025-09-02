import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post('/api/auth/refresh', {
            refreshToken,
          });
          
          const { token } = response.data;
          localStorage.setItem('auth_token', token);
          
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle common errors
    if (error.response?.status === 403) {
      toast.error('Access denied. Please check your permissions.');
    } else if (error.response?.status === 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.code === 'NETWORK_ERROR') {
      toast.error('Network error. Please check your connection.');
    }

    return Promise.reject(error);
  }
);

export default api;

// API endpoints
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  register: (data: any) => 
    api.post('/auth/register', data),
  logout: () => 
    api.post('/auth/logout'),
  getProfile: () => 
    api.get('/auth/profile'),
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

export const usersAPI = {
  getProfile: (id: string) => 
    api.get(`/users/profile/${id}`),
  updateProfile: (data: any) => 
    api.patch('/users/profile', data),
  uploadAvatar: (file: FormData) => 
    api.post('/users/avatar', file),
  searchUsers: (query: string) => 
    api.get(`/users/search?q=${query}`),
  follow: (userId: string) => 
    api.post(`/users/${userId}/follow`),
  unfollow: (userId: string) => 
    api.delete(`/users/${userId}/follow`),
};

export const postsAPI = {
  getPosts: (page = 1, limit = 10, tags?: string[]) => 
    api.get(`/posts?page=${page}&limit=${limit}&tags=${tags?.join(',')}`),
  getPost: (slug: string) => 
    api.get(`/posts/${slug}`),
  createPost: (data: any) => 
    api.post('/posts', data),
  updatePost: (id: string, data: any) => 
    api.patch(`/posts/${id}`, data),
  deletePost: (id: string) => 
    api.delete(`/posts/${id}`),
  likePost: (id: string) => 
    api.post(`/posts/${id}/like`),
  getComments: (postId: string) => 
    api.get(`/posts/${postId}/comments`),
  createComment: (postId: string, content: string, parentId?: string) => 
    api.post(`/posts/${postId}/comments`, { content, parentId }),
};

export const chatAPI = {
  getRooms: () => 
    api.get('/chat/rooms'),
  getRoom: (id: string) => 
    api.get(`/chat/rooms/${id}`),
  createRoom: (data: any) => 
    api.post('/chat/rooms', data),
  joinRoom: (id: string) => 
    api.post(`/chat/rooms/${id}/join`),
  leaveRoom: (id: string) => 
    api.delete(`/chat/rooms/${id}/leave`),
  getMessages: (roomId: string, page = 1) => 
    api.get(`/chat/rooms/${roomId}/messages?page=${page}`),
  sendMessage: (roomId: string, content: string, type = 'text') => 
    api.post(`/chat/rooms/${roomId}/messages`, { content, type }),
};

export const aiAPI = {
  getConversations: () => 
    api.get('/ai/conversations'),
  getConversation: (id: string) => 
    api.get(`/ai/conversations/${id}`),
  createConversation: (title: string) => 
    api.post('/ai/conversations', { title }),
  sendMessage: (conversationId: string, content: string) => 
    api.post(`/ai/conversations/${conversationId}/messages`, { content }),
  deleteConversation: (id: string) => 
    api.delete(`/ai/conversations/${id}`),
};