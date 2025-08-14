import AsyncStorage from '@react-native-async-storage/async-storage';

// API 기본 URL - 실제 배포 시에는 환경변수 사용
const API_BASE_URL = 'http://localhost:3000';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
  requestId?: string;
}

class ApiService {
  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('supabase.auth.token');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getAuthToken();
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();
      
      return {
        success: response.ok,
        ...data,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  // 이미지 분석 API
  async analyzeImage(imageUri: string, userId?: string): Promise<ApiResponse> {
    const formData = new FormData();
    
    // React Native에서 이미지 업로드
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    } as any);

    if (userId) {
      formData.append('userId', userId);
    }

    return this.makeRequest('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
  }

  // 사용자 업로드 히스토리 조회
  async getUserUploads(userId: string, limit = 20): Promise<ApiResponse> {
    return this.makeRequest(`/api/uploads?userId=${userId}&limit=${limit}`);
  }

  // 추천 히스토리 조회
  async getRecommendations(userId: string, uploadId?: string): Promise<ApiResponse> {
    let url = `/api/recommendations?userId=${userId}`;
    if (uploadId) {
      url += `&uploadId=${uploadId}`;
    }
    return this.makeRequest(url);
  }

  // 추천 클릭 기록
  async recordRecommendationClick(recommendationId: string, userId: string): Promise<ApiResponse> {
    return this.makeRequest('/api/recommendations/click', {
      method: 'POST',
      body: JSON.stringify({
        recommendationId,
        userId,
      }),
    });
  }

  // 구독 플랜 조회
  async getSubscriptionPlans(): Promise<ApiResponse> {
    return this.makeRequest('/api/subscription/plans');
  }

  // 사용자 구독 상태 조회
  async getUserSubscription(userId: string): Promise<ApiResponse> {
    return this.makeRequest(`/api/subscription/status?userId=${userId}`);
  }

  // 업로드 제한 확인
  async checkUploadLimit(userId: string): Promise<ApiResponse> {
    return this.makeRequest(`/api/auth/upload-limit?userId=${userId}`);
  }

  // 작품 구매 요청
  async requestPurchase(artworkId: string, userId: string, contactInfo: Record<string, unknown>): Promise<ApiResponse> {
    return this.makeRequest('/api/purchase/request', {
      method: 'POST',
      body: JSON.stringify({
        artworkId,
        userId,
        contactInfo,
      }),
    });
  }

  // 구매 요청 상태 조회
  async getPurchaseRequests(userId: string): Promise<ApiResponse> {
    return this.makeRequest(`/api/purchase/requests?userId=${userId}`);
  }

  // 구매 요청 취소
  async cancelPurchaseRequest(requestId: string, userId: string): Promise<ApiResponse> {
    return this.makeRequest(`/api/purchase/requests/${requestId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }
}

export default new ApiService();