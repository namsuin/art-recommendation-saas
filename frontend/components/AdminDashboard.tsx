import React, { useState, useEffect } from 'react';
import { ArtworkRegistry } from './ArtworkRegistry';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'artworks' | 'userlist' | 'applications' | 'registry'>('overview');
  
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
  
  // User list state  
  const [userList, setUserList] = useState<any[]>([]);
  
  // User edit state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get admin headers
  const getAdminHeaders = () => {
    const token = localStorage.getItem('admin-token') || 'admin-token-2025';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverviewData();
    } else if (activeTab === 'artworks') {
      loadArtworks();
    } else if (activeTab === 'applications') {
      loadApplications();
    } else if (activeTab === 'userlist') {
      loadUserList();
    }
  }, [activeTab, artworkPage]);

  const loadOverviewData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load all overview data in parallel
      const [userStatsRes, usageStatsRes, activityRes] = await Promise.all([
        fetch(`/api/admin/dashboard/stats`, { headers: getAdminHeaders() }),
        fetch(`/api/admin/dashboard/users`, { headers: getAdminHeaders() }),
        fetch(`/api/admin/dashboard/revenue`, { headers: getAdminHeaders() })
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
      const response = await fetch(`/api/admin/artworks?page=${artworkPage}&limit=20`, { headers: getAdminHeaders() });
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
      const response = await fetch('/api/admin/artist-applications', { headers: getAdminHeaders() });
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

  const loadUserList = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/dashboard/users', { headers: getAdminHeaders() });
      const result = await response.json();
      
      if (result.success) {
        setUserList(result.data || []);
      } else {
        setError(result.error || '회원 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to load user list:', error);
      setError('회원 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditFormData({
      display_name: user.displayName || user.display_name,
      role: user.role,
      subscription_tier: user.subscription_tier,
      artist_name: user.artist_name || '',
      artist_bio: user.artist_bio || '',
      total_analyses: user.total_analyses || 0,
      lifetimeValue: user.lifetimeValue || 0,
      specialties: user.specialties || [],
      portfolioUrl: user.portfolioUrl || '',
      website: user.website || '',
      socialMedia: user.socialMedia || { instagram: '', twitter: null },
      experience: user.experience || ''
    });
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('socialMedia.')) {
      const field = name.split('.')[1];
      setEditFormData((prev: any) => ({
        ...prev,
        socialMedia: {
          ...prev.socialMedia,
          [field]: value
        }
      }));
    } else {
      setEditFormData((prev: any) => ({
        ...prev,
        [name]: name === 'total_analyses' || name === 'lifetimeValue' ? parseInt(value) || 0 : value
      }));
    }
  };

  const handleSpecialtyChange = (specialty: string) => {
    setEditFormData((prev: any) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s: string) => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify(editFormData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 목록 새로고침
        await loadUserList();
        setEditingUser(null);
        setEditFormData({});
        alert('회원 정보가 성공적으로 수정되었습니다.');
      } else {
        alert('수정 중 오류가 발생했습니다: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('서버 오류가 발생했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditFormData({});
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

  const renderUserList = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">👥 회원 목록</h3>
          <div className="text-sm text-gray-500">
            총 {userList.length}명의 회원
          </div>
        </div>

        {userList.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">👥</div>
            <p className="text-gray-600 mb-2">등록된 회원이 없습니다</p>
            <p className="text-gray-500 text-sm">사용자가 가입하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    회원 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    역할
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    구독 등급
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    마지막 로그인
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    분석 횟수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {userList.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {(user.displayName || user.display_name || user.email)?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.displayName || user.display_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                          {user.artist_name && (
                            <div className="text-xs text-purple-600">
                              🎨 {user.artist_name}
                            </div>
                          )}
                          {user.role === 'artist' && user.specialties && user.specialties.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              🎯 {user.specialties.slice(0, 2).join(', ')}
                              {user.specialties.length > 2 && ` 외 ${user.specialties.length - 2}개`}
                            </div>
                          )}
                          {user.role === 'artist' && (user.portfolioUrl || user.website) && (
                            <div className="text-xs text-blue-500 mt-1 space-x-2">
                              {user.portfolioUrl && (
                                <a href={user.portfolioUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  🔗 포트폴리오
                                </a>
                              )}
                              {user.website && (
                                <a href={user.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  🌐 웹사이트
                                </a>
                              )}
                            </div>
                          )}
                          {user.role === 'artist' && user.socialMedia?.instagram && (
                            <div className="text-xs text-pink-500 mt-1">
                              <span>📷 {user.socialMedia.instagram}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'artist' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role === 'admin' ? '관리자' :
                         user.role === 'artist' ? '예술가' : '일반 사용자'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.subscription_tier === 'premium' ? 'bg-yellow-100 text-yellow-800' :
                        user.subscription_tier === 'standard' ? 'bg-blue-100 text-blue-800' :
                        user.subscription_tier === 'admin' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.subscription_tier === 'premium' ? '프리미엄' :
                         user.subscription_tier === 'standard' ? '스탠다드' :
                         user.subscription_tier === 'admin' ? '관리자' : '무료'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.total_analyses || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors"
                      >
                        ✏️ 수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 회원 통계 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">전체 회원</h4>
            <p className="text-2xl font-bold text-gray-900">{userList.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">예술가</h4>
            <p className="text-2xl font-bold text-purple-600">
              {userList.filter(u => u.role === 'artist').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">프리미엄 구독</h4>
            <p className="text-2xl font-bold text-yellow-600">
              {userList.filter(u => u.subscription_tier === 'premium').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">오늘 활동</h4>
            <p className="text-2xl font-bold text-green-600">
              {userList.filter(u => {
                if (!u.last_login) return false;
                const today = new Date().toDateString();
                const lastLogin = new Date(u.last_login).toDateString();
                return today === lastLogin;
              }).length}
            </p>
          </div>
        </div>
      </div>
    );
  };

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
              {artwork.keywords.slice(0, 10).map((keyword, idx) => (
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
    <div className="min-h-screen" style={{background: 'var(--gradient-hero)'}}>
      {/* 배경 장식 요소 */}
      <div className="decoration-blob blob-pink w-32 h-32 fixed top-10 right-10"></div>
      <div className="decoration-blob blob-lavender w-24 h-24 fixed bottom-20 left-10"></div>
      <div className="decoration-blob blob-peach w-20 h-20 fixed top-1/2 left-1/4"></div>
      
      {/* Navigation Header */}
      <nav className="nav-elegant shadow-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold heading-elegant heading-gradient">✨ 관리자 대시보드</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm" style={{color: 'var(--text-secondary)'}}>관리자</span>
              <button
                onClick={onClose}
                className="btn-soft btn-secondary-soft hover-lift"
              >
                🏠 메인으로
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              📊 개요
            </button>
            <button
              onClick={() => setActiveTab('userlist')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'userlist'
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              👥 회원 목록
            </button>
            <button
              onClick={() => setActiveTab('artworks')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'artworks'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              📚 작품 관리
            </button>
            <button
              onClick={() => setActiveTab('registry')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'registry'
                  ? 'border-purple-500 text-purple-600 bg-purple-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              🎨 작품 등록
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'applications'
                  ? 'border-green-500 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              🎤 예술가 신청
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm min-h-[calc(100vh-200px)]">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-6 mb-0">
              <p className="text-red-600">⚠️ {error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <span className="text-gray-600">로딩 중...</span>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'userlist' && renderUserList()}
              {activeTab === 'artworks' && renderArtworks()}
              {activeTab === 'registry' && <ArtworkRegistry />}
              {activeTab === 'applications' && renderApplications()}
            </div>
          )}
        </div>
      </div>

      {/* 회원 정보 편집 모달 */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">회원 정보 수정</h2>
              <button
                onClick={handleCancelEdit}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 왼쪽 컬럼 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      표시 이름 *
                    </label>
                    <input
                      type="text"
                      name="display_name"
                      value={editFormData.display_name || ''}
                      onChange={handleEditFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      역할 *
                    </label>
                    <select
                      name="role"
                      value={editFormData.role || 'user'}
                      onChange={handleEditFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="user">일반 사용자</option>
                      <option value="artist">예술가</option>
                      <option value="admin">관리자</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      구독 등급 *
                    </label>
                    <select
                      name="subscription_tier"
                      value={editFormData.subscription_tier || 'free'}
                      onChange={handleEditFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="free">무료</option>
                      <option value="standard">스탠다드</option>
                      <option value="premium">프리미엄</option>
                      <option value="admin">관리자</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      예술가 이름
                    </label>
                    <input
                      type="text"
                      name="artist_name"
                      value={editFormData.artist_name || ''}
                      onChange={handleEditFormChange}
                      placeholder="예술가인 경우 입력"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 오른쪽 컬럼 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      분석 횟수
                    </label>
                    <input
                      type="number"
                      name="total_analyses"
                      value={editFormData.total_analyses || 0}
                      onChange={handleEditFormChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      평생 가치 ($)
                    </label>
                    <input
                      type="number"
                      name="lifetimeValue"
                      value={editFormData.lifetimeValue || 0}
                      onChange={handleEditFormChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      예술가 소개
                    </label>
                    <textarea
                      name="artist_bio"
                      value={editFormData.artist_bio || ''}
                      onChange={handleEditFormChange}
                      rows={3}
                      placeholder="예술가인 경우 소개글 입력"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 예술가 전용 필드들 */}
              {editFormData.role === 'artist' && (
                <div className="mt-6 p-4 border border-purple-200 rounded-lg bg-purple-50">
                  <h3 className="text-lg font-medium text-purple-800 mb-4">🎨 예술가 전용 정보</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 왼쪽 컬럼 */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">전문 분야</label>
                        <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
                          {[
                            '회화 (Painting)', '조각 (Sculpture)', '사진 (Photography)', '디지털 아트 (Digital Art)',
                            '일러스트레이션 (Illustration)', '도예 (Ceramics)', '판화 (Printmaking)', 
                            '설치 미술 (Installation)', '혼합 매체 (Mixed Media)', '수채화 (Watercolor)',
                            '유화 (Oil Painting)', '아크릴화 (Acrylic)', '드로잉 (Drawing)', '캘리그래피 (Calligraphy)'
                          ].map((specialty) => (
                            <label key={specialty} className="flex items-center mb-1">
                              <input
                                type="checkbox"
                                checked={editFormData.specialties?.includes(specialty) || false}
                                onChange={() => handleSpecialtyChange(specialty)}
                                className="mr-2 text-purple-600"
                              />
                              <span className="text-sm">{specialty}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {editFormData.specialties?.length || 0}개 선택됨
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">포트폴리오 URL</label>
                        <input
                          type="url"
                          name="portfolioUrl"
                          value={editFormData.portfolioUrl || ''}
                          onChange={handleEditFormChange}
                          placeholder="https://portfolio.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">웹사이트 URL</label>
                        <input
                          type="url"
                          name="website"
                          value={editFormData.website || ''}
                          onChange={handleEditFormChange}
                          placeholder="https://website.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* 오른쪽 컬럼 */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">경력 사항</label>
                        <textarea
                          name="experience"
                          value={editFormData.experience || ''}
                          onChange={handleEditFormChange}
                          rows={4}
                          placeholder="전시 경험, 수상 내역, 교육 배경 등"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                        <input
                          type="text"
                          name="socialMedia.instagram"
                          value={editFormData.socialMedia?.instagram || ''}
                          onChange={handleEditFormChange}
                          placeholder="@username"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  수정 완료
                </button>
              </div>

              {/* 회원 기본 정보 (읽기 전용) */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">회원 기본 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">이메일:</span>
                    <span className="ml-2 text-gray-900">{editingUser.email}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">가입일:</span>
                    <span className="ml-2 text-gray-900">
                      {editingUser.created_at ? new Date(editingUser.created_at).toLocaleDateString('ko-KR') : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">사용자 ID:</span>
                    <span className="ml-2 text-gray-900">{editingUser.id}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">마지막 로그인:</span>
                    <span className="ml-2 text-gray-900">
                      {editingUser.last_login ? new Date(editingUser.last_login).toLocaleDateString('ko-KR') : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};