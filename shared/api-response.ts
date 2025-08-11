/**
 * Standardized API response formats and error handling
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
  timestamp?: string;
  requestId?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export class ApiResponseBuilder {
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  static error(message: string, code?: string, details?: any): ApiResponse {
    return {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    };
  }

  static validationError(errors: string[]): ApiResponse {
    return {
      success: false,
      error: 'Validation failed',
      errors,
      timestamp: new Date().toISOString()
    };
  }

  static unauthorized(message: string = 'Authentication required'): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  static forbidden(message: string = 'Access denied'): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  static notFound(message: string = 'Resource not found'): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  static serverError(message: string = 'Internal server error', error?: Error): Response {
    const response: ApiResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    };

    // Include error details in development
    if (process.env.NODE_ENV === 'development' && error) {
      response.details = {
        message: error.message,
        stack: error.stack
      };
    }

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  static badRequest(message: string = 'Bad request', details?: any): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  static response<T>(data: T, status: number = 200): Response {
    return new Response(JSON.stringify(this.success(data)), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const ApiResponse = ApiResponseBuilder;