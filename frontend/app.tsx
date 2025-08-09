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
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppContent: React.FC = () => {
  // AuthProvider에서 제공하는 useAuth 훅 사용
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
  } = useAuth();

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
            (() => {
              const finalUserId = user?.id && user.id.trim() !== '' ? user.id : null;
              console.log('🔍 App.tsx - Passing userId to MultiImageUpload:', {
                user: user,
                'user?.id': user?.id,
                finalUserId: finalUserId
              });
              return (
                <MultiImageUpload
                  userId={finalUserId}
                  onAnalysisComplete={(results) => {
                    console.log('Multi-image analysis complete:', results);
                    // 결과 처리 로직 추가 가능
                  }}
                />
              );
            })()
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
              
              {/* 외부 플랫폼 갤러리 추천 (무료 10개 제한) */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-700">갤러리 추천 (외부 플랫폼)</h3>
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    무료 10개 / 추가는 유료
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations
                    .filter((rec) => {
                      // 텀블벅, 그라폴리오, 대학 졸업작품, 학생 작품 필터링
                      const artwork = rec.artwork || rec;
                      const isTumblbug = artwork.platform === 'tumblbug' || 
                                        artwork.source === '텀블벅' || 
                                        artwork.search_source === '텀블벅' ||
                                        (artwork.source_url && artwork.source_url.includes('tumblbug.com')) ||
                                        artwork.project_type === '크라우드펀딩';
                      
                      const isGrafolio = artwork.platform === 'grafolio' || 
                                       artwork.source === '그라폴리오' || 
                                       artwork.search_source === '그라폴리오' ||
                                       (artwork.source_url && artwork.source_url.includes('grafolio.naver.com'));
                      
                      const isKoreanUniversity = artwork.platform === 'university' ||
                                               artwork.source === '대학 졸업전시' ||
                                               artwork.category === 'student_work' ||
                                               artwork.search_source === 'graduation' ||
                                               (artwork.university && (
                                                 artwork.university.includes('대학') ||
                                                 artwork.university.includes('대학교') ||
                                                 artwork.university.includes('University')
                                               )) ||
                                               (artwork.source_url && (
                                                 artwork.source_url.includes('.ac.kr') ||
                                                 artwork.source_url.includes('univ.') ||
                                                 artwork.source_url.includes('university') ||
                                                 artwork.source_url.includes('college') ||
                                                 artwork.source_url.includes('graduation')
                                               )) ||
                                               (artwork.source && (
                                                 artwork.source.includes('졸업전시') ||
                                                 artwork.source.includes('졸업작품') ||
                                                 artwork.source.includes('대학') ||
                                                 artwork.source.includes('University') ||
                                                 artwork.source.includes('College')
                                               )) ||
                                               (artwork.title && (
                                                 artwork.title.includes('졸업작품') ||
                                                 artwork.title.includes('졸업전시')
                                               ));
                      
                      const isStudentWork = artwork.student_work === true ||
                                          artwork.platform === 'academy_art_university' ||
                                          artwork.platform === 'sva_bfa' ||
                                          artwork.platform === 'artsonia' ||
                                          artwork.category === 'professional_student_work';
                      
                      return !isTumblbug && !isGrafolio && !isKoreanUniversity && !isStudentWork;
                    })
                    .slice(0, 10)
                    .map((rec, index) => {
                  const artwork = rec.artwork || rec;
                  const imageUrl = artwork.image_url || artwork.thumbnail_url || artwork.primaryImage || 'https://via.placeholder.com/300x300/f0f0f0/666666?text=No+Image';
                  const sourceUrl = artwork.source_url || artwork.objectURL || artwork.eventSite || '#';
                  const title = artwork.title || '제목 없음';
                  const artist = artwork.artist || artwork.artistDisplayName || '작가 미상';
                  const source = artwork.search_source || artwork.source || 'Unknown';
                  
                  return (
                    <div 
                      key={artwork.id || `${title}-${index}`} 
                      className="border rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer group"
                      onClick={() => handleRecommendationClick(rec)}
                    >
                      <div className="relative overflow-hidden rounded mb-3">
                        <img
                          src={imageUrl}
                          alt={title}
                          className="w-full h-48 object-cover rounded transition-transform duration-200 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.dataset.retried) {
                              target.dataset.retried = 'true';
                              // 2차 폴백 시도
                              target.src = artwork.thumbnail_url || artwork.primaryImageSmall || 'https://via.placeholder.com/300x300/e5e7eb/6b7280?text=Image+Unavailable';
                            } else {
                              // 최종 폴백
                              target.src = 'https://via.placeholder.com/300x300/e5e7eb/6b7280?text=Image+Error';
                            }
                          }}
                          onLoad={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.opacity = '1';
                          }}
                          style={{ opacity: '0', transition: 'opacity 0.3s ease' }}
                        />
                        {/* 로딩 상태 표시 */}
                        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" style={{ zIndex: -1 }}></div>
                        
                        {/* 외부 링크 아이콘 */}
                        {sourceUrl !== '#' && (
                          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-800 line-clamp-2" title={title}>
                          {title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-1" title={artist}>
                          {artist}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            유사도: {Math.round((rec.similarity || rec.similarity_score?.total || 0) * 100)}%
                          </p>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded" title={source}>
                            {source}
                          </span>
                        </div>
                        
                        {rec.reasons && rec.reasons.length > 0 && (
                          <p className="text-xs text-gray-400 line-clamp-1">
                            {rec.reasons[0]}
                          </p>
                        )}
                        
                        {artwork.price && (
                          <p className="text-sm font-medium text-green-600">
                            ₩{artwork.price.toLocaleString()}
                          </p>
                        )}
                        
                        {/* 링크 버튼 */}
                        {sourceUrl !== '#' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(sourceUrl, '_blank', 'noopener,noreferrer');
                            }}
                            className="w-full mt-2 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 px-3 rounded text-sm font-medium transition-colors"
                          >
                            원본 보기
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>

              {/* 학생 작품 섹션 (별도 분리) */}
              {recommendations.filter((rec) => {
                const artwork = rec.artwork || rec;
                return artwork.student_work === true ||
                       artwork.platform === 'academy_art_university' ||
                       artwork.platform === 'sva_bfa' ||
                       artwork.platform === 'artsonia' ||
                       artwork.category === 'professional_student_work';
              }).length > 0 && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-700">학생 작품 추천</h3>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      🎓 교육적 목적
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendations
                      .filter((rec) => {
                        const artwork = rec.artwork || rec;
                        return artwork.student_work === true ||
                               artwork.platform === 'academy_art_university' ||
                               artwork.platform === 'sva_bfa' ||
                               artwork.platform === 'artsonia' ||
                               artwork.category === 'professional_student_work';
                      })
                      .slice(0, 6)
                      .map((rec, index) => {
                      const artwork = rec.artwork || rec;
                      const imageUrl = artwork.image_url || artwork.thumbnail_url || artwork.primaryImage || 'https://via.placeholder.com/300x300/f0f0f0/666666?text=Student+Work';
                      const sourceUrl = artwork.source_url || artwork.objectURL || artwork.eventSite || '#';
                      const title = artwork.title || '학생 작품';
                      const artist = artwork.artist || '학생';
                      const source = artwork.search_source || artwork.source || 'Student Work';
                      
                      return (
                        <div 
                          key={artwork.id || `${title}-${index}`} 
                          className="border-2 border-green-100 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer group"
                          onClick={() => handleRecommendationClick(rec)}
                        >
                          <div className="relative overflow-hidden rounded mb-3">
                            <img
                              src={imageUrl}
                              alt={title}
                              className="w-full h-48 object-cover rounded transition-transform duration-200 group-hover:scale-105"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.dataset.retried) {
                                  target.dataset.retried = 'true';
                                  target.src = artwork.thumbnail_url || artwork.primaryImageSmall || 'https://via.placeholder.com/300x300/e5e7eb/6b7280?text=Student+Work';
                                } else {
                                  target.src = 'https://via.placeholder.com/300x300/e5e7eb/6b7280?text=Student+Art';
                                }
                              }}
                              onLoad={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.opacity = '1';
                              }}
                              style={{ opacity: '0', transition: 'opacity 0.3s ease' }}
                            />
                            {/* 로딩 상태 표시 */}
                            <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" style={{ zIndex: -1 }}></div>
                            
                            {/* 학생 작품 배지 */}
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                              🎓 학생
                            </div>

                            {/* 외부 링크 아이콘 */}
                            {sourceUrl !== '#' && (
                              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <h3 className="font-semibold text-gray-800 line-clamp-2" title={title}>
                              {title}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-1" title={artist}>
                              {artist}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-500">
                                유사도: {Math.round((rec.similarity || rec.similarity_score?.total || 0) * 100)}%
                              </p>
                              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded" title={source}>
                                {source}
                              </span>
                            </div>
                            
                            {artwork.school && (
                              <p className="text-xs text-green-600">
                                {artwork.school} {artwork.academic_level && `- ${artwork.academic_level}`}
                              </p>
                            )}
                            
                            {rec.reasons && rec.reasons.length > 0 && (
                              <p className="text-xs text-gray-400 line-clamp-1">
                                {rec.reasons[0]}
                              </p>
                            )}
                            
                            {/* 링크 버튼 */}
                            {sourceUrl !== '#' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(sourceUrl, '_blank', 'noopener,noreferrer');
                                }}
                                className="w-full mt-2 bg-green-50 hover:bg-green-100 text-green-600 py-2 px-3 rounded text-sm font-medium transition-colors"
                              >
                                원본 보기
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    💡 학생 작품은 교육적 목적으로 표시되며, 작가의 성장과 발전을 지원합니다.
                  </div>
                </div>
              )}

              {/* 더 보기 버튼 (유료 결제 안내) */}
              {recommendations.filter((rec) => {
                const artwork = rec.artwork || rec;
                const isTumblbug = artwork.platform === 'tumblbug' || 
                                  artwork.source === '텀블벅' || 
                                  artwork.search_source === '텀블벅';
                const isGrafolio = artwork.platform === 'grafolio' || 
                                 artwork.source === '그라폴리오' || 
                                 artwork.search_source === '그라폴리오';
                const isKoreanUniversity = artwork.platform === 'university' ||
                                         artwork.source === '대학 졸업전시' ||
                                         artwork.category === 'student_work' ||
                                         artwork.search_source === 'graduation' ||
                                         (artwork.university && (
                                           artwork.university.includes('대학') ||
                                           artwork.university.includes('대학교') ||
                                           artwork.university.includes('University')
                                         )) ||
                                         (artwork.source_url && (
                                           artwork.source_url.includes('.ac.kr') ||
                                           artwork.source_url.includes('univ.') ||
                                           artwork.source_url.includes('university') ||
                                           artwork.source_url.includes('college') ||
                                           artwork.source_url.includes('graduation')
                                         )) ||
                                         (artwork.source && (
                                           artwork.source.includes('졸업전시') ||
                                           artwork.source.includes('졸업작품') ||
                                           artwork.source.includes('대학') ||
                                           artwork.source.includes('University') ||
                                           artwork.source.includes('College')
                                         )) ||
                                         (artwork.title && (
                                           artwork.title.includes('졸업작품') ||
                                           artwork.title.includes('졸업전시')
                                         ));
                const isStudentWork = artwork.student_work === true ||
                                    artwork.platform === 'academy_art_university' ||
                                    artwork.platform === 'sva_bfa' ||
                                    artwork.platform === 'artsonia';
                return !isTumblbug && !isGrafolio && !isKoreanUniversity && !isStudentWork;
              }).length > 10 && (
                <div className="text-center">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">더 많은 추천 작품 보기</h4>
                    <p className="text-sm text-blue-600 mb-3">
                      추가 {recommendations.length - 10}개의 작품을 확인하려면 프리미엄 플랜이 필요합니다.
                    </p>
                    <button
                      onClick={() => {
                        window.location.href = '/pricing';
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      프리미엄으로 업그레이드 💎
                    </button>
                  </div>
                </div>
              )}
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

// AuthProvider로 감싸는 실제 App 컴포넌트
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
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