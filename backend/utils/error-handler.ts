/**
 * 중앙화된 에러 핸들링 시스템
 */

import type { AppError } from '../types/common';
import { ResponseHelper } from './response-helper';

export class AppErrorClass extends Error implements AppError {
  statusCode: number;
  code: string;
  details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
  }
}

export class ErrorHandler {
  /**
   * 에러를 적절한 HTTP 응답으로 변환
   */
  static handleError(error: Error | AppError): Response {
    console.error('🚨 Error occurred:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error as AppError).statusCode && { statusCode: (error as AppError).statusCode },
      ...(error as AppError).code && { code: (error as AppError).code }
    });

    if (error instanceof AppErrorClass) {
      return ResponseHelper.error(
        error.message,
        error.statusCode,
        error.details
      );
    }

    // 알려진 에러 패턴 처리
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      return ResponseHelper.error('외부 서비스 연결에 실패했습니다', 503);
    }

    if (error.message.includes('timeout')) {
      return ResponseHelper.error('요청 시간이 초과되었습니다', 408);
    }

    if (error.message.includes('Invalid') || error.message.includes('validation')) {
      return ResponseHelper.badRequest(error.message);
    }

    // 기본 서버 에러
    return ResponseHelper.error('서버 내부 오류가 발생했습니다', 500);
  }

  /**
   * 비동기 함수를 에러 핸들링으로 감싸기
   */
  static asyncHandler(fn: Function) {
    return async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        return this.handleError(error as Error);
      }
    };
  }

  /**
   * 검증 에러 생성
   */
  static validationError(message: string, details?: any): AppErrorClass {
    return new AppErrorClass(message, 400, 'VALIDATION_ERROR', details);
  }

  /**
   * 인증 에러 생성
   */
  static authError(message: string = '인증이 필요합니다'): AppErrorClass {
    return new AppErrorClass(message, 401, 'AUTH_ERROR');
  }

  /**
   * 권한 에러 생성
   */
  static forbiddenError(message: string = '권한이 없습니다'): AppErrorClass {
    return new AppErrorClass(message, 403, 'FORBIDDEN_ERROR');
  }

  /**
   * 리소스 없음 에러 생성
   */
  static notFoundError(message: string = '리소스를 찾을 수 없습니다'): AppErrorClass {
    return new AppErrorClass(message, 404, 'NOT_FOUND_ERROR');
  }

  /**
   * 서비스 불가 에러 생성
   */
  static serviceUnavailableError(message: string = '서비스를 사용할 수 없습니다'): AppErrorClass {
    return new AppErrorClass(message, 503, 'SERVICE_UNAVAILABLE');
  }
}