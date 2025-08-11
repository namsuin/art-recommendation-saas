import React, { useState, useEffect } from 'react';

interface AdminDashboardProps {
  user: any;
  onClose: () => void;
}

interface UserStats {
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  todaySignups: number;
  activeSubscriptions: number;
}

interface UsageStats {
  todayAnalysis: number;
  monthlyAnalysis: number;
  totalArtworks: number;
  totalRecommendations: number;
  clickedRecommendations: number;
  clickRate: string;
}

interface RecentUser {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  subscription_tier: string;
}

interface RecentUpload {
  id: string;
  created_at: string;
  analysis_keywords: string[];
  users: {
    email: string;
    display_name: string;
  };
}

interface Artwork {
  id: string;
  title: string;
  artist: string;
  image_url: string;
  keywords: string[];
  price: number;
  available: boolean;
  created_at: string;
}

interface ArtistApplication {
  id: string;
  user_id: string;
  email: string;
  artist_name: string;
  bio: string;
  portfolio_url?: string;
  instagram_url?: string;
  experience: string;
  specialties: string[];
  statement: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  reviewed_at?: string;
  review_notes?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'artworks' | 'users' | 'applications'>('overview');
  
  // Stats state
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<{
    recentUsers: RecentUser[];
    recentUploads: RecentUpload[];
  } | null>(null);
  
  // Artworks state
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artworkPage, setArtworkPage] = useState(1);
  const [totalArtworks, setTotalArtworks] = useState(0);
  
  // Artist applications state
  const [applications, setApplications] = useState<ArtistApplication[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverviewData();
    } else if (activeTab === 'artworks') {
      loadArtworks();
    } else if (activeTab === 'applications') {
      loadApplications();
    }
  }, [activeTab, artworkPage]);

  const loadOverviewData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load all overview data in parallel
      const [userStatsRes, usageStatsRes, activityRes] = await Promise.all([
        fetch(`/api/admin/stats/users?userId=${user.id}`),
        fetch(`/api/admin/stats/usage?userId=${user.id}`),
        fetch(`/api/admin/activity?userId=${user.id}`)
      ]);

      const [userStatsData, usageStatsData, activityData] = await Promise.all([
        userStatsRes.json(),
        usageStatsRes.json(),
        activityRes.json()
      ]);

      if (userStatsData.success) {
        setUserStats(userStatsData.stats);
      }

      if (usageStatsData.success) {
        setUsageStats(usageStatsData.stats);
      }

      if (activityData.success) {
        setRecentActivity({
          recentUsers: activityData.recentUsers,
          recentUploads: activityData.recentUploads
        });
      }

    } catch (error) {
      console.error('Failed to load overview data:', error);
      setError('대시보드 데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadArtworks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/artworks?userId=${user.id}&page=${artworkPage}&limit=20`);
      const result = await response.json();

      if (result.success) {
        setArtworks(result.artworks);
        setTotalArtworks(result.totalCount);
      } else {
        setError(result.error || '작품 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to load artworks:', error);
      setError('작품 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadApplications = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/artist-applications');
      const result = await response.json();
      
      if (result.success) {
        setApplications(result.applications || []);
      } else {
        setError(result.error || '예술가 신청 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
      setError('예술가 신청 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleApplicationReview = async (applicationId: string, action: 'approve' | 'reject') => {
    try {
      const reviewNotes = action === 'approve' 
        ? '예술가 자격이 확인되어 승인됩니다.' 
        : '신청 요건을 충족하지 못하여 거부됩니다.';
      
      const response = await fetch('/api/admin/artist-applications/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          action,
          reviewNotes
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 목록 새로고침
        loadApplications();
        alert(`신청이 ${action === 'approve' ? '승인' : '거부'}되었습니다.`);
      } else {
        alert('신청 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to review application:', error);
      alert('신청 처리 중 오류가 발생했습니다.');
    }
  };

  const toggleArtworkAvailability = async (artworkId: string, available: boolean) => {
    try {
      const response = await fetch(`/api/admin/artworks/${artworkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          available: !available
        })
      });

      const result = await response.json();

      if (result.success) {
        // Refresh artworks list
        loadArtworks();
      } else {
        setError(result.error || '작품 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    }
  };

  const deleteArtwork = async (artworkId: string) => {
    if (!confirm('정말로 이 작품을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/artworks/${artworkId}?userId=${user.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        // Refresh artworks list
        loadArtworks();
      } else {
        setError(result.error || '작품 삭제에 실패했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {userStats && (
          <>
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-sm font-medium text-blue-600">총 사용자</h3>
              <p className="text-2xl font-bold text-blue-900">{userStats.totalUsers}</p>
              <p className="text-sm text-blue-600">오늘 가입: {userStats.todaySignups}명</p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-sm font-medium text-green-600">프리미엄 사용자</h3>
              <p className="text-2xl font-bold text-green-900">{userStats.premiumUsers}</p>
              <p className="text-sm text-green-600">활성 구독: {userStats.activeSubscriptions}개</p>
            </div>
          </>
        )}

        {usageStats && (
          <>
            <div className="bg-purple-50 rounded-lg p-6">
              <h3 className="text-sm font-medium text-purple-600">오늘 분석</h3>
              <p className="text-2xl font-bold text-purple-900">{usageStats.todayAnalysis}</p>
              <p className="text-sm text-purple-600">이번 달: {usageStats.monthlyAnalysis}회</p>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-6">
              <h3 className="text-sm font-medium text-orange-600">클릭률</h3>
              <p className="text-2xl font-bold text-orange-900">{usageStats.clickRate}%</p>
              <p className="text-sm text-orange-600">총 추천: {usageStats.totalRecommendations}개</p>
            </div>
          </>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {recentActivity?.recentUsers && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">최근 가입 사용자</h3>
            <div className="space-y-3">
              {recentActivity.recentUsers.map((user) => (
                <div key={user.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{user.display_name || user.email}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.subscription_tier === 'premium' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.subscription_tier === 'premium' ? '프리미엄' : '무료'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentActivity?.recentUploads && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">최근 이미지 분석</h3>
            <div className="space-y-3">
              {recentActivity.recentUploads.map((upload) => (
                <div key={upload.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{upload.users.display_name || upload.users.email}</p>
                    <p className="text-sm text-gray-500">
                      키워드: {upload.analysis_keywords.slice(0, 3).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(upload.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderApplications = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">🎨 예술가 신청 관리</h3>
          <div className="text-sm text-gray-500">
            총 {applications.length}건의 신청
          </div>
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">아직 신청이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{app.artist_name}</h4>
                    <p className="text-sm text-gray-500">{app.email}</p>
                    <p className="text-xs text-gray-400">
                      신청일: {new Date(app.applied_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {app.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleApplicationReview(app.id, 'approve')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          ✅ 승인
                        </button>
                        <button
                          onClick={() => handleApplicationReview(app.id, 'reject')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          ❌ 거부
                        </button>
                      </>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        app.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {app.status === 'approved' ? '승인됨' : '거부됨'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">경력</p>
                    <p className="text-sm text-gray-600">
                      {app.experience === 'beginner' && '초보자 (1년 미만)'}
                      {app.experience === 'intermediate' && '중급자 (1-5년)'}
                      {app.experience === 'advanced' && '고급자 (5-10년)'}
                      {app.experience === 'professional' && '전문가 (10년 이상)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">전문 분야</p>
                    <p className="text-sm text-gray-600">{app.specialties.join(', ')}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">자기소개</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{app.bio}</p>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">예술관</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{app.statement}</p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  {app.portfolio_url && (
                    <a 
                      href={app.portfolio_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      🌐 포트폴리오
                    </a>
                  )}
                  {app.instagram_url && (
                    <a 
                      href={app.instagram_url.startsWith('http') ? app.instagram_url : `https://instagram.com/${app.instagram_url.replace('@', '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:underline"
                    >
                      📷 인스타그램
                    </a>
                  )}
                </div>

                {app.reviewed_at && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      처리일: {new Date(app.reviewed_at).toLocaleString('ko-KR')}
                      {app.review_notes && ` - ${app.review_notes}`}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderArtworks = () => (
    <div className="space-y-6">
      {/* Artworks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {artworks.map((artwork) => (
          <div key={artwork.id} className="bg-white rounded-lg shadow p-4">
            <img
              src={artwork.image_url}
              alt={artwork.title}
              className="w-full h-48 object-cover rounded mb-3"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/300x300?text=No+Image';
              }}
            />
            
            <h4 className="font-semibold">{artwork.title}</h4>
            <p className="text-sm text-gray-600">{artwork.artist}</p>
            <p className="text-sm text-gray-500">₩{artwork.price?.toLocaleString()}</p>
            
            <div className="flex flex-wrap gap-1 mt-2">
              {artwork.keywords.slice(0, 3).map((keyword, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  {keyword}
                </span>
              ))}
            </div>

            <div className="flex justify-between items-center mt-4">
              <span className={`px-2 py-1 rounded text-xs ${
                artwork.available 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {artwork.available ? '활성' : '비활성'}
              </span>
              
              <div className="space-x-2">
                <button
                  onClick={() => toggleArtworkAvailability(artwork.id, artwork.available)}
                  className={`px-3 py-1 rounded text-xs ${
                    artwork.available
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {artwork.available ? '비활성화' : '활성화'}
                </button>
                
                <button
                  onClick={() => deleteArtwork(artwork.id)}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalArtworks > 20 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setArtworkPage(Math.max(1, artworkPage - 1))}
            disabled={artworkPage === 1}
            className="px-3 py-2 bg-gray-300 disabled:bg-gray-100 rounded"
          >
            이전
          </button>
          
          <span className="px-3 py-2">
            {artworkPage} / {Math.ceil(totalArtworks / 20)}
          </span>
          
          <button
            onClick={() => setArtworkPage(artworkPage + 1)}
            disabled={artworkPage >= Math.ceil(totalArtworks / 20)}
            className="px-3 py-2 bg-gray-300 disabled:bg-gray-100 rounded"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">관리자 대시보드</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            개요
          </button>
          <button
            onClick={() => setActiveTab('artworks')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'artworks'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            작품 관리
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'applications'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🎨 예술가 신청
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">⚠️ {error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2">로딩 중...</span>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'artworks' && renderArtworks()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};