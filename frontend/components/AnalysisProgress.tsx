import React from 'react';
import { Loader2, DollarSign } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AnalysisProgressProps {
  isAnalyzing: boolean;
  analysisProgress: {
    current: number;
    total: number;
  };
  currentAnalyzingImage?: string | null;
  imageCount: number;
  currentTier: string;
  pricingTiers: Record<string, { price: number }>;
  onAnalyze: () => void;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  isAnalyzing,
  analysisProgress,
  currentAnalyzingImage,
  imageCount,
  currentTier,
  pricingTiers,
  onAnalyze
}) => {
  const { t, language } = useLanguage();
  const progressPercentage = analysisProgress.total > 0 
    ? (analysisProgress.current / analysisProgress.total) * 100 
    : 0;

  return (
    <div className="mt-6 flex flex-col items-center space-y-4">
      {/* 진행 상황 표시 */}
      {isAnalyzing && (
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              {language === 'kr' ? `분석 진행 상황: ${analysisProgress.current}/${analysisProgress.total}` : `Analysis Progress: ${analysisProgress.current}/${analysisProgress.total}`}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          {currentAnalyzingImage && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              {language === 'kr' ? `현재 분석 중: ${currentAnalyzingImage}` : `Currently analyzing: ${currentAnalyzingImage}`}
            </p>
          )}
        </div>
      )}

      <button
        onClick={onAnalyze}
        disabled={imageCount === 0 || isAnalyzing}
        className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center
          ${imageCount === 0 || isAnalyzing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'}`}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {language === 'kr' ? `분석 중... (${analysisProgress.current}/${analysisProgress.total})` : `Analyzing... (${analysisProgress.current}/${analysisProgress.total})`}
          </>
        ) : (
          <>
            {pricingTiers[currentTier].price > 0 && (
              <DollarSign className="w-5 h-5 mr-1" />
            )}
            {language === 'kr' ? `${imageCount}장 분석하기` : `Analyze ${imageCount} image${imageCount > 1 ? 's' : ''}`}
            {pricingTiers[currentTier].price > 0 && (
              <span className="ml-1">(${pricingTiers[currentTier].price})</span>
            )}
          </>
        )}
      </button>
    </div>
  );
};