/**
 * Unified API Response Utilities
 * 중앙화된 API 응답 처리 유틸리티
 */

import { serverLogger } from './logger';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    timestamp?: string;
    requestId?: string;
    [key: string]: any;
  };
}

export class ApiResponseBuilder {
  /**
   * Success response
   */
  static success<T>(data: T, message?: string, metadata?: any): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  /**
   * Error response
   */
  static error(error: string | Error, statusCode?: number, metadata?: any): ApiResponse {
    const errorMessage = error instanceof Error ? error.message : error;
    
    serverLogger.error('API Error:', { error: errorMessage, statusCode, metadata });
    
    return {
      success: false,
      error: errorMessage,
      metadata: {
        timestamp: new Date().toISOString(),
        statusCode,
        ...metadata
      }
    };
  }

  /**
   * Validation error response
   */
  static validationError(errors: Record<string, string[]>): ApiResponse {
    return {
      success: false,
      error: 'Validation failed',
      data: errors,
      metadata: {
        timestamp: new Date().toISOString(),
        statusCode: 400
      }
    };
  }

  /**
   * Not found response
   */
  static notFound(resource: string): ApiResponse {
    return {
      success: false,
      error: `${resource} not found`,
      metadata: {
        timestamp: new Date().toISOString(),
        statusCode: 404
      }
    };
  }

  /**
   * Unauthorized response
   */
  static unauthorized(message: string = 'Unauthorized access'): ApiResponse {
    return {
      success: false,
      error: message,
      metadata: {
        timestamp: new Date().toISOString(),
        statusCode: 401
      }
    };
  }

  /**
   * Create HTTP Response object
   */
  static toResponse<T>(apiResponse: ApiResponse<T>): Response {
    const statusCode = apiResponse.metadata?.statusCode || (apiResponse.success ? 200 : 500);
    
    return new Response(JSON.stringify(apiResponse), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': apiResponse.metadata?.requestId || '',
        'X-Response-Time': new Date().toISOString()
      }
    });
  }
}

// Backward compatibility exports
export const createSuccessResponse = ApiResponseBuilder.success;
export const createErrorResponse = ApiResponseBuilder.error;
export const createValidationErrorResponse = ApiResponseBuilder.validationError;
export const createNotFoundResponse = ApiResponseBuilder.notFound;
export const createUnauthorizedResponse = ApiResponseBuilder.unauthorized;