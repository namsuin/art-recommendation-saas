// 표준화된 API 에러 처리 시스템

export enum ErrorCode {
  // 4xx 클라이언트 에러
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // 5xx 서버 에러
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  FILE_PROCESSING_ERROR = 'FILE_PROCESSING_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details: ApiErrorDetail[];
  public readonly timestamp: number;
  public readonly requestId?: string;

  constructor(
    statusCode: number,
    errorCode: ErrorCode,
    message: string,
    details: ApiErrorDetail[] = [],
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = Date.now();
    this.requestId = requestId;
    
    // V8 엔진 스택 트레이스 최적화
    Error.captureStackTrace(this, ApiError);
  }

  toJSON() {
    return {
      error: {
        code: this.errorCode,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
        requestId: this.requestId
      }
    };
  }

  toResponse(): Response {
    return new Response(JSON.stringify(this.toJSON()), {
      status: this.statusCode,
      headers: { 
        'Content-Type': 'application/json',
        'X-Request-ID': this.requestId || 'unknown'
      }
    });
  }
}

// 편의 메서드들
export class ApiErrors {
  static validation(message: string, details: ApiErrorDetail[] = [], requestId?: string): ApiError {
    return new ApiError(400, ErrorCode.VALIDATION_ERROR, message, details, requestId);
  }

  static unauthorized(message: string = '인증이 필요합니다.', requestId?: string): ApiError {
    return new ApiError(401, ErrorCode.AUTHENTICATION_REQUIRED, message, [], requestId);
  }

  static forbidden(message: string = '권한이 없습니다.', requestId?: string): ApiError {
    return new ApiError(403, ErrorCode.PERMISSION_DENIED, message, [], requestId);
  }

  static notFound(message: string = '리소스를 찾을 수 없습니다.', requestId?: string): ApiError {
    return new ApiError(404, ErrorCode.RESOURCE_NOT_FOUND, message, [], requestId);
  }

  static conflict(message: string, requestId?: string): ApiError {
    return new ApiError(409, ErrorCode.DUPLICATE_RESOURCE, message, [], requestId);
  }

  static rateLimit(message: string = '요청 한도를 초과했습니다.', requestId?: string): ApiError {
    return new ApiError(429, ErrorCode.RATE_LIMIT_EXCEEDED, message, [], requestId);
  }

  static database(message: string = '데이터베이스 오류가 발생했습니다.', requestId?: string): ApiError {
    return new ApiError(500, ErrorCode.DATABASE_ERROR, message, [], requestId);
  }

  static externalService(service: string, requestId?: string): ApiError {
    return new ApiError(
      500, 
      ErrorCode.EXTERNAL_SERVICE_ERROR, 
      `${service} 서비스에 연결할 수 없습니다.`,
      [],
      requestId
    );
  }

  static fileProcessing(message: string, requestId?: string): ApiError {
    return new ApiError(500, ErrorCode.FILE_PROCESSING_ERROR, message, [], requestId);
  }

  static aiService(message: string = 'AI 서비스 처리 중 오류가 발생했습니다.', requestId?: string): ApiError {
    return new ApiError(500, ErrorCode.AI_SERVICE_ERROR, message, [], requestId);
  }

  static internal(message: string = '내부 서버 오류가 발생했습니다.', requestId?: string): ApiError {
    return new ApiError(500, ErrorCode.INTERNAL_SERVER_ERROR, message, [], requestId);
  }
}

// 에러 핸들러 미들웨어
export function createErrorHandler() {
  return async function errorHandler(error: unknown, requestId?: string): Promise<Response> {
    // ApiError인 경우 그대로 반환
    if (error instanceof ApiError) {
      console.error(`[API Error] ${error.errorCode}: ${error.message}`, {
        statusCode: error.statusCode,
        requestId: error.requestId,
        details: error.details
      });
      return error.toResponse();
    }

    // 일반 Error인 경우
    if (error instanceof Error) {
      console.error(`[Unexpected Error] ${error.name}: ${error.message}`, {
        stack: error.stack,
        requestId
      });
      
      return ApiErrors.internal(
        process.env.NODE_ENV === 'production' 
          ? '내부 서버 오류가 발생했습니다.' 
          : error.message,
        requestId
      ).toResponse();
    }

    // 알 수 없는 에러
    console.error('[Unknown Error]', { error, requestId });
    return ApiErrors.internal(undefined, requestId).toResponse();
  };
}

// 요청 ID 생성기
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}