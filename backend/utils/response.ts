// 표준화된 API 응답 형식

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
  meta?: {
    requestId: string;
    timestamp: number;
    version?: string;
    pagination?: PaginationMeta;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class ResponseBuilder {
  
  // 성공 응답
  static success<T>(
    data: T, 
    requestId?: string, 
    pagination?: PaginationMeta,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        requestId: requestId || 'unknown',
        timestamp: Date.now(),
        version: '2.0'
      }
    };
    
    if (pagination) {
      response.meta!.pagination = pagination;
    }
    
    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId || 'unknown',
        'X-API-Version': '2.0'
      }
    });
  }
  
  // 생성 성공 응답
  static created<T>(data: T, requestId?: string): Response {
    return this.success(data, requestId, undefined, 201);
  }
  
  // 빈 성공 응답 (204 No Content)
  static noContent(requestId?: string): Response {
    return new Response(null, {
      status: 204,
      headers: {
        'X-Request-ID': requestId || 'unknown',
        'X-API-Version': '2.0'
      }
    });
  }
  
  // 페이지네이션 응답
  static paginated<T>(
    items: T[],
    page: number,
    limit: number,
    total: number,
    requestId?: string
  ): Response {
    const totalPages = Math.ceil(total / limit);
    
    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
    
    return this.success(items, requestId, pagination);
  }
  
  // 에러 응답 (ApiError 클래스와 호환)
  static error(
    code: string,
    message: string,
    details: any[] = [],
    statusCode: number = 400,
    requestId?: string
  ): Response {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details
      },
      meta: {
        requestId: requestId || 'unknown',
        timestamp: Date.now(),
        version: '2.0'
      }
    };
    
    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId || 'unknown',
        'X-API-Version': '2.0'
      }
    });
  }
  
  // 리다이렉트 응답
  static redirect(url: string, permanent: boolean = false): Response {
    return new Response(null, {
      status: permanent ? 301 : 302,
      headers: {
        'Location': url
      }
    });
  }
  
  // 파일 다운로드 응답
  static file(
    data: ArrayBuffer | Uint8Array,
    filename: string,
    contentType: string = 'application/octet-stream'
  ): Response {
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  }
  
  // 스트리밍 응답
  static stream(
    stream: ReadableStream,
    contentType: string = 'application/json'
  ): Response {
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      }
    });
  }
}

// 특수 응답 클래스들
export class HealthResponse {
  static healthy(services: Record<string, any>, requestId?: string): Response {
    return ResponseBuilder.success({
      status: 'healthy',
      services,
      timestamp: Date.now()
    }, requestId);
  }
  
  static unhealthy(
    services: Record<string, any>, 
    errors: string[], 
    requestId?: string
  ): Response {
    return ResponseBuilder.error(
      'HEALTH_CHECK_FAILED',
      'Service health check failed',
      [{ services, errors }],
      503,
      requestId
    );
  }
}

export class AuthResponse {
  static loginSuccess(
    user: any, 
    token: string, 
    expiresIn: number, 
    requestId?: string
  ): Response {
    return ResponseBuilder.success({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      },
      token,
      expiresIn,
      tokenType: 'Bearer'
    }, requestId);
  }
  
  static logoutSuccess(requestId?: string): Response {
    return ResponseBuilder.success({
      message: '로그아웃되었습니다.'
    }, requestId);
  }
}

export class AnalysisResponse {
  static analysisSuccess(
    analysis: any,
    recommendations: any[],
    processingTime: number,
    requestId?: string
  ): Response {
    return ResponseBuilder.success({
      analysis,
      recommendations,
      processingTime,
      totalRecommendations: recommendations.length
    }, requestId);
  }
}

// 응답 캐싱 헬퍼
export class ResponseCache {
  private static cache = new Map<string, { response: Response; expiry: number }>();
  
  static set(key: string, response: Response, ttlSeconds: number = 300): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    
    // Response를 복제해서 저장 (한 번만 읽을 수 있는 특성 때문)
    const clonedResponse = response.clone();
    this.cache.set(key, { response: clonedResponse, expiry });
  }
  
  static get(key: string): Response | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    // 캐시된 응답에 캐시 헤더 추가
    const response = cached.response.clone();
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-Cache', 'HIT');
    newHeaders.set('X-Cache-Expires', new Date(cached.expiry).toISOString());
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
  
  static clear(): void {
    this.cache.clear();
  }
  
  // 주기적으로 만료된 캐시 정리
  static startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.cache.entries()) {
        if (now > cached.expiry) {
          this.cache.delete(key);
        }
      }
    }, 60000); // 1분마다 정리
  }
}

// 응답 압축 헬퍼
export class ResponseCompression {
  static async compress(response: Response): Promise<Response> {
    const contentType = response.headers.get('content-type') || '';
    
    // JSON이나 텍스트만 압축
    if (!contentType.includes('json') && !contentType.includes('text')) {
      return response;
    }
    
    try {
      const compressed = new CompressionStream('gzip');
      const stream = response.body?.pipeThrough(compressed);
      
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Content-Encoding', 'gzip');
      newHeaders.delete('Content-Length'); // 압축 후 길이가 변경됨
      
      return new Response(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    } catch (error) {
      // 압축 실패 시 원본 반환
      console.warn('Response compression failed:', error);
      return response;
    }
  }
}