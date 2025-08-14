import React, { useState } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  mode: 'login' | 'signup';
  onClose: () => void;
  onAuthSuccess: (email: string, password: string, displayName?: string, role?: string, artistInfo?: any) => Promise<{ success: boolean; error?: string }>;
  onSwitchMode: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  mode,
  onClose,
  onAuthSuccess,
  onSwitchMode,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'user' | 'artist'>('user');
  const [artistName, setArtistName] = useState('');
  const [artistBio, setArtistBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [experience, setExperience] = useState('');

  // 전문 분야 옵션
  const specialtyOptions = [
    '회화 (Painting)', '조각 (Sculpture)', '사진 (Photography)', '디지털 아트 (Digital Art)',
    '일러스트레이션 (Illustration)', '도예 (Ceramics)', '판화 (Printmaking)', 
    '설치 미술 (Installation)', '혼합 매체 (Mixed Media)', '수채화 (Watercolor)',
    '유화 (Oil Painting)', '아크릴화 (Acrylic)', '드로잉 (Drawing)', '캘리그래피 (Calligraphy)'
  ];

  const handleSpecialtyChange = (specialty: string) => {
    setSpecialties(prev => 
      prev.includes(specialty)
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const artistInfo = selectedRole === 'artist' && mode === 'signup' ? {
        artist_name: artistName,
        artist_bio: artistBio,
        specialties,
        portfolioUrl,
        website: websiteUrl,
        socialMedia: {
          instagram: instagramHandle,
          twitter: null
        },
        experience
      } : undefined;

      const result = await onAuthSuccess(
        email, 
        password, 
        mode === 'signup' ? (displayName || email.split('@')[0]) : undefined,
        mode === 'signup' ? selectedRole : undefined,
        artistInfo
      );

      if (!result.success) {
        throw new Error(result.error || '인증 실패');
      }

      // 폼 리셋
      setEmail('');
      setPassword('');
      setDisplayName('');
      setArtistName('');
      setArtistBio('');
      setSpecialties([]);
      setPortfolioUrl('');
      setWebsiteUrl('');
      setInstagramHandle('');
      setExperience('');
      setSelectedRole('user');

    } catch (error) {
      setError(error instanceof Error ? error.message : '인증 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {mode === 'login' ? '로그인' : '회원가입'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* 회원가입 시 역할 선택 */}
        {mode === 'signup' && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">계정 유형을 선택하세요</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('user')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedRole === 'user'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">👤</div>
                  <div className="font-semibold text-sm">일반 사용자</div>
                  <div className="text-xs text-gray-600 mt-1">작품 감상 및 분석</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('artist')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedRole === 'artist'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🎨</div>
                  <div className="font-semibold text-sm">예술가</div>
                  <div className="text-xs text-gray-600 mt-1">작품 등록 및 판매</div>
                </div>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="최소 6자 이상"
            />
          </div>

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  표시 이름 (선택)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="닉네임을 입력하세요"
                />
              </div>

              {/* 예술가 추가 정보 */}
              {selectedRole === 'artist' && (
                <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-800 text-sm">🎨 예술가 정보</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      예술가 이름
                    </label>
                    <input
                      type="text"
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="예술가명 또는 작업실명"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      전문 분야 (복수 선택 가능)
                    </label>
                    <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto bg-white">
                      <div className="grid grid-cols-2 gap-1">
                        {specialtyOptions.map((specialty) => (
                          <label key={specialty} className="flex items-center text-xs">
                            <input
                              type="checkbox"
                              checked={specialties.includes(specialty)}
                              onChange={() => handleSpecialtyChange(specialty)}
                              className="mr-1 text-purple-600"
                            />
                            <span className="truncate">{specialty}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{specialties.length}개 선택됨</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      작가 소개
                    </label>
                    <textarea
                      value={artistBio}
                      onChange={(e) => setArtistBio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="작품 스타일, 철학, 경력 등을 간단히 소개해주세요"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        포트폴리오 URL
                      </label>
                      <input
                        type="url"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="https://portfolio.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        웹사이트 URL
                      </label>
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="https://website.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instagram
                    </label>
                    <input
                      type="text"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="@username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      경력 사항 (선택)
                    </label>
                    <textarea
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="전시 경험, 수상 내역, 교육 배경 등"
                      rows={2}
                    />
                  </div>

                  <p className="text-xs text-purple-700">
                    ℹ️ 예술가 계정은 관리자 승인 후 작품을 등록할 수 있습니다.
                  </p>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-md transition-colors text-white ${
              mode === 'signup' && selectedRole === 'artist'
                ? 'bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300'
                : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300'
            }`}
          >
            {isLoading ? '처리 중...' : (
              mode === 'login' ? '로그인' : 
              selectedRole === 'artist' ? '예술가로 가입하기' : '가입하기'
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
            <button
              onClick={onSwitchMode}
              className="ml-1 text-blue-500 hover:text-blue-600 font-medium"
            >
              {mode === 'login' ? '회원가입' : '로그인'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};