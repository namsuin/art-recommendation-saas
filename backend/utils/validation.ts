// 중앙화된 유효성 검사 시스템

import { ApiErrors, ApiErrorDetail } from './api-error';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'uuid' | 'url';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null; // null이면 유효, string이면 에러 메시지
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export class Validator {
  static validate(data: any, schema: ValidationSchema, requestId?: string): void {
    const errors: ApiErrorDetail[] = [];

    for (const [fieldName, rule] of Object.entries(schema)) {
      const value = data[fieldName];
      const fieldErrors = this.validateField(fieldName, value, rule);
      errors.push(...fieldErrors);
    }

    if (errors.length > 0) {
      throw ApiErrors.validation('입력 데이터가 올바르지 않습니다.', errors, requestId);
    }
  }

  private static validateField(fieldName: string, value: any, rule: ValidationRule): ApiErrorDetail[] {
    const errors: ApiErrorDetail[] = [];

    // 필수 필드 검사
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: fieldName,
        message: `${fieldName}은(는) 필수 항목입니다.`,
        code: 'REQUIRED'
      });
      return errors; // 필수 필드가 없으면 다른 검사는 의미 없음
    }

    // 값이 없으면 추가 검사 생략
    if (value === undefined || value === null || value === '') {
      return errors;
    }

    // 타입 검사
    if (rule.type) {
      const typeError = this.validateType(fieldName, value, rule.type);
      if (typeError) errors.push(typeError);
    }

    // 문자열 길이 검사
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push({
          field: fieldName,
          message: `${fieldName}은(는) 최소 ${rule.minLength}자 이상이어야 합니다.`,
          code: 'MIN_LENGTH'
        });
      }
      
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push({
          field: fieldName,
          message: `${fieldName}은(는) 최대 ${rule.maxLength}자까지 입력 가능합니다.`,
          code: 'MAX_LENGTH'
        });
      }
    }

    // 숫자 범위 검사
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field: fieldName,
          message: `${fieldName}은(는) ${rule.min} 이상이어야 합니다.`,
          code: 'MIN_VALUE'
        });
      }
      
      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field: fieldName,
          message: `${fieldName}은(는) ${rule.max} 이하여야 합니다.`,
          code: 'MAX_VALUE'
        });
      }
    }

    // 패턴 검사
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} 형식이 올바르지 않습니다.`,
          code: 'INVALID_FORMAT'
        });
      }
    }

    // 커스텀 검사
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        errors.push({
          field: fieldName,
          message: customError,
          code: 'CUSTOM_VALIDATION'
        });
      }
    }

    return errors;
  }

  private static validateType(fieldName: string, value: any, expectedType: string): ApiErrorDetail | null {
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field: fieldName,
            message: `${fieldName}은(는) 문자열이어야 합니다.`,
            code: 'INVALID_TYPE'
          };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            field: fieldName,
            message: `${fieldName}은(는) 숫자여야 합니다.`,
            code: 'INVALID_TYPE'
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field: fieldName,
            message: `${fieldName}은(는) true/false 값이어야 합니다.`,
            code: 'INVALID_TYPE'
          };
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !this.isValidEmail(value)) {
          return {
            field: fieldName,
            message: `${fieldName}은(는) 올바른 이메일 형식이어야 합니다.`,
            code: 'INVALID_EMAIL'
          };
        }
        break;

      case 'uuid':
        if (typeof value !== 'string' || !this.isValidUUID(value)) {
          return {
            field: fieldName,
            message: `${fieldName}은(는) 올바른 UUID 형식이어야 합니다.`,
            code: 'INVALID_UUID'
          };
        }
        break;

      case 'url':
        if (typeof value !== 'string' || !this.isValidURL(value)) {
          return {
            field: fieldName,
            message: `${fieldName}은(는) 올바른 URL 형식이어야 합니다.`,
            code: 'INVALID_URL'
          };
        }
        break;
    }

    return null;
  }

  // 유틸리티 메서드들
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private static isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// 공통 검증 스키마들
export const CommonSchemas = {
  // 사용자 인증
  signUp: {
    email: { required: true, type: 'email' as const, maxLength: 255 },
    password: { required: true, type: 'string' as const, minLength: 8, maxLength: 128 },
    displayName: { required: false, type: 'string' as const, minLength: 2, maxLength: 50 }
  },

  signIn: {
    email: { required: true, type: 'email' as const },
    password: { required: true, type: 'string' as const, minLength: 1 }
  },

  // 파일 업로드
  fileUpload: {
    userId: { required: true, type: 'uuid' as const }
  },

  // 이미지 분석
  imageAnalysis: {
    userId: { required: false, type: 'uuid' as const },
    tasteGroupId: { required: false, type: 'uuid' as const },
    uploadId: { required: false, type: 'uuid' as const }
  },

  // 페이지네이션
  pagination: {
    page: { 
      required: false, 
      type: 'number' as const, 
      min: 1,
      custom: (value: any) => {
        const num = parseInt(value);
        return isNaN(num) ? '페이지는 숫자여야 합니다.' : null;
      }
    },
    limit: { 
      required: false, 
      type: 'number' as const, 
      min: 1, 
      max: 100,
      custom: (value: any) => {
        const num = parseInt(value);
        return isNaN(num) ? '제한 수는 숫자여야 합니다.' : null;
      }
    }
  },

  // ID 파라미터
  userId: {
    userId: { required: true, type: 'uuid' as const }
  }
};

// 편의 함수들
export function validateSignUp(data: any, requestId?: string): void {
  Validator.validate(data, CommonSchemas.signUp, requestId);
}

export function validateSignIn(data: any, requestId?: string): void {
  Validator.validate(data, CommonSchemas.signIn, requestId);
}

export function validatePagination(params: URLSearchParams, requestId?: string): { page: number; limit: number } {
  const data = {
    page: params.get('page'),
    limit: params.get('limit')
  };
  
  Validator.validate(data, CommonSchemas.pagination, requestId);
  
  return {
    page: parseInt(data.page || '1'),
    limit: parseInt(data.limit || '20')
  };
}

export function validateUserId(data: any, requestId?: string): void {
  Validator.validate(data, CommonSchemas.userId, requestId);
}