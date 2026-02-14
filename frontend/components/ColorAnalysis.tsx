// components/ColorAnalysis.tsx

import * as React from 'react';
import { AestheticAnalysisResult } from '../types/aesthetic';
import { paletteTranslations } from '../utils/translations';

interface Props {
  colorAnalysis: AestheticAnalysisResult['colorAnalysis'];
}

export const ColorAnalysis: React.FC<Props> = ({ colorAnalysis }) => {
  if (!colorAnalysis) return null;

  const getPaletteIcon = (palette: string): string => {
    const icons: Record<string, string> = {
      'warm': '🔥',
      'cool': '❄️',
      'vibrant': '🌈',
      'neutral': '⚪',
    };
    return icons[palette] || '🎨';
  };

  const getPaletteGradient = (palette: string): string => {
    const gradients: Record<string, string> = {
      'warm': 'from-orange-400 via-red-400 to-yellow-400',
      'cool': 'from-blue-400 via-cyan-400 to-teal-400',
      'vibrant': 'from-pink-400 via-purple-400 to-blue-400',
      'neutral': 'from-gray-400 via-gray-500 to-gray-600',
    };
    return gradients[palette] || 'from-gray-400 to-gray-600';
  };

  const getMetricColor = (metric: 'diversity' | 'saturation' | 'brightness', value: number): string => {
    if (metric === 'diversity') {
      return value > 70 ? 'from-purple-400 to-pink-500' : 
             value > 40 ? 'from-blue-400 to-purple-500' : 
             'from-gray-400 to-blue-400';
    }
    if (metric === 'saturation') {
      return value > 70 ? 'from-pink-400 to-red-500' : 
             value > 40 ? 'from-orange-400 to-pink-500' : 
             'from-gray-400 to-orange-400';
    }
    // brightness
    return value > 70 ? 'from-yellow-300 to-white' : 
           value > 40 ? 'from-gray-400 to-yellow-300' : 
           'from-gray-700 to-gray-400';
  };

  const getMetricLabel = (metric: 'diversity' | 'saturation' | 'brightness', value: number): string => {
    if (metric === 'diversity') {
      return value > 70 ? '매우 다채로움' : value > 40 ? '적절함' : '단조로움';
    }
    if (metric === 'saturation') {
      return value > 70 ? '매우 선명함' : value > 40 ? '적절함' : '차분함';
    }
    // brightness
    return value > 70 ? '매우 밝음' : value > 40 ? '적절함' : '어두움';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span className="text-xl">🎨</span>
        <span>색상 분석</span>
      </h3>

      {/* 팔레트 카드 */}
      <div className="mb-6 p-5 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getPaletteGradient(colorAnalysis.dominantPalette)} shadow-lg flex items-center justify-center text-2xl`}>
            {getPaletteIcon(colorAnalysis.dominantPalette)}
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">주요 색상 팔레트</div>
            <div className="text-lg font-bold text-gray-900">
              {paletteTranslations[colorAnalysis.dominantPalette] || colorAnalysis.dominantPalette}
            </div>
          </div>
        </div>
      </div>

      {/* 색상 특성 */}
      <div className="space-y-5">
        {/* 다양성 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">다양성</span>
              <span className="text-xs text-gray-500">
                {getMetricLabel('diversity', colorAnalysis.diversity)}
              </span>
            </div>
            <span className="text-sm font-bold text-gray-900">{colorAnalysis.diversity}%</span>
          </div>
          <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-4 rounded-full bg-gradient-to-r ${getMetricColor('diversity', colorAnalysis.diversity)} transition-all duration-1000 ease-out shadow-inner`}
              style={{ width: `${colorAnalysis.diversity}%` }}
            />
          </div>
        </div>

        {/* 채도 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">채도</span>
              <span className="text-xs text-gray-500">
                {getMetricLabel('saturation', colorAnalysis.saturation)}
              </span>
            </div>
            <span className="text-sm font-bold text-gray-900">{colorAnalysis.saturation}%</span>
          </div>
          <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-4 rounded-full bg-gradient-to-r ${getMetricColor('saturation', colorAnalysis.saturation)} transition-all duration-1000 ease-out shadow-inner`}
              style={{ width: `${colorAnalysis.saturation}%` }}
            />
          </div>
        </div>

        {/* 명도 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">명도</span>
              <span className="text-xs text-gray-500">
                {getMetricLabel('brightness', colorAnalysis.brightness)}
              </span>
            </div>
            <span className="text-sm font-bold text-gray-900">{colorAnalysis.brightness}%</span>
          </div>
          <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-4 rounded-full bg-gradient-to-r ${getMetricColor('brightness', colorAnalysis.brightness)} transition-all duration-1000 ease-out shadow-inner`}
              style={{ width: `${colorAnalysis.brightness}%` }}
            />
          </div>
        </div>
      </div>

      {/* 색상 조화 인사이트 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="text-xs font-semibold text-blue-900 mb-2">💡 색상 분석 인사이트</div>
        <div className="text-xs text-blue-800 leading-relaxed">
          {colorAnalysis.diversity > 70 && colorAnalysis.saturation > 60 && 
            '매우 다채롭고 생동감 넘치는 색상 구성입니다.'}
          {colorAnalysis.diversity < 30 && colorAnalysis.saturation < 40 && 
            '차분하고 통일감 있는 색상 구성입니다.'}
          {colorAnalysis.brightness > 70 && 
            ' 밝고 명랑한 느낌을 전달합니다.'}
          {colorAnalysis.brightness < 30 && 
            ' 어둡고 신비로운 분위기를 연출합니다.'}
          {!((colorAnalysis.diversity > 70 && colorAnalysis.saturation > 60) || 
             (colorAnalysis.diversity < 30 && colorAnalysis.saturation < 40)) &&
            '균형잡힌 색상 구성을 보여줍니다.'}
        </div>
      </div>
    </div>
  );
};
