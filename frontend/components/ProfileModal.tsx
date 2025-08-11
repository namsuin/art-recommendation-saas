import React, { useState, useRef } from 'react';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    display_name?: string;
  };
}

interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  subscription_tier?: string;
  role?: 'user' | 'artist' | 'admin';
}

interface ArtworkItem {
  id: string;
  status?: string;
  title?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  userProfile: UserProfile;
  onSignOut: () => void;
  refreshProfile: () => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  userProfile,
  onSignOut,
  refreshProfile
}) => {
  const [nickname, setNickname] = useState(userProfile?.display_name || user?.user_metadata?.display_name || '');
  const [profileImage, setProfileImage] = useState(userProfile?.avatar_url || '');
  const [recentImages, setRecentImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [artistWorks, setArtistWorks] = useState<any[]>([]);
  const [showArtistUpgrade, setShowArtistUpgrade] = useState(false);
  const [artistApplication, setArtistApplication] = useState({
    artistName: '',
    bio: '',
    portfolioUrl: '',
    instagramUrl: '',
    experience: '',
    specialties: [] as string[],
    statement: ''
  });
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 사용자 역할 확인 (데이터베이스 기반)
  const userRole = userProfile?.role || 'user';
  const isArtist = userRole === 'artist';
  const isAdmin = userRole === 'admin';

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 이미지를 Base64로 변환하여 미리보기
      const reader = new FileReader();
      reader.onload = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      // 프로필 이미지 업로드 API 호출 필요
      // 프로필 이미지 업로드 처리
      
    } catch (error) {
      console.error('프로필 이미지 업로드 실패:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleNicknameChange = async () => {
    try {
      // 사용자 정보 업데이트 API 호출 필요
      // 닉네임 변경 처리
      alert('닉네임이 변경되었습니다!');
    } catch (error) {
      console.error('닉네임 변경 실패:', error);
      alert('닉네임 변경에 실패했습니다.');
    }
  };

  const loadRecentAnalysis = async () => {
    try {
      // 최근 분석 내역 API 호출 필요
      // 현재는 빈 배열로 설정 (placeholder 이미지 제거)
      setRecentImages([]);
    } catch (error) {
      console.error('최근 분석 이미지 로드 실패:', error);
    }
  };

  const loadArtistWorks = async () => {
    try {
      if (!isArtist || !user?.id) {
        setArtistWorks([]);
        return;
      }

      // 실제 API 호출로 예술가 작품 가져오기
      const response = await fetch(`/api/artist/works?userId=${user.id}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setArtistWorks(data.works || []);
      } else {
        console.warn('Failed to load artist works');
        setArtistWorks([]);
      }
    } catch (error) {
      console.error('작품 로드 실패:', error);
      setArtistWorks([]);
    }
  };

  // 예술가 신청 처리
  const handleArtistUpgrade = async () => {
    setIsSubmittingApplication(true);
    try {
      const response = await fetch('/api/artist/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          ...artistApplication
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('예술가 신청이 성공적으로 제출되었습니다! 관리자 승인 후 예술가 계정으로 업그레이드됩니다.');
        setShowArtistUpgrade(false);
        setArtistApplication({
          artistName: '',
          bio: '',
          portfolioUrl: '',
          instagramUrl: '',
          experience: '',
          specialties: [],
          statement: ''
        });
        
        // 프로필 새로고침 - 신청 상태 반영
        await refreshProfile();
      } else {
        alert('신청 처리 중 오류가 발생했습니다: ' + result.error);
      }
    } catch (error) {
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  // 전문 분야 토글
  const toggleSpecialty = (specialty: string) => {
    setArtistApplication(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  React.useEffect(() => {
    if (isOpen && user) {
      loadRecentAnalysis();
      if (isArtist) {
        loadArtistWorks();
      }
    }
  }, [isOpen, user, isArtist]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="modal-backdrop absolute inset-0" 
        style={{
          background: 'rgba(255, 255, 255, 1)',
          opacity: 1
        }}
        onClick={onClose}
      ></div>
      
      <div className="modal-content-elegant relative w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="relative">
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition-all duration-200 z-10"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-8 md:p-10">
            {/* 헤더 */}
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold heading-gradient mb-3">
                {isAdmin ? '🛡️ 관리자 계정' : isArtist ? '🎨 예술가 계정' : '👤 내 계정'}
              </h2>
              <p className="text-base" style={{color: 'var(--text-secondary)'}}>
                {isAdmin ? '시스템 관리 및 모니터링' : isArtist ? '작품 관리 및 프로필 정보' : '프로필 정보를 관리하세요'}
              </p>
            </div>

            {/* 프로필 섹션 */}
            <div className="card-modern p-8 mb-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* 프로필 이미지 */}
                <div className="relative group">
                  {/* 메인 프로필 이미지 컨테이너 */}
                  <div className="relative w-36 h-36 rounded-full overflow-hidden shadow-xl ring-4 ring-white group-hover:ring-purple-200 transition-all duration-300">
                    {/* 그라데이션 보더 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 rounded-full p-1">
                      <div className="w-full h-full rounded-full overflow-hidden bg-white">
                        {profileImage ? (
                          <img 
                            src={profileImage} 
                            alt="프로필" 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
                            {/* 기본 아바타 아이콘 */}
                            <div className="relative">
                              <svg className="w-20 h-20 text-purple-300" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                              </svg>
                              {/* 반짝이는 효과 */}
                              <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-pulse opacity-70"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 호버 오버레이 */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-full flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* 업로드 버튼 */}
                  <div className="absolute -bottom-2 -right-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="relative w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center group/btn"
                    >
                      {/* 반짝이는 링 효과 */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 animate-ping opacity-20"></div>
                      
                      {/* 버튼 아이콘 */}
                      <div className="relative z-10 text-white">
                        {isUploading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-6 h-6 group-hover/btn:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        )}
                      </div>
                      
                      {/* 내부 그라데이션 */}
                      <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
                    </button>
                    
                    {/* 툴팁 */}
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {isUploading ? '업로드 중...' : '사진 변경'}
                      </div>
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 mx-auto"></div>
                    </div>
                  </div>

                  {/* 숨겨진 파일 입력 */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    className="hidden"
                  />

                  {/* 사용자 역할 배지 */}
                  <div className="absolute -top-2 -left-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-bold shadow-md ${
                      isAdmin ? 'bg-red-500 text-white' : 
                      isArtist ? 'bg-purple-500 text-white' : 
                      'bg-blue-500 text-white'
                    }`}>
                      {isAdmin ? '🛡️ 관리자' : isArtist ? '🎨 작가' : '👤 사용자'}
                    </div>
                  </div>
                </div>

                {/* 사용자 정보 */}
                <div className="flex-1 w-full">
                  <div className="mb-6">
                    <label className="block text-base font-semibold mb-4 text-gray-700 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        닉네임
                      </span>
                      <button
                        onClick={refreshProfile}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg flex items-center gap-1 transition-colors"
                        title="계정 상태 새로고침"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        새로고침
                      </button>
                    </label>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                          placeholder="닉네임을 입력하세요"
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                      </div>
                      <button
                        onClick={handleNicknameChange}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        저장
                      </button>
                    </div>
                  </div>
                  
                  {/* 사용자 정보 카드 */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-purple-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      계정 정보
                    </h3>
                    
                    <div className="space-y-4">
                      {/* 이메일 */}
                      <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 font-medium">이메일</div>
                          <div className="text-sm font-semibold text-gray-800">{user?.email || '로그인 필요'}</div>
                        </div>
                      </div>

                      {/* 계정 유형 */}
                      <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isAdmin ? 'bg-red-100' : isArtist ? 'bg-purple-100' : 'bg-blue-100'
                        }`}>
                          <span className="text-sm">
                            {isAdmin ? '🛡️' : isArtist ? '🎨' : '👤'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 font-medium">계정 유형</div>
                          <div className={`text-sm font-bold ${
                            isAdmin ? 'text-red-600' : isArtist ? 'text-purple-600' : 'text-blue-600'
                          }`}>
                            {isAdmin ? '관리자' : isArtist ? '예술가' : '일반 사용자'}
                          </div>
                        </div>
                        {/* 인증 배지 */}
                        {isArtist && (
                          <div className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full font-medium">
                            인증됨
                          </div>
                        )}
                      </div>

                      {/* 가입일 */}
                      {user?.created_at && (
                        <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 font-medium">가입일</div>
                            <div className="text-sm font-semibold text-gray-800">
                              {new Date(user.created_at).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 예술가 전용 섹션 - 작품 관리 */}
            {isArtist && (
              <div className="card-modern p-8 mb-8" style={{background: 'linear-gradient(135deg, #f3e7fc 0%, #e7e0ff 100%)'}}>
                <h3 className="text-xl font-bold mb-6" style={{color: '#7c3aed'}}>🎨 내 작품 관리</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button 
                    onClick={() => window.location.href = '/artist/upload'}
                    className="p-4 rounded-lg bg-white hover:shadow-lg transition-all duration-200 text-center"
                  >
                    <div className="text-2xl mb-2">📤</div>
                    <div className="font-semibold text-purple-700">작품 등록</div>
                    <div className="text-xs text-gray-600 mt-1">새 작품 업로드</div>
                  </button>
                  <button 
                    onClick={() => window.location.href = '/artist/works'}
                    className="p-4 rounded-lg bg-white hover:shadow-lg transition-all duration-200 text-center"
                  >
                    <div className="text-2xl mb-2">🖼️</div>
                    <div className="font-semibold text-purple-700">작품 목록</div>
                    <div className="text-xs text-gray-600 mt-1">등록된 작품 관리</div>
                  </button>
                </div>
                <div className="p-4 bg-white/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-purple-700">등록된 작품:</span>
                    <span className="text-lg font-bold text-purple-900">{artistWorks.length || 0}개</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-purple-700">승인 대기:</span>
                    <span className="text-lg font-bold text-orange-600">
                      {artistWorks.filter((w: ArtworkItem) => w?.status === 'pending').length || 0}개
                    </span>
                  </div>
                  {(userProfile?.artist_portfolio_url || userProfile?.artist_instagram) && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      {userProfile?.artist_portfolio_url && (
                        <p className="text-xs text-purple-600 mb-1">
                          <strong>포트폴리오:</strong> 
                          <a href={userProfile.artist_portfolio_url} target="_blank" rel="noopener noreferrer" className="ml-1 hover:underline">
                            {userProfile.artist_portfolio_url.replace('https://', '').replace('http://', '')}
                          </a>
                        </p>
                      )}
                      {userProfile?.artist_instagram && (
                        <p className="text-xs text-purple-600">
                          <strong>Instagram:</strong> 
                          <a href={`https://instagram.com/${userProfile.artist_instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="ml-1 hover:underline">
                            {userProfile.artist_instagram.startsWith('@') ? userProfile.artist_instagram : `@${userProfile.artist_instagram}`}
                          </a>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 관리자 전용 섹션 - 시스템 관리 */}
            {isAdmin && (
              <div className="card-modern p-8 mb-8" style={{background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'}}>
                <h3 className="text-xl font-bold mb-6" style={{color: '#dc2626'}}>🛡️ 관리자 메뉴</h3>
                <div className="grid grid-cols-3 gap-4">
                  <button 
                    onClick={() => window.location.href = '/admin-dashboard'}
                    className="p-4 rounded-lg bg-white hover:shadow-lg transition-all duration-200 text-center"
                  >
                    <div className="text-2xl mb-2">📊</div>
                    <div className="font-semibold text-red-700">대시보드</div>
                    <div className="text-xs text-gray-600 mt-1">통계 및 현황</div>
                  </button>
                  <button 
                    onClick={() => window.location.href = '/admin/artists'}
                    className="p-4 rounded-lg bg-white hover:shadow-lg transition-all duration-200 text-center"
                  >
                    <div className="text-2xl mb-2">👥</div>
                    <div className="font-semibold text-red-700">예술가 관리</div>
                    <div className="text-xs text-gray-600 mt-1">승인 및 관리</div>
                  </button>
                  <button 
                    onClick={() => window.location.href = '/admin/works'}
                    className="p-4 rounded-lg bg-white hover:shadow-lg transition-all duration-200 text-center"
                  >
                    <div className="text-2xl mb-2">🖼️</div>
                    <div className="font-semibold text-red-700">작품 승인</div>
                    <div className="text-xs text-gray-600 mt-1">작품 검토</div>
                  </button>
                </div>
              </div>
            )}

            {/* 최근 분석 이미지 섹션 - 일반 사용자와 예술가 모두 표시 */}
            {!isAdmin && (
              <div className="card-modern p-8 mb-8">
                <h3 className="text-xl font-bold mb-6 heading-gradient">
                  {isArtist ? '🔍 최근 분석한 작품들' : '최근 7일 분석 이미지'}
                </h3>
              {recentImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {recentImages.map((item) => (
                    <div key={item.id} className="group hover-lift cursor-pointer">
                      <div className="aspect-square rounded-xl overflow-hidden mb-2">
                        <img 
                          src={item.image} 
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      </div>
                      <p className="text-xs text-center" style={{color: 'var(--text-secondary)'}}>
                        {item.date}
                      </p>
                      <p className="text-sm text-center font-medium" style={{color: 'var(--text-primary)'}}>
                        {item.title}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl" style={{color: 'var(--text-secondary)'}}>
                  <svg className="w-20 h-20 mx-auto mb-5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-base font-medium mb-2">아직 분석한 이미지가 없습니다</p>
                  <p className="text-sm">이미지를 업로드하여 AI 분석을 시작해보세요!</p>
                </div>
              )}
              </div>
            )}

            {/* 예술가 업그레이드 알림 */}
            {isArtist && (
              <div className="card-modern p-6 mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🎉</div>
                  <div>
                    <h3 className="text-lg font-bold text-green-800 mb-1">
                      예술가 계정으로 업그레이드되었습니다!
                    </h3>
                    <p className="text-green-700 text-sm">
                      이제 작품을 등록하고 다른 사용자들에게 추천할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 역할별 빠른 액션 버튼 */}
            {!isAdmin && (
              <div className="card-modern p-6 mb-8" style={{background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'}}>
                <h4 className="text-lg font-semibold mb-4" style={{color: '#0369a1'}}>⚡ 빠른 작업</h4>
                <div className={`grid gap-3 ${isArtist ? 'grid-cols-2' : 'grid-cols-2 max-w-md mx-auto'}`}>
                  {isArtist ? (
                    <>
                      <button 
                        onClick={() => window.location.href = '/artist/portfolio'}
                        className="p-3 rounded-lg bg-white hover:shadow-md transition-all text-sm font-medium text-blue-700"
                      >
                        💼 포트폴리오 설정
                      </button>
                      <button 
                        onClick={() => window.location.href = '/artist/sales'}
                        className="p-3 rounded-lg bg-white hover:shadow-md transition-all text-sm font-medium text-blue-700"
                      >
                        💰 판매 내역
                      </button>
                      <button 
                        onClick={() => window.location.href = '/artist/analytics'}
                        className="p-3 rounded-lg bg-white hover:shadow-md transition-all text-sm font-medium text-blue-700"
                      >
                        📈 작품 통계
                      </button>
                      <button 
                        onClick={() => window.location.href = '/artist/promote'}
                        className="p-3 rounded-lg bg-white hover:shadow-md transition-all text-sm font-medium text-blue-700"
                      >
                        📢 작품 홍보
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          onClose();
                          window.location.href = '/';
                        }}
                        className="p-3 rounded-lg bg-white hover:shadow-md transition-all text-sm font-medium text-blue-700"
                      >
                        🔍 작품 분석하기
                      </button>
                      <button 
                        onClick={() => setShowArtistUpgrade(true)}
                        className="p-3 rounded-lg bg-white hover:shadow-md transition-all text-sm font-medium text-green-700"
                      >
                        ⭐ 예술가 되기
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 구분선 */}
            <div className="divider-decorative my-8"></div>

            {/* 로그아웃 버튼 */}
            <div className="text-center">
              <button
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="btn-soft px-8 py-3 text-base font-medium hover-lift shadow-md"
                style={{
                  background: 'var(--gradient-sage)',
                  color: 'var(--text-primary)'
                }}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 예술가 신청 모달 */}
      {showArtistUpgrade && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="modal-backdrop absolute inset-0" onClick={() => setShowArtistUpgrade(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">🎨 예술가 계정 신청</h2>
                <button
                  onClick={() => setShowArtistUpgrade(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mt-2">예술가로 등록하여 작품을 업로드하고 수익을 창출하세요</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 예술가명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  예술가명 *
                </label>
                <input
                  type="text"
                  value={artistApplication.artistName}
                  onChange={(e) => setArtistApplication(prev => ({...prev, artistName: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="예: 김예술, Kim Artist"
                  required
                />
              </div>

              {/* 소개 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  자기소개 *
                </label>
                <textarea
                  value={artistApplication.bio}
                  onChange={(e) => setArtistApplication(prev => ({...prev, bio: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="예술 경력, 주요 작품 세계, 예술관 등을 간단히 소개해주세요"
                  required
                />
              </div>

              {/* 포트폴리오 URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  포트폴리오 웹사이트
                </label>
                <input
                  type="url"
                  value={artistApplication.portfolioUrl}
                  onChange={(e) => setArtistApplication(prev => ({...prev, portfolioUrl: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://예: https://myportfolio.com"
                />
              </div>

              {/* 인스타그램 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  인스타그램 계정
                </label>
                <input
                  type="text"
                  value={artistApplication.instagramUrl}
                  onChange={(e) => setArtistApplication(prev => ({...prev, instagramUrl: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="@username 또는 전체 URL"
                />
              </div>

              {/* 경력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  예술 경력 *
                </label>
                <select
                  value={artistApplication.experience}
                  onChange={(e) => setArtistApplication(prev => ({...prev, experience: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">경력을 선택해주세요</option>
                  <option value="beginner">초보자 (1년 미만)</option>
                  <option value="intermediate">중급자 (1-5년)</option>
                  <option value="advanced">고급자 (5-10년)</option>
                  <option value="professional">전문가 (10년 이상)</option>
                </select>
              </div>

              {/* 전문 분야 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  전문 분야 (여러 개 선택 가능) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    '회화', '조각', '사진', '디지털아트', '수채화', 
                    '유화', '판화', '설치미술', '일러스트', '그래픽디자인'
                  ].map(specialty => (
                    <label key={specialty} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={artistApplication.specialties.includes(specialty)}
                        onChange={() => toggleSpecialty(specialty)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{specialty}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 예술관 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  예술관 및 메시지 *
                </label>
                <textarea
                  value={artistApplication.statement}
                  onChange={(e) => setArtistApplication(prev => ({...prev, statement: e.target.value}))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="당신의 예술관, 작품 철학, 그리고 우리 플랫폼에서 전시하고 싶은 이유를 알려주세요"
                  required
                />
              </div>

              {/* 신청 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowArtistUpgrade(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSubmittingApplication}
                >
                  취소
                </button>
                <button
                  onClick={handleArtistUpgrade}
                  disabled={isSubmittingApplication || !artistApplication.artistName || !artistApplication.bio || !artistApplication.experience || artistApplication.specialties.length === 0 || !artistApplication.statement}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isSubmittingApplication ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      신청 중...
                    </>
                  ) : (
                    '🎨 예술가 신청하기'
                  )}
                </button>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ 안내:</strong> 신청 서류를 검토한 후, 24-48시간 내에 승인/거부 결과를 이메일로 알려드립니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};