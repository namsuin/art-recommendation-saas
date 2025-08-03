import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
}

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  subscription_tier: 'free' | 'premium';
  upload_count_today: number;
}

interface UserProfileMenuProps {
  user: User;
  profile: UserProfile | null;
  onSignOut: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  profile,
  onSignOut,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadLimit, setUploadLimit] = useState<{
    canUpload: boolean;
    remainingUploads: number;
  } | null>(null);

  useEffect(() => {
    if (user?.id) {
      checkUploadLimit();
    }
  }, [user?.id]);

  const checkUploadLimit = async () => {
    try {
      const response = await fetch(`/api/auth/upload-limit?userId=${user.id}`);
      const result = await response.json();
      setUploadLimit(result);
    } catch (error) {
      console.error('Failed to check upload limit:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      onSignOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      onSignOut(); // 에러가 있어도 로그아웃 처리
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border border-gray-300 hover:bg-gray-50"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {profile?.display_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-medium">
          {profile?.display_name || user.email.split('@')[0]}
        </span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <p className="text-sm font-medium">{profile?.display_name || '사용자'}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <div className="mt-2">
              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                profile?.subscription_tier === 'premium' 
                  ? 'bg-gold-100 text-gold-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {profile?.subscription_tier === 'premium' ? '프리미엄' : '무료'}
              </span>
            </div>
          </div>

          {uploadLimit && (
            <div className="p-4 border-b border-gray-200">
              <p className="text-xs text-gray-600 mb-1">오늘 남은 분석 횟수</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ 
                      width: `${Math.max(0, (uploadLimit.remainingUploads / (profile?.subscription_tier === 'premium' ? 100 : 10)) * 100)}%` 
                    }}
                  ></div>
                </div>
                <span className="text-xs font-medium">
                  {uploadLimit.remainingUploads}
                </span>
              </div>
            </div>
          )}

          <div className="p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                // 업로드 히스토리 모달 열기 (추후 구현)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
            >
              업로드 히스토리
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                // 추천 히스토리 모달 열기 (추후 구현)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
            >
              추천 히스토리
            </button>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded text-red-600"
            >
              로그아웃
            </button>
          </div>
        </div>
      )}

      {/* 클릭 외부 영역 감지 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};