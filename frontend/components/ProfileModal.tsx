import React, { useState, useRef } from 'react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  userProfile: any;
  onSignOut: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  userProfile,
  onSignOut
}) => {
  const [nickname, setNickname] = useState(userProfile?.display_name || '');
  const [profileImage, setProfileImage] = useState(userProfile?.avatar_url || '');
  const [recentImages, setRecentImages] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // TODO: 실제 API 구현 시 서버에 업로드
      console.log('프로필 이미지 업로드:', file);
      
    } catch (error) {
      console.error('프로필 이미지 업로드 실패:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleNicknameChange = async () => {
    try {
      // TODO: 실제 API 구현 시 서버에 저장
      console.log('닉네임 변경:', nickname);
      alert('닉네임이 변경되었습니다!');
    } catch (error) {
      console.error('닉네임 변경 실패:', error);
      alert('닉네임 변경에 실패했습니다.');
    }
  };

  const loadRecentAnalysis = async () => {
    try {
      // TODO: 실제 API 구현 시 최근 7일 분석 이미지 가져오기
      // 현재는 빈 배열로 설정 (placeholder 이미지 제거)
      setRecentImages([]);
    } catch (error) {
      console.error('최근 분석 이미지 로드 실패:', error);
    }
  };

  React.useEffect(() => {
    if (isOpen && user) {
      loadRecentAnalysis();
    }
  }, [isOpen, user]);

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
              <h2 className="text-3xl font-bold heading-gradient mb-3">내 계정</h2>
              <p className="text-base" style={{color: 'var(--text-secondary)'}}>프로필 정보를 관리하세요</p>
            </div>

            {/* 프로필 섹션 */}
            <div className="card-modern p-8 mb-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* 프로필 이미지 */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden instagram-border">
                    <div className="w-full h-full">
                      {profileImage ? (
                        <img 
                          src={profileImage} 
                          alt="프로필" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                          <svg className="w-16 h-16" style={{color: 'var(--dusty-rose)'}} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full btn-primary-soft flex items-center justify-center text-sm hover-lift shadow-lg"
                    disabled={isUploading}
                  >
                    {isUploading ? '...' : '📷'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    className="hidden"
                  />
                </div>

                {/* 사용자 정보 */}
                <div className="flex-1 w-full">
                  <div className="mb-6">
                    <label className="block text-base font-semibold mb-3" style={{color: 'var(--text-primary)'}}>
                      닉네임
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="input-feminine flex-1 text-base"
                        placeholder="닉네임을 입력하세요"
                      />
                      <button
                        onClick={handleNicknameChange}
                        className="btn-soft btn-primary-soft px-6 py-3 font-medium"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{color: 'var(--text-primary)'}}>이메일:</span>
                      <span className="text-sm" style={{color: 'var(--text-secondary)'}}>{user?.email || '로그인 필요'}</span>
                    </div>
                    {user?.created_at && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" style={{color: 'var(--text-primary)'}}>가입일:</span>
                        <span className="text-sm" style={{color: 'var(--text-secondary)'}}>{new Date(user.created_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 최근 분석 이미지 섹션 */}
            <div className="card-modern p-8 mb-8">
              <h3 className="text-xl font-bold mb-6 heading-gradient">최근 7일 분석 이미지</h3>
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
    </div>
  );
};