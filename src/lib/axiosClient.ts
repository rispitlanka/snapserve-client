// ============================================
// OPTIONAL: Axios-based API client
// ============================================
// Use this if you prefer Axios over fetch
// Install first: npm install axios

import { getAuthSession } from "@/lib/auth";
import axios, { AxiosError } from "axios";

// ✅ Create instance with proper CORS config
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://snapserve-backend.onrender.com",
  timeout: 10000,
  withCredentials: true, // ✅ Send cookies for CORS
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Request interceptor - add auth token
apiClient.interceptors.request.use((config) => {
  const token = getAuthSession()?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Better error logging for debugging
    if (error.response) {
      console.error("API Error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
        corsHeader: error.response.headers["access-control-allow-origin"],
        data: error.response.data,
      });
    } else if (error.request) {
      // Request made but no response (network error or CORS)
      console.error("Network/CORS Error:", {
        message: error.message,
        url: error.config?.url,
      });
    } else {
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

// ============================================
// API Functions
// ============================================

export const authApi = {
  login: async (payload: {
    restaurantId: string;
    name: string;
    password: string;
  }) => {
    const response = await apiClient.post("/auth/login", payload);
    return response.data;
  },

  refresh: async (refreshToken: string) => {
    const response = await apiClient.post("/auth/refresh", { refreshToken });
    return response.data;
  },

  logout: async (refreshToken: string) => {
    await apiClient.post("/auth/logout", { refreshToken });
  },

  selectRegister: async (register: string) => {
    const response = await apiClient.post("/auth/select-register", { register });
    return response.data;
  },
};

export const restaurantApi = {
  list: async () => {
    const response = await apiClient.get("/restaurants");
    return response.data;
  },

  create: async (payload: { name: string; isActive: boolean }) => {
    const response = await apiClient.post("/restaurants", payload);
    return response.data;
  },
};

export default apiClient;

// ============================================
// Usage Example
// ============================================
/*
import { authApi } from '@/lib/axiosClient';

// In your component:
try {
  const session = await authApi.login({
    restaurantId: 'rest1',
    name: 'user',
    password: 'password',
  });
  console.log('Success:', session);
} catch (error) {
  console.error('Failed:', error);
}
*/
