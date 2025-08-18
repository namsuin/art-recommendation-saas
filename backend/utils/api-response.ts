/**
 * Standardized API response utilities
 */

export interface ApiSuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
  metadata?: {
    timestamp: string;
    version?: string;
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  metadata?: {
    timestamp: string;
    version?: string;
    [key: string]: any;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiResponseBuilder {
  private static getMetadata(additional?: Record<string, any>) {
    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      ...additional
    };
  }

  static success<T>(data?: T, message?: string, metadata?: Record<string, any>): ApiSuccessResponse<T> {
    return {
      success: true,
      data,
      message,
      metadata: this.getMetadata(metadata)
    };
  }

  static error(error: string, code?: string, details?: any, metadata?: Record<string, any>): ApiErrorResponse {
    return {
      success: false,
      error,
      code,
      details,
      metadata: this.getMetadata(metadata)
    };
  }

  static paginated<T>(
    items: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): ApiSuccessResponse<T[]> {
    return {
      success: true,
      data: items,
      message,
      metadata: this.getMetadata({
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      })
    };
  }
}

export const createSuccessResponse = ApiResponseBuilder.success;
export const createErrorResponse = ApiResponseBuilder.error;
export const createPaginatedResponse = ApiResponseBuilder.paginated;