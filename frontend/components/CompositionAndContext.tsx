// components/CompositionAndContext.tsx

import * as React from 'react';
import { AestheticAnalysisResult } from '../types/aesthetic';
import { 
  categoryTranslations, 
  distributionTranslations, 
  weightTranslations 
} from '../utils/translations';

interface Props {
  composition: AestheticAnalysisResult['composition'];
  context: AestheticAnalysisResult['context'];
}

export const CompositionAndContext: React.FC<Props> = ({ composition, context }) => {
  if (!composition && !context) return null;

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      'portrait': '👤',
      'landscape': '🏞️',
      'abstract': '🎨',
      'architecture': '🏛️',
      'still-life': '🍎',
      'general': '🖼️',
    };
    return icons[category] || '🖼️';
  };

  const getDistributionIcon = (dist: string): string => {
    const icons: Record<string, string> = {
      'balanced': '⚖️',
      'scattered': '✨',
      'clustered': '🎯',
    };
    return icons[dist] || '📐';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      {/* 이미지 분류 섹션 */}
      {context && (
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">🔍</span>
            <span>이미지 분류</span>
          </h3>

          {/* 카테고리 */}
          <div className="mb-4 p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-lg border-2 border-indigo-200">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{getCategoryIcon(context.category)}</div>
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-900">
                  {categoryTranslations[context.category] || context.category}
                </div>
                <div className="text-xs text-gray-600 mt-1">주요 카테고리</div>
              </div>
            </div>
          </div>

          {/* 특성 그리드 */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-3 rounded-lg text-center transition-all ${
              context.hasHuman 
                ? 'bg-green-50 border-2 border-green-300 shadow-sm' 
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="text-2xl mb-1">{context.hasHuman ? '👥' : '🚫'}</div>
              <div className="text-xs font-medium text-gray-700">인물</div>
              <div className="text-xs text-gray-500 mt-1">
                {context.hasHuman ? '포함' : '없음'}
              </div>
            </div>

            <div className={`p-3 rounded-lg text-center transition-all ${
              context.isProfessionalPhoto 
                ? 'bg-blue-50 border-2 border-blue-300 shadow-sm' 
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="text-2xl mb-1">{context.isProfessionalPhoto ? '📸' : '📱'}</div>
              <div className="text-xs font-medium text-gray-700">촬영</div>
              <div className="text-xs text-gray-500 mt-1">
                {context.isProfessionalPhoto ? '전문가' : '일반'}
              </div>
            </div>

            <div className={`p-3 rounded-lg text-center transition-all ${
              context.isArtwork 
                ? 'bg-purple-50 border-2 border-purple-300 shadow-sm' 
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="text-2xl mb-1">{context.isArtwork ? '🎨' : '📄'}</div>
              <div className="text-xs font-medium text-gray-700">예술</div>
              <div className="text-xs text-gray-500 mt-1">
                {context.isArtwork ? '작품' : '일반'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 구도 분석 섹션 */}
      {composition && (
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">📐</span>
            <span>구도 분석</span>
          </h3>

          <div className="space-y-3">
            {/* 대칭성과 중앙 집중 */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-lg border-2 transition-all ${
                composition.hasSymmetry 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-md' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="text-center">
                  <div className="text-3xl mb-2">
                    {composition.hasSymmetry ? '✅' : '⬜'}
                  </div>
                  <div className="text-sm font-bold text-gray-800">대칭성</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {composition.hasSymmetry ? '균형잡힌 구도' : '비대칭 구도'}
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border-2 transition-all ${
                composition.centerFocus 
                  ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300 shadow-md' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="text-center">
                  <div className="text-3xl mb-2">
                    {composition.centerFocus ? '🎯' : '⬜'}
                  </div>
                  <div className="text-sm font-bold text-gray-800">중앙 집중</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {composition.centerFocus ? '중심 강조' : '분산 배치'}
                  </div>
                </div>
              </div>
            </div>

            {/* 객체 분포 */}
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-300">
              <div className="flex items-center gap-3">
                <div className="text-3xl">
                  {getDistributionIcon(composition.objectDistribution)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-800">객체 배치</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {distributionTranslations[composition.objectDistribution] || composition.objectDistribution}
                  </div>
                </div>
              </div>
            </div>

            {/* 시각적 무게 */}
            <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border-2 border-orange-300">
              <div className="text-sm font-bold text-gray-800 mb-3">시각적 무게감</div>
              <div className="flex gap-2">
                {(['light', 'medium', 'heavy'] as const).map((weight) => (
                  <div
                    key={weight}
                    className={`flex-1 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                      composition.visualWeight === weight
                        ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-lg scale-105'
                        : 'bg-white text-gray-400 border border-gray-200'
                    }`}
                  >
                    {weightTranslations[weight] || weight}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
