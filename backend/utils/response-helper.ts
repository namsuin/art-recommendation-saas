/**
 * API 응답 헬퍼 유틸리티
 */

import type { ApiResponse, PaginatedResponse } from '../types/common';

export class ResponseHelper {
  /**
   * 성공 응답 생성
   */
  static success<T>(data: T, message?: string): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * 에러 응답 생성
   */
  static error(error: string, statusCode: number = 500, details?: any): Response {
    const response: ApiResponse = {
      success: false,
      error,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    };

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * 페이지네이션 응답 생성
   */
  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): Response {
    const totalPages = Math.ceil(total / limit);
    
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * 부분 성공 응답 (일부 데이터 처리 실패)
   */
  static partial<T>(
    data: T,
    warnings: string[],
    message?: string
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      warnings
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * 인증 필요 응답
   */
  static unauthorized(message: string = '인증이 필요합니다'): Response {
    return this.error(message, 401);
  }

  /**
   * 권한 없음 응답
   */
  static forbidden(message: string = '권한이 없습니다'): Response {
    return this.error(message, 403);
  }

  /**
   * 리소스 없음 응답
   */
  static notFound(message: string = '리소스를 찾을 수 없습니다'): Response {
    return this.error(message, 404);
  }

  /**
   * 잘못된 요청 응답
   */
  static badRequest(message: string = '잘못된 요청입니다', details?: any): Response {
    return this.error(message, 400, details);
  }

  /**
   * 결제 필요 응답
   */
  static paymentRequired(message: string, paymentUrl?: string): Response {
    return this.error(message, 402, { paymentUrl });
  }

  /**
   * 요청 제한 초과 응답
   */
  static tooManyRequests(message: string = '요청 제한을 초과했습니다'): Response {
    return this.error(message, 429);
  }
}