import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Edit, Trash2, Search, Filter, User, Calendar, Tag, Image as ImageIcon, MessageSquare, X, Save } from 'lucide-react';
// Using API calls instead of direct supabase

interface Artwork {
  id: string;
  title: string;
  artist_name: string;
  artist_id: string;
  category: string;
  medium: string;
  style: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  image_url: string;
  description: string;
  year_created: number;
  created_at: string;
  submitted_at?: string;
  approved_at?: string;
  keywords: string[];
  tags: string[];
  view_count: number;
  like_count: number;
  is_for_sale: boolean;
  price_krw?: number;
}

interface ArtistVerificationRequest {
  id: string;
  user_id: string;
  real_name: string;
  email: string;
  portfolio_url?: string;
  instagram_url?: string;
  website_url?: string;
  artist_statement?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
};

const STATUS_LABELS = {
  draft: '임시저장',
  pending: '승인대기',
  approved: '승인완료',
  rejected: '승인거부'
};

export default function AdminArtworkDashboard({ userId }: { userId: string }) {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<ArtistVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [selectedVerificationRequest, setSelectedVerificationRequest] = useState<ArtistVerificationRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'artworks' | 'verifications'>('artworks');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [actionType, setActionType] = useState<'artwork' | 'verification'>('artwork');
  const [actionTarget, setActionTarget] = useState<string>('');
  const [editMode, setEditMode] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);

  // 디버깅용 로그
  console.log('AdminArtworkDashboard rendered with userId:', userId);
  console.log('Current artworks:', artworks);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 작품 데이터 가져오기
      const { data: artworkData, error: artworkError } = await supabase
        .from('registered_artworks')
        .select('*')
        .order('created_at', { ascending: false });

      if (artworkError) {
        console.warn('Supabase error, using mock data:', artworkError);
        // Mock 데이터 사용 (테스트용)
        const mockArtworks = [
          {
            id: "mock-1",
            title: "테스트 작품 1",
            artist_name: "테스트 작가",
            artist_id: "test-artist-1",
            category: "회화",
            medium: "캔버스에 유화",
            style: "추상화",
            status: 'approved' as const,
            image_url: "https://via.placeholder.com/400x300?text=Test+Artwork+1",
            description: "테스트용 작품입니다.",
            year_created: 2024,
            created_at: new Date().toISOString(),
            keywords: ["테스트", "추상"],
            tags: ["#테스트"],
            view_count: 15,
            like_count: 3,
            is_for_sale: true,
            price_krw: 100000
          },
          {
            id: "mock-2",
            title: "테스트 작품 2",
            artist_name: "테스트 작가 2",
            artist_id: "test-artist-2",
            category: "조각",
            medium: "브론즈",
            style: "현대미술",
            status: 'pending' as const,
            image_url: "https://via.placeholder.com/400x300?text=Test+Artwork+2",
            description: "또 다른 테스트용 작품입니다.",
            year_created: 2023,
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            keywords: ["현대", "조각"],
            tags: ["#현대미술"],
            view_count: 8,
            like_count: 1,
            is_for_sale: false,
            price_krw: null
          }
        ];
        setArtworks(mockArtworks);
      } else {
        setArtworks(artworkData || []);
      }

      // 예술가 인증 요청 가져오기
      const { data: verificationData, error: verificationError } = await supabase
        .from('artist_verification_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (verificationError) throw verificationError;
      setVerificationRequests(verificationData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveArtwork = async (artworkId: string) => {
    try {
      const { error } = await supabase
        .from('registered_artworks')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: userId
        })
        .eq('id', artworkId);

      if (error) throw error;
      
      fetchData(); // 데이터 새로고침
      setSelectedArtwork(null);
    } catch (error) {
      console.error('Error approving artwork:', error);
      alert('작품 승인 중 오류가 발생했습니다.');
    }
  };

  const rejectArtwork = async (artworkId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('registered_artworks')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: userId,
          rejection_reason: reason
        })
        .eq('id', artworkId);

      if (error) throw error;
      
      fetchData();
      setSelectedArtwork(null);
      setShowRejectionModal(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting artwork:', error);
      alert('작품 거부 중 오류가 발생했습니다.');
    }
  };

  const approveVerificationRequest = async (requestId: string) => {
    try {
      // 인증 요청 승인
      const { error: requestError } = await supabase
        .from('artist_verification_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // 해당 요청 정보 가져오기
      const request = verificationRequests.find(r => r.id === requestId);
      if (request) {
        // 사용자를 인증된 예술가로 업데이트
        const { error: userError } = await supabase
          .from('users')
          .update({
            role: 'artist',
            artist_verified: true
          })
          .eq('id', request.user_id);

        if (userError) throw userError;
      }

      fetchData();
      setSelectedVerificationRequest(null);
    } catch (error) {
      console.error('Error approving verification:', error);
      alert('인증 승인 중 오류가 발생했습니다.');
    }
  };

  const rejectVerificationRequest = async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('artist_verification_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          rejection_reason: reason
        })
        .eq('id', requestId);

      if (error) throw error;
      
      fetchData();
      setSelectedVerificationRequest(null);
      setShowRejectionModal(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting verification:', error);
      alert('인증 거부 중 오류가 발생했습니다.');
    }
  };

  const deleteArtwork = async (artworkId: string) => {
    if (!confirm('정말로 이 작품을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('registered_artworks')
        .delete()
        .eq('id', artworkId);

      if (error) throw error;
      
      fetchData();
      setSelectedArtwork(null);
    } catch (error) {
      console.error('Error deleting artwork:', error);
      alert('작품 삭제 중 오류가 발생했습니다.');
    }
  };

  const updateArtwork = async (artwork: Artwork) => {
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('title', artwork.title);
      formData.append('artist_name', artwork.artist_name);
      formData.append('category', artwork.category);
      formData.append('medium', artwork.medium);
      formData.append('style', artwork.style);
      formData.append('description', artwork.description);
      formData.append('year_created', artwork.year_created.toString());
      formData.append('keywords', JSON.stringify(artwork.keywords));
      formData.append('tags', JSON.stringify(artwork.tags));
      formData.append('is_for_sale', artwork.is_for_sale.toString());
      if (artwork.price_krw) {
        formData.append('price_krw', artwork.price_krw.toString());
      }

      const response = await fetch(`/api/admin/artworks/${artwork.id}`, {
        method: 'PUT',
        body: formData
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '작품 수정에 실패했습니다.');
      }
      
      fetchData();
      setEditMode(false);
      setEditingArtwork(null);
      alert('작품 정보가 성공적으로 수정되었습니다.');
    } catch (error) {
      console.error('Error updating artwork:', error);
      alert('작품 수정 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  };

  const handleRejectionSubmit = () => {
    if (!rejectionReason.trim()) {
      alert('거부 사유를 입력해주세요.');
      return;
    }

    if (actionType === 'artwork') {
      rejectArtwork(actionTarget, rejectionReason);
    } else {
      rejectVerificationRequest(actionTarget, rejectionReason);
    }
  };

  const filteredArtworks = artworks.filter(artwork => {
    const matchesStatus = filterStatus === 'all' || artwork.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      artwork.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artwork.artist_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artwork.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const pendingVerifications = verificationRequests.filter(req => req.status === 'pending');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">관리자 대시보드</h1>
        <p className="text-gray-600">작품 및 예술가 인증 관리</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{artworks.filter(a => a.status === 'pending').length}</div>
          <div className="text-sm text-gray-600">승인 대기 작품</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{artworks.filter(a => a.status === 'approved').length}</div>
          <div className="text-sm text-gray-600">승인 완료 작품</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-yellow-600">{pendingVerifications.length}</div>
          <div className="text-sm text-gray-600">인증 대기 예술가</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{artworks.reduce((sum, a) => sum + a.view_count, 0)}</div>
          <div className="text-sm text-gray-600">총 조회수</div>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('artworks')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'artworks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              작품 관리 ({artworks.length})
            </button>
            <button
              onClick={() => setActiveTab('verifications')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'verifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              예술가 인증 ({pendingVerifications.length})
              {pendingVerifications.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {pendingVerifications.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'artworks' ? (
        <div>
          {/* 검색 및 필터 */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="작품명, 작가명, 카테고리로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.location.href = '/dashboard/artworksregister'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  새 작품 등록
                </button>
                <Filter className="text-gray-400 w-5 h-5" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체 상태</option>
                  <option value="pending">승인 대기</option>
                  <option value="approved">승인 완료</option>
                  <option value="rejected">승인 거부</option>
                  <option value="draft">임시저장</option>
                </select>
              </div>
            </div>
          </div>

          {/* 작품 목록 */}
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작품</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작가</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">카테고리</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">등록일</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">조회/좋아요</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredArtworks.map((artwork) => (
                    <tr key={artwork.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            className="h-12 w-12 rounded-lg object-cover"
                            src={artwork.image_url || 'https://via.placeholder.com/48'}
                            alt={artwork.title}
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{artwork.title}</div>
                            <div className="text-sm text-gray-500">{artwork.year_created}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{artwork.artist_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{artwork.category}</div>
                        <div className="text-sm text-gray-500">{artwork.medium}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[artwork.status]}`}>
                          {STATUS_LABELS[artwork.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(artwork.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{artwork.view_count} / {artwork.like_count}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedArtwork(artwork)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="상세보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingArtwork(artwork);
                              setEditMode(true);
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md flex items-center gap-1 text-sm font-medium"
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                            수정
                          </button>
                        {artwork.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveArtwork(artwork.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setActionType('artwork');
                                setActionTarget(artwork.id);
                                setShowRejectionModal(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteArtwork(artwork.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* 예술가 인증 요청 관리 */
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청자</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">포트폴리오</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {verificationRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{request.real_name}</div>
                        <div className="text-sm text-gray-500">{request.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.portfolio_url && (
                        <a
                          href={request.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          포트폴리오 보기
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        request.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {request.status === 'pending' ? '대기중' :
                         request.status === 'approved' ? '승인' : '거부'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setSelectedVerificationRequest(request)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approveVerificationRequest(request.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setActionType('verification');
                              setActionTarget(request.id);
                              setShowRejectionModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 작품 상세 모달 */}
      {selectedArtwork && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">{selectedArtwork.title}</h2>
                <button
                  onClick={() => setSelectedArtwork(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={selectedArtwork.image_url}
                    alt={selectedArtwork.title}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-700">작가</h3>
                    <p>{selectedArtwork.artist_name}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700">설명</h3>
                    <p>{selectedArtwork.description || '설명 없음'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-700">카테고리</h3>
                      <p>{selectedArtwork.category}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700">재료</h3>
                      <p>{selectedArtwork.medium}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700">키워드</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedArtwork.keywords.map((keyword, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  {selectedArtwork.is_for_sale && selectedArtwork.price_krw && (
                    <div>
                      <h3 className="font-semibold text-gray-700">가격</h3>
                      <p>{selectedArtwork.price_krw.toLocaleString()}원</p>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedArtwork.status === 'pending' && (
                <div className="mt-6 flex justify-center space-x-4">
                  <button
                    onClick={() => approveArtwork(selectedArtwork.id)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => {
                      setActionType('artwork');
                      setActionTarget(selectedArtwork.id);
                      setShowRejectionModal(true);
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    거부
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 인증 요청 상세 모달 */}
      {selectedVerificationRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">예술가 인증 요청</h2>
                <button
                  onClick={() => setSelectedVerificationRequest(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700">신청자 정보</h3>
                  <p><strong>이름:</strong> {selectedVerificationRequest.real_name}</p>
                  <p><strong>이메일:</strong> {selectedVerificationRequest.email}</p>
                </div>
                
                {selectedVerificationRequest.artist_statement && (
                  <div>
                    <h3 className="font-semibold text-gray-700">작가 소개</h3>
                    <p className="bg-gray-50 p-3 rounded">{selectedVerificationRequest.artist_statement}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="font-semibold text-gray-700">포트폴리오 링크</h3>
                  {selectedVerificationRequest.portfolio_url && (
                    <a
                      href={selectedVerificationRequest.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline block"
                    >
                      {selectedVerificationRequest.portfolio_url}
                    </a>
                  )}
                  {selectedVerificationRequest.instagram_url && (
                    <a
                      href={selectedVerificationRequest.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline block"
                    >
                      Instagram: {selectedVerificationRequest.instagram_url}
                    </a>
                  )}
                  {selectedVerificationRequest.website_url && (
                    <a
                      href={selectedVerificationRequest.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline block"
                    >
                      웹사이트: {selectedVerificationRequest.website_url}
                    </a>
                  )}
                </div>
              </div>
              
              {selectedVerificationRequest.status === 'pending' && (
                <div className="mt-6 flex justify-center space-x-4">
                  <button
                    onClick={() => approveVerificationRequest(selectedVerificationRequest.id)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => {
                      setActionType('verification');
                      setActionTarget(selectedVerificationRequest.id);
                      setShowRejectionModal(true);
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    거부
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 작품 수정 모달 */}
      {editMode && editingArtwork && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">작품 정보 수정</h2>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setEditingArtwork(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">작품명</label>
                    <input
                      type="text"
                      value={editingArtwork.title}
                      onChange={(e) => setEditingArtwork({...editingArtwork, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">작가명</label>
                    <input
                      type="text"
                      value={editingArtwork.artist_name}
                      onChange={(e) => setEditingArtwork({...editingArtwork, artist_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                    <select
                      value={editingArtwork.category}
                      onChange={(e) => setEditingArtwork({...editingArtwork, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="회화">회화</option>
                      <option value="조각">조각</option>
                      <option value="사진">사진</option>
                      <option value="디지털아트">디지털아트</option>
                      <option value="설치미술">설치미술</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">재료/기법</label>
                    <input
                      type="text"
                      value={editingArtwork.medium}
                      onChange={(e) => setEditingArtwork({...editingArtwork, medium: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="예: 캔버스에 유화, 디지털 프린트"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">스타일</label>
                    <input
                      type="text"
                      value={editingArtwork.style}
                      onChange={(e) => setEditingArtwork({...editingArtwork, style: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="예: 추상화, 인상주의, 현대미술"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">제작년도</label>
                    <input
                      type="number"
                      value={editingArtwork.year_created}
                      onChange={(e) => setEditingArtwork({...editingArtwork, year_created: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">작품 설명</label>
                    <textarea
                      value={editingArtwork.description}
                      onChange={(e) => setEditingArtwork({...editingArtwork, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="작품에 대한 설명을 입력하세요"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">키워드 (쉼표로 구분)</label>
                    <input
                      type="text"
                      value={editingArtwork.keywords.join(', ')}
                      onChange={(e) => setEditingArtwork({...editingArtwork, keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="예: 추상, 현대미술, 색채"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">태그 (쉼표로 구분)</label>
                    <input
                      type="text"
                      value={editingArtwork.tags.join(', ')}
                      onChange={(e) => setEditingArtwork({...editingArtwork, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="예: #현대미술 #추상화"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingArtwork.is_for_sale}
                        onChange={(e) => setEditingArtwork({...editingArtwork, is_for_sale: e.target.checked})}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">판매 가능</span>
                    </label>
                    
                    {editingArtwork.is_for_sale && (
                      <div className="flex-1">
                        <input
                          type="number"
                          value={editingArtwork.price_krw || ''}
                          onChange={(e) => setEditingArtwork({...editingArtwork, price_krw: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="가격 (원)"
                          min="0"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setEditMode(false);
                    setEditingArtwork(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={() => updateArtwork(editingArtwork)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>저장</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 거부 사유 모달 */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">거부 사유 입력</h2>
                <button
                  onClick={() => setShowRejectionModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  거부 사유를 입력해주세요
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={4}
                  placeholder="구체적인 거부 사유를 입력해주세요..."
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRejectionModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleRejectionSubmit}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  거부
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}