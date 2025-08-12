import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { UserProfileMenu } from './components/UserProfile';
import { ImageUploadWithAuth } from './components/ImageUploadWithAuth';
import MultiImageUpload from './components/MultiImageUpload';
import { ImageAnalysisDisplay } from './components/ImageAnalysisDisplay';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './styles/global.css';

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
  const [viewMode, setViewMode] = useState<'single' | 'multi' | 'personalized'>('single');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const handleAuthSuccess = async (email: string, password: string, displayName?: string, role?: string, artistInfo?: any) => {
    const result = authMode === 'login' 
      ? await signIn(email, password)
      : await signUp(email, password, displayName, role, artistInfo);
    
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
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--gradient-hero)'}}>
        <div className="text-center relative">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full loading-soft" style={{background: 'var(--gradient-accent)'}}></div>
            <div className="absolute inset-2 rounded-full" style={{background: 'var(--off-white)'}}></div>
            <div className="absolute inset-4 rounded-full" style={{background: 'var(--gradient-cool)', animation: 'spin 2s linear infinite'}}></div>
          </div>
          <div className="decoration-blob blob-pink w-16 h-16 absolute -top-8 -left-8"></div>
          <div className="decoration-blob blob-lavender w-12 h-12 absolute -bottom-6 -right-6"></div>
          <p className="heading-elegant font-medium text-white">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 세션 만료 알림
  if (sessionExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{background: 'var(--gradient-warm)'}}>
        <div className="card-modern max-w-md w-full text-center relative">
          <div className="decoration-blob blob-peach w-20 h-20 absolute -top-10 -right-10"></div>
          <div className="decoration-blob blob-lavender w-16 h-16 absolute -bottom-8 -left-8"></div>
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{background: 'var(--gradient-cool)', boxShadow: '0 8px 25px rgba(255, 107, 122, 0.2)'}}>
              <span className="text-2xl">⏰</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold heading-gradient mb-3">세션이 만료되었습니다</h2>
          <p className="mb-8" style={{color: 'var(--text-secondary)'}}>1시간 동안 활동이 없어 자동으로 로그아웃되었습니다.</p>
          <button
            onClick={() => {
              setAuthMode('login');
              setAuthModalOpen(true);
            }}
            className="btn-soft btn-primary-soft w-full hover-lift"
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
      // API 응답 수신 완료

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('일일 분석 제한에 도달했습니다. 내일 다시 시도해주세요.');
        }
        throw new Error(result.error || `서버 오류: ${response.status}`);
      }

      // 분석 결과 저장
      if (result.analysis) {
        // 분석 결과 저장
        setAnalysisResult(result.analysis);
      } else {
        // 분석 필드 누락 경고
      }
      
      if (result.recommendations && result.recommendations.length > 0) {
        setRecommendations(result.recommendations);
      } else {
        setError('추천할 작품을 찾을 수 없습니다.');
      }
    } catch (error) {
      // 이미지 분석 실패
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

  // URL에 따른 라우팅 처리
  const pathname = window.location.pathname;
  
  // 관리자 대시보드 표시 (임시로 역할 체크 비활성화)
  if (pathname === '/dashboard') {
    return (
      <AdminDashboard 
        user={user || { id: 'temp-admin', email: 'admin@test.com' }} 
        onClose={() => window.location.href = '/'} 
      />
    );
  }

  return (
    <div className="min-h-screen" style={{background: 'var(--gradient-hero)'}}>
      <div className="decoration-blob blob-pink w-32 h-32 fixed top-10 right-10"></div>
      <div className="decoration-blob blob-lavender w-24 h-24 fixed bottom-20 left-10"></div>
      <div className="decoration-blob blob-peach w-20 h-20 fixed top-1/2 left-1/4"></div>
      
      {/* Header - Clean & Minimal */}
      <header className="nav-elegant sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1"></div>
            <h1 className="text-xl md:text-3xl font-bold heading-elegant heading-gradient text-center flex-1">
              ✨ My Art Taste
            </h1>
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => {
                  if (user) {
                    setProfileModalOpen(true);
                  } else {
                    setAuthMode('login');
                    setAuthModalOpen(true);
                  }
                }}
                className="btn-soft btn-secondary-soft px-3 md:px-4 py-2 text-sm hover-lift flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden sm:inline">내 계정</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile First */}
      <main className="container mx-auto px-4 py-4 md:py-8 pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
          {/* Mode Selector - Mobile Optimized */}
          <div className="card-modern fade-in">
            <div className="grid grid-cols-2 md:flex md:items-center md:justify-center gap-2 md:gap-3">
              <button
                onClick={() => setViewMode('single')}
                className={`btn-soft px-3 md:px-6 py-3 font-medium transition-all duration-300 transform active:scale-95 hover-lift ${
                  viewMode === 'single' 
                    ? 'btn-primary-soft' 
                    : 'btn-secondary-soft'
                }`}
              >
                <span className="block md:hidden">🖼️ 1장</span>
                <span className="hidden md:block">1장 이미지 분석</span>
              </button>
              <button
                onClick={() => setViewMode('multi')}
                className={`btn-soft px-3 md:px-6 py-3 font-medium transition-all duration-300 transform active:scale-95 hover-lift ${
                  viewMode === 'multi' 
                    ? 'btn-primary-soft' 
                    : 'btn-secondary-soft'
                }`}
              >
                <span className="block md:hidden">🎨 여러장</span>
                <span className="hidden md:block">여러장 이미지 분석</span>
              </button>
            </div>
          </div>

          {/* Single Image Upload - Mobile Optimized */}
          {viewMode === 'single' && (
            <div className="card-modern fade-in">
              <h2 className="text-lg md:text-xl font-bold heading-elegant heading-gradient mb-4">이미지 업로드</h2>
              <div className="upload-area-aesthetic">
                <ImageUploadWithAuth 
                  user={user}
                  onImageUpload={handleImageUpload}
                  onAuthRequired={() => {
                    setAuthMode('login');
                    setAuthModalOpen(true);
                  }}
                />
              </div>
            </div>
          )}

          {/* Multi Image Upload - Mobile Optimized */}
          {viewMode === 'multi' && (
            <div className="fade-in">
              {(() => {
                const finalUserId = user?.id && user.id.trim() !== '' ? user.id : null;
                // userId 전달 처리
                return (
                  <MultiImageUpload
                    userId={finalUserId}
                    onAnalysisComplete={(results) => {
                      // 다중 이미지 분석 완료
                      // 결과 처리 로직 추가 가능
                    }}
                  />
                );
              })()}
            </div>
          )}



          {viewMode === 'single' && uploadedImage && (
            <div className="card-modern fade-in hover-lift">
              <h2 className="text-lg md:text-xl font-bold heading-elegant heading-gradient mb-4">업로드된 이미지</h2>
              <div className="relative overflow-hidden rounded-2xl instagram-border">
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className="w-full h-auto object-cover"
                  style={{ maxHeight: '400px' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
              </div>
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
            <div className="card-modern p-4 fade-in" style={{background: 'linear-gradient(135deg, rgba(255, 224, 236, 0.3), rgba(255, 182, 193, 0.2))', border: '1px solid var(--dusty-rose)'}}>
              <p className="flex items-center gap-2" style={{color: 'var(--dusty-rose)'}}>
                <span className="text-xl">⚠️</span>
                <span>{error}</span>
              </p>
            </div>
          )}

          {viewMode === 'single' && isAnalyzing && (
            <div className="card-modern text-center fade-in relative">
              <div className="decoration-blob blob-pink w-12 h-12 absolute -top-6 -right-6"></div>
              <div className="decoration-blob blob-lavender w-10 h-10 absolute -bottom-4 -left-4"></div>
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full loading-soft" style={{background: 'var(--gradient-peach)'}}></div>
                <div className="absolute inset-2 rounded-full bg-white"></div>
                <div className="absolute inset-4 rounded-full" style={{background: 'var(--gradient-lavender)', animation: 'spin 2s linear infinite'}}></div>
              </div>
              <p className="heading-elegant font-medium">AI가 이미지를 분석하고 있습니다...</p>
            </div>
          )}

          {viewMode === 'single' && recommendations.length > 0 && (
            <div className="card-modern fade-in">
              <h2 className="text-lg md:text-xl font-bold heading-elegant heading-gradient mb-6">추천 작품</h2>
              
              {/* 외부 플랫폼 갤러리 추천 (무료 10개 제한) */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
                  <h3 className="text-base md:text-lg heading-elegant font-semibold">갤러리 추천 (외부 플랫폼)</h3>
                  <span className="tag-pill tag-rose">
                    무료 10개 / 추가는 유료
                  </span>
                </div>
                <div className="grid-pinterest">
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
                      className="card-modern grid-item group cursor-pointer hover-lift"
                      onClick={() => handleRecommendationClick(rec)}
                    >
                      <div className="relative overflow-hidden rounded-xl mb-4">
                        <div className="aspect-w-16 aspect-h-12">
                          <img
                            src={imageUrl}
                            alt={title}
                            className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
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
                        </div>
                        {/* 로딩 상태 표시 */}
                        <div className="absolute inset-0 skeleton rounded-xl" style={{ zIndex: -1 }}></div>
                        
                        {/* 그라디언트 오버레이 */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* 외부 링크 아이콘 */}
                        {sourceUrl !== '#' && (
                          <div className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
                            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-bold heading-elegant line-clamp-2 transition-colors" style={{color: 'var(--text-primary)'}} title={title}>
                          {title}
                        </h3>
                        <p className="text-sm line-clamp-1" style={{color: 'var(--text-secondary)'}} title={artist}>
                          {artist}
                        </p>
                        
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-1">
                            <div className="w-full rounded-full h-1.5 w-20" style={{background: 'var(--soft-gray)'}}>
                              <div 
                                className="h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.round((rec.similarity || rec.similarity_score?.total || 0) * 100)}%`, background: 'var(--gradient-peach)' }}
                              ></div>
                            </div>
                            <span className="text-xs" style={{color: 'var(--text-secondary)'}}>
                              {Math.round((rec.similarity || rec.similarity_score?.total || 0) * 100)}%
                            </span>
                          </div>
                          <span className="tag-pill tag-sage text-xs" title={source}>
                            {source}
                          </span>
                        </div>
                        
                        {rec.reasons && rec.reasons.length > 0 && (
                          <p className="text-xs line-clamp-1" style={{color: 'var(--text-secondary)', opacity: 0.7}}>
                            {rec.reasons[0]}
                          </p>
                        )}
                        
                        {artwork.price && (
                          <p className="text-sm font-medium" style={{color: 'var(--sage-green)'}}>
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
                            className="btn-soft btn-secondary-soft w-full mt-2 py-2 px-3 text-sm font-medium hover-lift"
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
                    <h3 className="text-lg font-medium heading-elegant">학생 작품 추천</h3>
                    <span className="badge-cute" style={{background: 'var(--gradient-sage)', color: 'var(--sage-green)'}}>
                      🎓 교육적 목적
                    </span>
                  </div>
                  <div className="grid-pinterest">
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
                          className="card-modern grid-item p-4 cursor-pointer group hover-lift"
                          style={{border: '2px solid var(--sage-green)', borderOpacity: 0.3}}
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
                            <div className="absolute top-2 left-2 badge-cute text-xs px-2 py-1" style={{background: 'var(--gradient-sage)', color: 'white'}}>
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
                            <h3 className="font-semibold heading-elegant line-clamp-2" title={title}>
                              {title}
                            </h3>
                            <p className="text-sm line-clamp-1" style={{color: 'var(--text-secondary)'}} title={artist}>
                              {artist}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                                유사도: {Math.round((rec.similarity || rec.similarity_score?.total || 0) * 100)}%
                              </p>
                              <span className="tag-pill tag-sage text-xs" title={source}>
                                {source}
                              </span>
                            </div>
                            
                            {artwork.school && (
                              <p className="text-xs" style={{color: 'var(--sage-green)'}}>
                                {artwork.school} {artwork.academic_level && `- ${artwork.academic_level}`}
                              </p>
                            )}
                            
                            {rec.reasons && rec.reasons.length > 0 && (
                              <p className="text-xs line-clamp-1" style={{color: 'var(--text-secondary)', opacity: 0.7}}>
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
                                className="btn-soft w-full mt-2 py-2 px-3 text-sm font-medium hover-lift" style={{background: 'var(--gradient-sage)', color: 'var(--sage-green)'}}
                              >
                                원본 보기
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-center" style={{color: 'var(--text-secondary)'}}>
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
                  <div className="card-modern p-4" style={{background: 'var(--gradient-lavender)', border: '1px solid var(--soft-lavender)'}}>
                    <h4 className="font-semibold heading-elegant heading-gradient mb-2">더 많은 추천 작품 보기</h4>
                    <p className="text-sm mb-3" style={{color: 'var(--text-secondary)'}}>
                      추가 {recommendations.length - 10}개의 작품을 확인하려면 프리미엄 플랜이 필요합니다.
                    </p>
                    <button
                      onClick={() => {
                        window.location.href = '/pricing';
                      }}
                      className="btn-soft btn-primary-soft px-4 py-2 text-sm font-medium hover-lift"
                    >
                      프리미엄으로 업그레이드 💎
                    </button>
                  </div>
                </div>
              )}
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


      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        userProfile={userProfile}
        onSignOut={handleSignOut}
        refreshProfile={refreshProfile}
      />

      {/* Mobile Bottom Navigation */}
      <nav className="nav-mobile-elegant">
        <div className="flex items-center justify-center h-16">
          <button
            onClick={() => setViewMode('single')}
            className={`nav-mobile-item-elegant flex flex-col items-center justify-center flex-1 ${viewMode === 'single' ? 'active' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1">1장 분석</span>
          </button>
          
          <button
            onClick={() => setViewMode('multi')}
            className={`nav-mobile-item-elegant flex flex-col items-center justify-center flex-1 ${viewMode === 'multi' ? 'active' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs mt-1">여러장 분석</span>
          </button>
        </div>
      </nav>

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