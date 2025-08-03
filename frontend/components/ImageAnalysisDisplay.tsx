import React from 'react';

interface AnalysisResult {
  keywords: string[];
  colors: string[];
  style: string;
  mood: string;
  confidence: number;
  aiServices?: {
    google_vision?: { detected: boolean; labels?: string[]; colors?: string[] };
    clarifai?: { detected: boolean; concepts?: string[] };
    local_clip?: { detected: boolean; features?: string[] };
  };
}

interface ImageAnalysisDisplayProps {
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
}

export const ImageAnalysisDisplay: React.FC<ImageAnalysisDisplayProps> = ({ analysis, isAnalyzing }) => {
  console.log('🎨 ImageAnalysisDisplay render:', { analysis, isAnalyzing });
  
  if (isAnalyzing) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">AI가 이미지를 분석하고 있습니다...</h3>
            <p className="text-sm text-gray-600">Google Vision, Clarifai 등 여러 AI 모델이 작동 중입니다</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="text-2xl mr-2">🔍</span>
        AI 이미지 분석 결과
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 키워드 */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-700 flex items-center">
            <span className="text-lg mr-2">🏷️</span>
            감지된 키워드
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.keywords.map((keyword, idx) => (
              <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* 색상 */}
        {analysis.colors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700 flex items-center">
              <span className="text-lg mr-2">🎨</span>
              주요 색상
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.colors.map((color, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <div 
                    className="w-6 h-6 rounded-full border border-gray-300"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-gray-600">{color}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 스타일 & 분위기 */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-700 flex items-center">
            <span className="text-lg mr-2">🎭</span>
            스타일 & 분위기
          </h4>
          <div className="text-sm text-gray-600">
            <p><span className="font-medium">스타일:</span> {analysis.style}</p>
            <p><span className="font-medium">분위기:</span> {analysis.mood}</p>
          </div>
        </div>

        {/* 신뢰도 */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-700 flex items-center">
            <span className="text-lg mr-2">📊</span>
            분석 신뢰도
          </h4>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${analysis.confidence * 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">{(analysis.confidence * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* AI 서비스별 상세 정보 */}
      {analysis.aiServices && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-semibold text-gray-700 mb-3">AI 모델별 분석 결과</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {/* Google Vision */}
            {analysis.aiServices.google_vision && (
              <div className={`p-3 rounded-lg ${analysis.aiServices.google_vision.detected ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Google Vision AI</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    analysis.aiServices.google_vision.detected ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {analysis.aiServices.google_vision.detected ? '활성' : '비활성'}
                  </span>
                </div>
                {analysis.aiServices.google_vision.labels && (
                  <p className="text-gray-600">
                    {analysis.aiServices.google_vision.labels.slice(0, 3).join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Clarifai */}
            {analysis.aiServices.clarifai && (
              <div className={`p-3 rounded-lg ${analysis.aiServices.clarifai.detected ? 'bg-purple-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Clarifai AI</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    analysis.aiServices.clarifai.detected ? 'bg-purple-200 text-purple-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {analysis.aiServices.clarifai.detected ? '활성' : '비활성'}
                  </span>
                </div>
                {analysis.aiServices.clarifai.concepts && (
                  <p className="text-gray-600">
                    {analysis.aiServices.clarifai.concepts.slice(0, 3).join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Local CLIP */}
            {analysis.aiServices.local_clip && (
              <div className={`p-3 rounded-lg ${analysis.aiServices.local_clip.detected ? 'bg-orange-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Local CLIP</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    analysis.aiServices.local_clip.detected ? 'bg-orange-200 text-orange-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {analysis.aiServices.local_clip.detected ? '활성' : '비활성'}
                  </span>
                </div>
                {analysis.aiServices.local_clip.features && (
                  <p className="text-gray-600">
                    예술 특화 분석 완료
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};