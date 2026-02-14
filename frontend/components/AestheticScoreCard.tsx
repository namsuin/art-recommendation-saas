// components/AestheticScoreCard.tsx

import * as React from 'react';
import type { AestheticAnalysisResult } from '../types/aesthetic';
import { complexityTranslations } from '../utils/translations';

interface Props {
  result: AestheticAnalysisResult;
}

export const AestheticScoreCard: React.FC<Props> = ({ result }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getScoreGradient = (score: number): string => {
    if (score >= 80) return 'from-green-500 to-emerald-600';
    if (score >= 60) return 'from-blue-500 to-cyan-600';
    if (score >= 40) return 'from-yellow-500 to-orange-600';
    return 'from-gray-500 to-gray-600';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return '탁월함';
    if (score >= 60) return '우수함';
    if (score >= 40) return '보통';
    return '개선 필요';
  };

  const getScoreDescription = (score: number): string => {
    if (score >= 80) return '매우 높은 미적 가치를 가진 이미지입니다';
    if (score >= 60) return '우수한 미적 특성을 보이는 이미지입니다';
    if (score >= 40) return '적절한 미적 특성을 가지고 있습니다';
    return '미적 특성을 더 개선할 수 있습니다';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      {/* 메인 점수 섹션 */}
      <div className="text-center mb-6 pb-6 border-b border-gray-100">
        {/* 원형 진행 표시기 */}
        <div className="relative inline-flex items-center justify-center mb-4">
          <svg className="w-40 h-40">
            <circle
              className="text-gray-200"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r="68"
              cx="80"
              cy="80"
            />
            <circle
              className={`text-transparent bg-gradient-to-r ${getScoreGradient(result.aestheticScore)}`}
              strokeWidth="8"
              strokeDasharray={426.2}
              strokeDashoffset={426.2 - (426.2 * result.aestheticScore) / 100}
              strokeLinecap="round"
              stroke="url(#gradient)"
              fill="transparent"
              r="68"
              cx="80"
              cy="80"
              style={{ 
                transition: 'stroke-dashoffset 1s ease-in-out',
                transform: 'rotate(-90deg)',
                transformOrigin: 'center'
              }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" className={getScoreGradient(result.aestheticScore).split(' ')[0].replace('from-', 'text-')} />
                <stop offset="100%" className={getScoreGradient(result.aestheticScore).split(' ')[1].replace('to-', 'text-')} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute">
            <div className={`text-5xl font-bold ${getScoreColor(result.aestheticScore)}`}>
              {result.aestheticScore}
            </div>
          </div>
        </div>

        <div className="text-xl font-semibold text-gray-800 mb-1">
          {getScoreLabel(result.aestheticScore)}
        </div>
        <div className="text-sm text-gray-500">
          {getScoreDescription(result.aestheticScore)}
        </div>
      </div>

      {/* 신뢰도 표시 */}
      <div className="mb-6 pb-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">분석 신뢰도</span>
          <span className="text-sm font-bold text-gray-900">{result.confidence}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${result.confidence}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {result.confidence >= 80 && '매우 확실한 분석 결과입니다'}
          {result.confidence >= 60 && result.confidence < 80 && '신뢰할 만한 분석 결과입니다'}
          {result.confidence < 60 && '참고용으로 활용하세요'}
        </div>
      </div>

      {/* 아트워크 여부 */}
      {result.isArtLike && (
        <div className="mb-6 pb-6 border-b border-gray-100">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎨</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-purple-900">
                  예술적 가치 인정
                </div>
                <div className="text-xs text-purple-700 mt-1">
                  이 이미지는 높은 예술적 특성을 가지고 있습니다
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 복잡도 */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-3">복잡도 수준</div>
        <div className="flex gap-2">
          {(['low', 'medium', 'high'] as const).map((level) => (
            <div
              key={level}
              className={`flex-1 rounded-lg transition-all duration-300 ${
                result.complexity === level
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              <div className="py-3 text-center">
                <div className="text-xs font-medium">
                  {complexityTranslations[level]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
