import axios, { AxiosInstance } from 'axios';
import { ApiResponse } from '@/types';

const resolveApiBaseUrl = () => {
  const configuredBaseUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  return '/api';
};

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: resolveApiBaseUrl(),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Auth endpoints
  async register(
    email: string,
    username: string,
    password: string,
    fullName?: string
  ): Promise<ApiResponse<{ token: string; user: any }>> {
    return this.client.post('/api/auth/register', {
      email,
      username,
      password,
      fullName,
    });
  }

  async login(
    email: string,
    password: string
  ): Promise<ApiResponse<{ token: string; user: any }>> {
    return this.client.post('/api/auth/login', { email, password });
  }

  async logout(): Promise<ApiResponse<null>> {
    return this.client.post('/api/auth/logout');
  }

  // Courts endpoints
  async getCourts(): Promise<ApiResponse<any[]>> {
    return this.client.get('/api/courts');
  }

  async getCourtById(id: string): Promise<ApiResponse<any>> {
    return this.client.get(`/api/courts/${id}`);
  }

  async getNearby(
    lat: number,
    lng: number,
    radiusMiles: number = 5
  ): Promise<ApiResponse<any[]>> {
    return this.client.get('/api/courts/nearby', {
      params: { lat, lng, radius: radiusMiles },
    });
  }

  // Games endpoints
  async getGames(): Promise<ApiResponse<any[]>> {
    return this.client.get('/api/games');
  }

  async getGameById(id: string): Promise<ApiResponse<any>> {
    return this.client.get(`/api/games/${id}`);
  }

  async createGame(gameData: any): Promise<ApiResponse<any>> {
    return this.client.post('/api/games', gameData);
  }

  async joinGame(gameId: string): Promise<ApiResponse<any>> {
    return this.client.post(`/api/games/${gameId}/join`);
  }

  async leaveGame(gameId: string): Promise<ApiResponse<any>> {
    return this.client.post(`/api/games/${gameId}/leave`);
  }

  // Reservations endpoints
  async getReservations(): Promise<ApiResponse<any[]>> {
    return this.client.get('/api/reservations');
  }

  async createReservation(reservationData: any): Promise<ApiResponse<any>> {
    return this.client.post('/api/reservations', reservationData);
  }
}

export const apiClient = new ApiClient();
