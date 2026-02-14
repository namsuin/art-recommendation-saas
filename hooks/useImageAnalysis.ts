// hooks/useImageAnalysis.ts

import { useState, useCallback } from 'react';
import type { AestheticAnalysisResult, ImageAnalysisResponse } from '../types/aesthetic';

interface UseImageAnalysisReturn {
  analyzeImage: (file: File) => Promise<AestheticAnalysisResult | null>;
  loading: boolean;
  result: AestheticAnalysisResult | null;
  error: string | null;
  reset: () => void;
}

export const useImageAnalysis = (apiEndpoint: string = '/api/analyze-image'): UseImageAnalysisReturn => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AestheticAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeImage = useCallback(async (file: File): Promise<AestheticAnalysisResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // 파일 크기 체크 (예: 10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('파일 크기가 너무 큽니다. 10MB 이하의 이미지를 업로드해주세요.');
      }

      // 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        throw new Error('이미지 파일만 업로드 가능합니다.');
      }

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `분석 실패 (${response.status})`);
      }

      const data: ImageAnalysisResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || '분석에 실패했습니다.');
      }

      setResult(data.aesthetic);
      return data.aesthetic;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('Image analysis error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { 
    analyzeImage, 
    loading, 
    result, 
    error,
    reset 
  };
};
