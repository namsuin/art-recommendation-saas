import React from 'react';
import { AnalysisResults as AnalysisResultsType, Artwork } from '../utils/artworkUtils';
import { ArtworkCard } from './ArtworkCard';
import { ColorTag } from './ColorTag';
import { isProfessionalArtwork, isStudentWork, hasValidImage } from '../utils/artworkUtils';
import { useLanguage } from '../contexts/LanguageContext';

interface AnalysisResultsProps {
  analysisResults: AnalysisResultsType | null;
  onUpgradeClick?: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysisResults,
  onUpgradeClick
}) => {
  const { language } = useLanguage();
  if (!analysisResults) return null;

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      window.location.href = '/pricing';
    }
  };

  return (
    <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
      <h3 className="text-xl font-bold mb-4">
        {language === 'en' ? 'Multi-Image Analysis Results' : '다중 이미지 분석 결과'}
      </h3>
      
      {/* 공통 키워드 */}
      <div className="mb-6">
        <h4 className="font-semibold mb-3">
          {language === 'en' ? 'Common Keywords' : '공통 키워드'}
        </h4>
        {analysisResults.commonKeywords.trulyCommon && analysisResults.commonKeywords.trulyCommon.length > 0 ? (
          <div className="mb-3">
            <h5 className="text-sm font-medium text-green-700 mb-2">
              ✅ {language === 'en' 
                ? `Common keywords in all images (${analysisResults.commonKeywords.totalImages} images)`
                : `모든 이미지 공통 키워드 (${analysisResults.commonKeywords.totalImages}개 이미지)`}
            </h5>
            <div className="flex flex-wrap gap-2">
              {analysisResults.commonKeywords.trulyCommon.slice(0, 10).map((keyword, index) => (
                <span 
                  key={`common-${index}`}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold border-2 border-green-500"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {analysisResults.commonKeywords.frequent && analysisResults.commonKeywords.frequent.length > 0 ? (
          <div className="mb-3">
            <h5 className="text-sm font-medium text-blue-700 mb-2">
              📊 {language === 'en' ? 'High Frequency Keywords' : '빈도 높은 키워드'}
            </h5>
            <div className="flex flex-wrap gap-2">
              {analysisResults.commonKeywords.frequent.slice(0, 10).map((keyword, index) => (
                <span 
                  key={`frequent-${index}`}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm border border-blue-300"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">{language === 'en' ? 'Confidence: ' : '신뢰도: '}</span>
              <span className="font-semibold text-blue-600">
                {(analysisResults.commonKeywords.confidence * 100).toFixed(1)}%
              </span>
            </div>
            {analysisResults.similarityAnalysis && (
              <div>
                <span className="text-gray-600">{language === 'en' ? 'Average Similarity: ' : '평균 유사도: '}</span>
                <span className="font-semibold text-green-600">
                  {(analysisResults.similarityAnalysis.averageSimilarity * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 공통 색상 */}
      <div className="mb-6">
        <h4 className="font-semibold mb-3">{language === 'en' ? 'Common Colors' : '공통 색상'}</h4>
        {analysisResults.commonColors.trulyCommon && analysisResults.commonColors.trulyCommon.length > 0 ? (
          <div className="mb-3">
            <h5 className="text-sm font-medium text-green-700 mb-2">
              ✅ {language === 'en' 
                ? `Common colors in all images (${analysisResults.commonColors.totalImages} images)`
                : `모든 이미지 공통 색상 (${analysisResults.commonColors.totalImages}개 이미지)`}
            </h5>
            <div className="flex flex-wrap gap-2">
              {analysisResults.commonColors.trulyCommon.slice(0, 10).map((color, index) => (
                <ColorTag 
                  key={`common-color-${index}`} 
                  color={color} 
                  variant="common"
                />
              ))}
            </div>
          </div>
        ) : null}

        {analysisResults.commonColors.frequent && analysisResults.commonColors.frequent.length > 0 ? (
          <div className="mb-3">
            <h5 className="text-sm font-medium text-purple-700 mb-2">
              📊 {language === 'en' ? 'High Frequency Colors' : '빈도 높은 색상'}
            </h5>
            <div className="flex flex-wrap gap-2">
              {analysisResults.commonColors.frequent.slice(0, 10).map((color, index) => (
                <ColorTag 
                  key={`frequent-color-${index}`} 
                  color={color} 
                  variant="frequent"
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* 상위 매칭 이미지 */}
      {analysisResults.similarityAnalysis?.topMatches?.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold mb-2">{language === 'en' ? 'Top Matching Images' : '상위 매칭 이미지'}</h4>
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            {analysisResults.similarityAnalysis.topMatches.slice(0, 3).map((match, index) => (
              <div key={index} className="flex justify-between items-center py-1">
                <span className="text-sm font-medium">{match.title}</span>
                <span className="text-sm text-green-600 font-semibold">{match.similarity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 공통 키워드 없음 경고 */}
      {(!analysisResults.commonKeywords || !analysisResults.commonKeywords.keywords || analysisResults.commonKeywords.keywords.length === 0) && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            {language === 'en' 
              ? 'Could not find common keywords among uploaded images. Try uploading images with more similar styles.'
              : '업로드된 이미지들 간의 공통 키워드를 찾을 수 없습니다. 보다 유사한 스타일의 이미지들을 업로드해보세요.'}
          </p>
        </div>
      )}

      {/* 추천 작품 */}
      {analysisResults.recommendations && (
        analysisResults.recommendations.length > 0 || 
        (analysisResults.recommendations.internal?.length > 0) ||
        (analysisResults.recommendations.external?.length > 0)
      ) && (
        <div>
          <h4 className="font-semibold mb-4">{language === 'en' ? 'Recommended Artworks' : '추천 작품'}</h4>

          {/* AI 추천 작품 (Internal) */}
          {analysisResults.recommendations?.internal?.length > 0 && (
            <div className="mb-6">
              <h5 className="text-sm font-medium text-gray-600 mb-3">{language === 'en' ? 'AI Recommended Artworks' : 'AI 추천 작품'}</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {analysisResults.recommendations.internal
                  .slice(0, 8)
                  .filter((artwork: Artwork) => hasValidImage(artwork))
                  .map((artwork: any, index: number) => (
                    <ArtworkCard
                      key={index}
                      artwork={artwork}
                      index={index}
                      keyPrefix="internal"
                    />
                  ))}
              </div>
            </div>
          )}

          {/* 갤러리 추천 (External) */}
          {analysisResults.recommendations?.external?.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-sm font-medium text-gray-600">{language === 'en' ? 'Gallery Recommendations (External Platforms)' : '갤러리 추천 (외부 플랫폼)'}</h5>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {analysisResults.recommendations.external.slice(0, 10)
                  .filter((artwork: Artwork) => {
                    return isProfessionalArtwork(artwork) && hasValidImage(artwork);
                  })
                  .map((artwork: any, index: number) => (
                    <ArtworkCard
                      key={index}
                      artwork={artwork}
                      index={index}
                      keyPrefix="external"
                    />
                  ))}
              </div>

              {/* 학생 작품 섹션 */}
              {analysisResults.recommendations.external?.filter((artwork: Artwork) => {
                return isStudentWork(artwork) && hasValidImage(artwork);
              }).length > 0 && (
                <div className="mt-6">
                  <h5 className="text-sm font-medium text-purple-600 mb-3">🎓 {language === 'en' ? 'Student Works' : '학생 작품'}</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {analysisResults.recommendations.external
                      .filter((artwork: Artwork) => isStudentWork(artwork) && hasValidImage(artwork))
                      .slice(0, 8)
                      .map((artwork: any, index: number) => (
                        <ArtworkCard
                          key={index}
                          artwork={artwork}
                          index={index}
                          keyPrefix="student"
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* 프리미엄 업그레이드 안내 */}
              {analysisResults.recommendations.external.length > 10 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-600 mb-3">
                    {language === 'en' 
                      ? `Premium plan required to see ${analysisResults.recommendations.external.length - 10} additional artworks.`
                      : `추가 ${analysisResults.recommendations.external.length - 10}개의 작품을 확인하려면 프리미엄 플랜이 필요합니다.`}
                  </p>
                  <button
                    onClick={handleUpgrade}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    {language === 'en' ? 'Upgrade to Premium 💎' : '프리미엄으로 업그레이드 💎'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 기본 추천 (Array 형태) */}
          {Array.isArray(analysisResults.recommendations) && 
           !analysisResults.recommendations.internal && 
           !analysisResults.recommendations.external && 
           analysisResults.recommendations.length > 0 && (
            <div className="mb-6">
              <h5 className="text-sm font-medium text-gray-600 mb-3">{language === 'en' ? 'Recommended Artworks' : '추천 작품'}</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {analysisResults.recommendations
                  .slice(0, 12)
                  .filter((artwork: Artwork) => hasValidImage(artwork))
                  .map((artwork: any, index: number) => (
                    <ArtworkCard
                      key={index}
                      artwork={artwork}
                      index={index}
                      keyPrefix="default"
                    />
                  ))}
              </div>
            </div>
          )}

          {/* 추천 없음 안내 */}
          {(!analysisResults.recommendations || 
            (typeof analysisResults.recommendations === 'object' && 
             (analysisResults.recommendations.internal?.length || 0) === 0 &&
             (analysisResults.recommendations.external?.length || 0) === 0) ||
            (Array.isArray(analysisResults.recommendations) && analysisResults.recommendations.length === 0)) && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                {language === 'en'
                  ? 'No recommended artworks found. Please try again with different images.'
                  : '추천 작품을 찾을 수 없습니다. 다른 이미지로 다시 시도해보세요.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};