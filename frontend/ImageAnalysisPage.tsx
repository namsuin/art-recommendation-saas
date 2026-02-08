// pages/ImageAnalysisPage.tsx

import React, { useState, useCallback } from 'react';
import { useImageAnalysis } from '../hooks/useImageAnalysis';
import { AestheticScoreCard } from '../components/AestheticScoreCard';
import { TagsDisplay } from '../components/TagsDisplay';
import { ColorAnalysis } from '../components/ColorAnalysis';
import { CompositionAndContext } from '../components/CompositionAndContext';

export const ImageAnalysisPage: React.FC = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  
  const { analyzeImage, loading, result, error, reset } = useImageAnalysis();

  const handleFileSelect = useCallback(async (file: File) => {
    // 파일명 저장
    setFileName(file.name);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 분석 시작
    await analyzeImage(file);
  }, [analyzeImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setPreview(null);
    setFileName('');
    reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🎨 이미지 미학 분석
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            AI 기반 이미지 분석으로 미적 특성을 평가합니다
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 업로드 영역 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-200">
          <label className="block cursor-pointer">
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 scale-105'
                  : preview
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {preview ? (
                <div className="space-y-4">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-96 mx-auto rounded-lg shadow-md"
                  />
                  <div className="text-sm text-gray-600">
                    {fileName}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleReset();
                    }}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    다른 이미지 선택
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-7xl mb-4">📸</div>
                  <div className="text-lg font-semibold text-gray-700 mb-2">
                    이미지를 선택하거나 드래그하세요
                  </div>
                  <div className="text-sm text-gray-500">
                    JPG, PNG, GIF (최대 10MB)
                  </div>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={loading}
            />
          </label>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="bg-white rounded-xl shadow-lg p-12 mb-8 border border-gray-200">
            <div className="text-center">
              <div className="inline-block relative">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-2xl">🎨</div>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <div className="text-lg font-semibold text-gray-800">
                  이미지 분석 중...
                </div>
                <div className="text-sm text-gray-600">
                  AI가 이미지의 미학적 특성을 분석하고 있습니다
                </div>
              </div>
              
              {/* 로딩 단계 표시 */}
              <div className="mt-8 max-w-md mx-auto">
                <div className="space-y-3">
                  {[
                    '이미지 처리',
                    '색상 분석',
                    '구도 평가',
                    '스타일 감지',
                  ].map((step, index) => (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        index === 0 ? 'bg-blue-500 text-white animate-pulse' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="text-sm text-gray-600">{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 에러 표시 */}
        {error && !loading && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="text-3xl">❌</div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-red-900 mb-1">
                  분석 오류
                </div>
                <div className="text-sm text-red-700">
                  {error}
                </div>
                <button
                  onClick={handleReset}
                  className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors text-sm font-medium"
                >
                  다시 시도
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 분석 결과 */}
        {result && !loading && (
          <div className="space-y-6 animate-fadeIn">
            {/* 결과 헤더 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold mb-1">분석 완료! 🎉</div>
                  <div className="text-sm opacity-90">
                    이미지의 미학적 특성을 성공적으로 분석했습니다
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:shadow-lg transition-all font-semibold"
                >
                  새 분석
                </button>
              </div>
            </div>

            {/* 결과 그리드 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 왼쪽 열 */}
              <div className="space-y-6">
                <AestheticScoreCard result={result} />
                <TagsDisplay 
                  styleTags={result.styleTags} 
                  moodTags={result.moodTags} 
                />
              </div>

              {/* 오른쪽 열 */}
              <div className="space-y-6">
                <CompositionAndContext 
                  composition={result.composition} 
                  context={result.context} 
                />
                <ColorAnalysis colorAnalysis={result.colorAnalysis} />
              </div>
            </div>

            {/* 요약 카드 */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
              <div className="flex items-start gap-4">
                <div className="text-4xl">💡</div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-gray-900 mb-2">
                    분석 요약
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed space-y-1">
                    <p>
                      이 이미지는 <strong>{result.aestheticScore}점</strong>의 미적 점수를 받았으며, 
                      {result.isArtLike && ' 예술적 가치가 높은 작품으로'}
                      {' '}
                      <strong>{result.complexity === 'high' ? '풍부한' : result.complexity === 'medium' ? '적절한' : '간결한'}</strong> 복잡도를 보입니다.
                    </p>
                    {result.context && (
                      <p>
                        <strong>{result.context.category === 'portrait' ? '인물 사진' : 
                                 result.context.category === 'landscape' ? '풍경 사진' : 
                                 result.context.category}</strong> 카테고리로 분류되었으며,
                        {result.context.isProfessionalPhoto && ' 전문적인 촬영 기법이 돋보입니다.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ImageAnalysisPage;
