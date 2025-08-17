import React, { useState, useEffect } from 'react';

interface SmartRecommendation {
  artworkId: string;
  title: string;
  artist: string;
  imageUrl: string;
  thumbnailUrl: string;
  category: string;
  style: string;
  colors: string[];
  score: number;
  confidence: number;
  reasoning: string[];
  similarityFactors: {
    styleMatch: number;
    colorMatch: number;
    categoryMatch: number;
    userBehaviorMatch: number;
    collaborativeFiltering: number;
  };
  metadata: {
    created: string;
    popularity: number;
    trendingScore: number;
    viewCount: number;
    likeCount: number;
  };
}

interface UserPreference {
  categories: Record<string, number>;
  styles: Record<string, number>;
  colors: Record<string, number>;
  confidence: number;
}

interface PersonalizedRecommendationsProps {
  userId: string | null;
}

export const PersonalizedRecommendations: React.FC<PersonalizedRecommendationsProps> = ({ userId }) => {
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [userPreferences, setUserPreferences] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Recommendation settings
  const [diversityFactor, setDiversityFactor] = useState(0.3);
  const [freshnessFactor, setFreshnessFactor] = useState(0.2);
  const [includeCollaborative, setIncludeCollaborative] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'detailed'>('grid');
  const [selectedRecommendation, setSelectedRecommendation] = useState<SmartRecommendation | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUserPreferences();
      fetchRecommendations();
    }
  }, [userId]);

  const fetchUserPreferences = async () => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/recommendations/preferences/${userId}`);
      const result = await response.json();
      if (result.success && result.data) {
        setUserPreferences(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
    }
  };

  const fetchRecommendations = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const params = {
        userId,
        count: 20,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        diversityFactor,
        freshnessFactor,
        similarUsers: includeCollaborative
      };

      const response = await fetch('/api/recommendations/personalized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      const result = await response.json();
      if (result.success && result.data) {
        setRecommendations(result.data);
      } else {
        setError(result.error || '추천을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      setError('추천 시스템 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const recordInteraction = async (
    artworkId: string, 
    interactionType: 'view' | 'like' | 'save' | 'share'
  ) => {
    if (!userId) return;

    try {
      await fetch('/api/recommendations/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          artworkId,
          interactionType,
          duration: 0,
          timestamp: new Date().toISOString(),
          context: {
            sessionId: `session_${Date.now()}`,
            device: 'web',
            location: window.location.pathname
          }
        })
      });
    } catch (error) {
      console.error('Failed to record interaction:', error);
    }
  };

  const handleArtworkClick = (recommendation: SmartRecommendation) => {
    setSelectedRecommendation(recommendation);
    recordInteraction(recommendation.artworkId, 'view');
  };

  const handleLike = (artworkId: string) => {
    recordInteraction(artworkId, 'like');
    // UI 업데이트 로직 추가 가능
  };

  const handleSave = (artworkId: string) => {
    recordInteraction(artworkId, 'save');
    // UI 업데이트 로직 추가 가능
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.6) return 'text-green-600'; // Lowered from 0.8
    if (confidence >= 0.4) return 'text-yellow-600'; // Lowered from 0.6
    return 'text-orange-600'; // Changed from red to orange for better UX
  };

  const getFactorLabel = (factor: string) => {
    const labels: Record<string, string> = {
      styleMatch: '스타일 일치도',
      colorMatch: '색상 일치도',
      categoryMatch: '카테고리 일치도',
      userBehaviorMatch: '행동 패턴 일치도',
      collaborativeFiltering: '유사 사용자 선호도'
    };
    return labels[factor] || factor;
  };

  if (!userId) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">개인화 추천을 받으려면 로그인이 필요합니다.</p>
          <p className="text-sm">로그인하면 당신의 취향을 학습하여 맞춤형 작품을 추천해드립니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">AI 개인화 추천</h2>
        
        {/* User Preferences Summary */}
        {userPreferences && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium mb-2">당신의 취향 분석</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">선호 카테고리:</span>
                <ul className="mt-1">
                  {Object.entries(userPreferences.categories)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([category, score]) => (
                      <li key={category} className="text-gray-600">
                        {category} ({Math.round(score * 100)}%)
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <span className="font-medium">선호 스타일:</span>
                <ul className="mt-1">
                  {Object.entries(userPreferences.styles)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([style, score]) => (
                      <li key={style} className="text-gray-600">
                        {style} ({Math.round(score * 100)}%)
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <span className="font-medium">분석 신뢰도:</span>
                <p className={`mt-1 font-medium ${getConfidenceColor(userPreferences.confidence)}`}>
                  {Math.round(userPreferences.confidence * 100)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recommendation Settings */}
        <div className="border rounded-lg p-4 mb-4">
          <h3 className="font-medium mb-3">추천 설정</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                다양성 선호도: {Math.round(diversityFactor * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={diversityFactor * 100}
                onChange={(e) => setDiversityFactor(Number(e.target.value) / 100)}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                높을수록 다양한 스타일의 작품을 추천합니다
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                최신작 선호도: {Math.round(freshnessFactor * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={freshnessFactor * 100}
                onChange={(e) => setFreshnessFactor(Number(e.target.value) / 100)}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                높을수록 최근에 등록된 작품을 우선 추천합니다
              </p>
            </div>
          </div>

          <div className="mt-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeCollaborative}
                onChange={(e) => setIncludeCollaborative(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">
                유사한 취향을 가진 사용자들의 선호도 반영
              </span>
            </label>
          </div>

          <button
            onClick={fetchRecommendations}
            disabled={loading}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '추천 생성 중...' : '새로운 추천 받기'}
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded ${
                viewMode === 'grid' 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              그리드 보기
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1 rounded ${
                viewMode === 'detailed' 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              상세 보기
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600">⚠️ {error}</p>
        </div>
      )}

      {/* Recommendations Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((rec) => (
            <div
              key={rec.artworkId}
              className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleArtworkClick(rec)}
            >
              <img
                src={rec.thumbnailUrl}
                alt={rec.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h4 className="font-semibold text-lg">{rec.title}</h4>
                <p className="text-sm text-gray-600">{rec.artist}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    매치율: {Math.round(rec.score * 100)}%
                  </span>
                  <span className={`text-sm font-medium ${getConfidenceColor(rec.confidence)}`}>
                    신뢰도 {Math.round(rec.confidence * 100)}%
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {rec.reasoning.slice(0, 2).map((reason, idx) => (
                    <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {reason}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(rec.artworkId);
                    }}
                    className="text-gray-500 hover:text-red-500"
                  >
                    ❤️ {rec.metadata.likeCount}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSave(rec.artworkId);
                    }}
                    className="text-gray-500 hover:text-blue-500"
                  >
                    💾 저장
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div key={rec.artworkId} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <img
                  src={rec.thumbnailUrl}
                  alt={rec.title}
                  className="w-32 h-32 object-cover rounded"
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{rec.title}</h4>
                  <p className="text-sm text-gray-600">{rec.artist}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {rec.category} • {rec.style}
                  </p>
                  
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                    {Object.entries(rec.similarityFactors).map(([factor, value]) => (
                      <div key={factor} className="bg-gray-50 rounded p-2">
                        <div className="font-medium">{getFactorLabel(factor)}</div>
                        <div className="text-gray-600">{Math.round(value * 100)}%</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {rec.reasoning.map((reason, idx) => (
                        <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {reason}
                        </span>
                      ))}
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleLike(rec.artworkId)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        ❤️ {rec.metadata.likeCount}
                      </button>
                      <button
                        onClick={() => handleSave(rec.artworkId)}
                        className="text-gray-500 hover:text-blue-500"
                      >
                        💾 저장
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Recommendation Modal */}
      {selectedRecommendation && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedRecommendation(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold">{selectedRecommendation.title}</h3>
                <button
                  onClick={() => setSelectedRecommendation(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <img
                src={selectedRecommendation.imageUrl}
                alt={selectedRecommendation.title}
                className="w-full rounded-lg mb-4"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">작품 정보</h4>
                  <p className="text-gray-600">작가: {selectedRecommendation.artist}</p>
                  <p className="text-gray-600">카테고리: {selectedRecommendation.category}</p>
                  <p className="text-gray-600">스타일: {selectedRecommendation.style}</p>
                  <p className="text-gray-600">
                    생성일: {new Date(selectedRecommendation.metadata.created).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">추천 이유</h4>
                  <ul className="list-disc list-inside text-gray-600">
                    {selectedRecommendation.reasoning.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="font-semibold mb-2">매칭 분석</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.entries(selectedRecommendation.similarityFactors).map(([factor, value]) => (
                    <div key={factor} className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-sm font-medium">{getFactorLabel(factor)}</div>
                      <div className="text-2xl font-bold text-blue-600 mt-1">
                        {Math.round(value * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    handleLike(selectedRecommendation.artworkId);
                    setSelectedRecommendation(null);
                  }}
                  className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600"
                >
                  좋아요 ❤️
                </button>
                <button
                  onClick={() => {
                    handleSave(selectedRecommendation.artworkId);
                    setSelectedRecommendation(null);
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  저장하기 💾
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};