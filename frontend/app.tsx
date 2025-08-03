import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthModal } from './components/AuthModal';
import { UserProfileMenu } from './components/UserProfile';
import { ImageUploadWithAuth } from './components/ImageUploadWithAuth';
import MultiImageUpload from './components/MultiImageUpload';
import { AIArtGenerator } from './components/AIArtGenerator';
import { PersonalizedRecommendations } from './components/PersonalizedRecommendations';
import { AICuratorChatbot } from './components/AICuratorChatbot';
import { ImageAnalysisDisplay } from './components/ImageAnalysisDisplay';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';

const App: React.FC = () => {
  // 새로운 세션 관리 훅 사용
  const { 
    user, 
    userProfile, 
    loading, 
    sessionExpired, 
    signIn, 
    signUp, 
    signOut, 
    refreshProfile, 
    extendSession 
  } = useSupabaseAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'multi' | 'ai-generator' | 'personalized'>('single');
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleAuthSuccess = async (email: string, password: string, displayName?: string) => {
    const result = authMode === 'login' 
      ? await signIn(email, password)
      : await signUp(email, password, displayName);
    
    if (result.success) {
      setAuthModalOpen(false);
      // 활동 감지로 세션 연장
      extendSession();
    }
    
    return result;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // 로딩 상태 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 세션 만료 알림
  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-4 text-center">
          <div className="mb-4">
            <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 text-xl">⏰</span>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">세션이 만료되었습니다</h2>
          <p className="text-gray-600 mb-6">1시간 동안 활동이 없어 자동으로 로그아웃되었습니다.</p>
          <button
            onClick={() => {
              setAuthMode('login');
              setAuthModalOpen(true);
            }}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 로그인
          </button>
        </div>
      </div>
    );
  }

  const handleImageUpload = async (file: File, uploadId?: string) => {
    // Reset state
    setError(null);
    setRecommendations([]);
    setAnalysisResult(null);
    
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setIsAnalyzing(true);

    // 이미지 업로드 시 세션 연장
    extendSession();

    try {
      const formData = new FormData();
      formData.append('image', file);
      
      // 로그인한 사용자의 경우 사용자 정보 추가
      if (user) {
        formData.append('userId', user.id);
        if (uploadId) {
          formData.append('uploadId', uploadId);
        }
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('🔍 API Response:', result);
      console.log('📊 Recommendations:', result.recommendations);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('일일 분석 제한에 도달했습니다. 내일 다시 시도해주세요.');
        }
        throw new Error(result.error || `서버 오류: ${response.status}`);
      }

      // 분석 결과 저장
      if (result.analysis) {
        console.log('📊 Setting analysis result:', result.analysis);
        setAnalysisResult(result.analysis);
      } else {
        console.warn('⚠️ No analysis field in response');
      }
      
      if (result.recommendations && result.recommendations.length > 0) {
        setRecommendations(result.recommendations);
      } else {
        setError('추천할 작품을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('Image analysis failed:', error);
      setError(error instanceof Error ? error.message : '이미지 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRecommendationClick = async (recommendation: any) => {
    // 추천 클릭 기록 (로그인한 사용자만)
    if (user && recommendation.id) {
      try {
        await fetch('/api/recommendations/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recommendationId: recommendation.id,
            userId: user.id,
          }),
        });
      } catch (error) {
        console.error('Failed to record click:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">
              AI Art Recommendation
            </h1>
            
            <div className="flex items-center space-x-4">
              {/* AI Curator Chatbot Button */}
              <button
                onClick={() => setChatbotOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full hover:from-purple-700 hover:to-blue-700 transition-all flex items-center space-x-2"
              >
                <span>🎨</span>
                <span className="font-medium">AI 큐레이터</span>
              </button>

              {user ? (
                <UserProfileMenu 
                  user={user} 
                  profile={userProfile} 
                  onSignOut={handleSignOut}
                />
              ) : (
                <div className="space-x-2">
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setAuthModalOpen(true);
                    }}
                    className="text-gray-600 hover:text-gray-800 px-3 py-2"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthModalOpen(true);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                  >
                    회원가입
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Mode Selector */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-center space-x-2 flex-wrap gap-2">
              <button
                onClick={() => setViewMode('single')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'single' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                단일 이미지 분석
              </button>
              <button
                onClick={() => setViewMode('multi')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'multi' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                다중 이미지 분석
              </button>
              <button
                onClick={() => setViewMode('ai-generator')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'ai-generator' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🎨 AI 아트 생성기
              </button>
              <button
                onClick={() => setViewMode('personalized')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'personalized' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🤖 AI 개인화 추천
              </button>
            </div>
          </div>

          {/* Single Image Upload */}
          {viewMode === 'single' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">이미지 업로드</h2>
              <ImageUploadWithAuth 
                user={user}
                onImageUpload={handleImageUpload}
                onAuthRequired={() => {
                  setAuthMode('login');
                  setAuthModalOpen(true);
                }}
              />
            </div>
          )}

          {/* Multi Image Upload */}
          {viewMode === 'multi' && (
            <MultiImageUpload
              userId={user?.id || null}
              onAnalysisComplete={(results) => {
                console.log('Multi-image analysis complete:', results);
                // 결과 처리 로직 추가 가능
              }}
            />
          )}

          {/* AI Art Generator */}
          {viewMode === 'ai-generator' && (
            <AIArtGenerator
              userId={user?.id || null}
              isPremium={userProfile?.subscription_tier === 'premium'}
            />
          )}

          {/* Personalized Recommendations */}
          {viewMode === 'personalized' && (
            <PersonalizedRecommendations
              userId={user?.id || null}
            />
          )}

          {viewMode === 'single' && uploadedImage && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">업로드된 이미지</h2>
              <img
                src={uploadedImage}
                alt="Uploaded"
                className="max-w-full h-auto rounded-lg mx-auto"
                style={{ maxHeight: '400px' }}
              />
            </div>
          )}

          {/* 이미지 분석 결과 표시 */}
          {viewMode === 'single' && (
            <ImageAnalysisDisplay 
              analysis={analysisResult} 
              isAnalyzing={isAnalyzing}
            />
          )}

          {viewMode === 'single' && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">⚠️ {error}</p>
            </div>
          )}

          {viewMode === 'single' && isAnalyzing && (
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">AI가 이미지를 분석하고 있습니다...</p>
            </div>
          )}

          {viewMode === 'single' && recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">추천 작품</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map((rec, index) => (
                  <div 
                    key={rec.artwork?.id || index} 
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleRecommendationClick(rec)}
                  >
                    <img
                      src={rec.artwork?.image_url || rec.image_url || 'https://via.placeholder.com/300x300?text=No+Image'}
                      alt={rec.artwork?.title || rec.title || '작품'}
                      className="w-full h-48 object-cover rounded mb-3"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=Image+Not+Found';
                      }}
                    />
                    <h3 className="font-semibold">{rec.artwork?.title || rec.title || '제목 없음'}</h3>
                    <p className="text-sm text-gray-600">{rec.artwork?.artist || rec.artist || '작가 미상'}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      유사도: {Math.round((rec.similarity || 0) * 100)}%
                    </p>
                    {rec.reasons && rec.reasons.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {rec.reasons[0]}
                      </p>
                    )}
                    {rec.artwork?.price && (
                      <p className="text-sm font-medium text-green-600 mt-2">
                        ₩{rec.artwork.price.toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        mode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        onSwitchMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
      />

      {/* AI Curator Chatbot */}
      <AICuratorChatbot
        userId={user?.id || null}
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
      />
    </div>
  );
};

// Safe root element creation with error handling
const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = '<div style="text-align: center; padding: 50px;">⚠️ 페이지를 로드할 수 없습니다. (root element not found)</div>';
} else {
  const root = createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}