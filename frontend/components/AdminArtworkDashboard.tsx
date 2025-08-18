import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Edit, Trash2, Search, Filter, User, Calendar, Tag, Image as ImageIcon, MessageSquare, X, Save, Edit2 } from 'lucide-react';

interface Artwork {
  id: string;
  title: string;
  artist_name: string;
  artist_id?: string;
  category: string;
  medium?: string;
  style?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  image_url: string;
  description: string;
  year_created?: number;
  created_at: string;
  submitted_at?: string;
  approved_at?: string;
  keywords?: string[];
  tags?: string[];
  view_count?: number;
  like_count?: number;
  is_for_sale?: boolean;
  price_krw?: number;
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
  const [loading, setLoading] = useState(true);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [actionTarget, setActionTarget] = useState<string>('');
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // API를 통해 작품 데이터 가져오기
      const adminToken = localStorage.getItem('admin-token');
      const response = await fetch('/api/admin/artworks', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.artworks) {
          setArtworks(result.artworks);
        }
      } else {
        console.warn('Failed to fetch artworks');
        setArtworks([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setArtworks([]);
    } finally {
      setLoading(false);
    }
  };

  const approveArtwork = async (artworkId: string) => {
    try {
      const adminToken = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/artworks/${artworkId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      alert('작품이 승인되었습니다.');
      fetchData();
      setSelectedArtwork(null);
    } catch (error) {
      console.error('Error approving artwork:', error);
      alert('작품 승인 중 오류가 발생했습니다.');
    }
  };

  const rejectArtwork = async (artworkId: string, reason: string) => {
    try {
      const adminToken = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/artworks/${artworkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: reason
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      alert('작품이 거부되었습니다.');
      setRejectionReason('');
      setShowRejectionModal(false);
      fetchData();
      setSelectedArtwork(null);
    } catch (error) {
      console.error('Error rejecting artwork:', error);
      alert('작품 거부 중 오류가 발생했습니다.');
    }
  };

  const deleteArtwork = async (artworkId: string) => {
    if (!confirm('정말로 이 작품을 삭제하시겠습니까?')) return;

    try {
      const adminToken = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/artworks/${artworkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      alert('작품이 삭제되었습니다.');
      fetchData();
      setSelectedArtwork(null);
    } catch (error) {
      console.error('Error deleting artwork:', error);
      alert('작품 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEditArtwork = (artwork: Artwork) => {
    setEditingArtwork(artwork);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingArtwork) return;

    try {
      const adminToken = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/artworks/${editingArtwork.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(editingArtwork)
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      alert('작품이 수정되었습니다.');
      setShowEditModal(false);
      setEditingArtwork(null);
      fetchData();
    } catch (error) {
      console.error('Error updating artwork:', error);
      alert('작품 수정 중 오류가 발생했습니다.');
    }
  };

  const filteredArtworks = artworks.filter(artwork => {
    const matchesStatus = filterStatus === 'all' || artwork.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      artwork.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artwork.artist_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">작품 관리</h2>
        
        {/* 검색 및 필터 */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="작품명 또는 작가명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체</option>
            <option value="pending">승인대기</option>
            <option value="approved">승인완료</option>
            <option value="rejected">승인거부</option>
          </select>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">전체 작품</div>
            <div className="text-2xl font-bold">{artworks.length}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">승인대기</div>
            <div className="text-2xl font-bold text-yellow-600">
              {artworks.filter(a => a.status === 'pending').length}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">승인완료</div>
            <div className="text-2xl font-bold text-green-600">
              {artworks.filter(a => a.status === 'approved').length}
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">승인거부</div>
            <div className="text-2xl font-bold text-red-600">
              {artworks.filter(a => a.status === 'rejected').length}
            </div>
          </div>
        </div>
      </div>

      {/* 작품 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작품
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작가
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  카테고리
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  등록일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredArtworks.map((artwork) => (
                <tr key={artwork.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {artwork.image_url && (
                        <img
                          src={artwork.image_url}
                          alt={artwork.title}
                          className="w-10 h-10 rounded-lg object-cover mr-3"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {artwork.title}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{artwork.artist_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{artwork.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[artwork.status]}`}>
                      {STATUS_LABELS[artwork.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(artwork.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedArtwork(artwork)}
                        className="text-blue-600 hover:text-blue-900"
                        title="상세보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditArtwork(artwork)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="수정"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {artwork.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approveArtwork(artwork.id)}
                            className="text-green-600 hover:text-green-900"
                            title="승인"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setActionTarget(artwork.id);
                              setShowRejectionModal(true);
                            }}
                            className="text-orange-600 hover:text-orange-900"
                            title="거부"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteArtwork(artwork.id)}
                        className="text-red-600 hover:text-red-900"
                        title="삭제"
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

      {/* 상세 보기 모달 */}
      {selectedArtwork && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">{selectedArtwork.title}</h3>
                <button
                  onClick={() => setSelectedArtwork(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {selectedArtwork.image_url && (
                <img
                  src={selectedArtwork.image_url}
                  alt={selectedArtwork.title}
                  className="w-full max-h-96 object-contain mb-4 rounded-lg"
                />
              )}
              
              <div className="space-y-2">
                <p><strong>작가:</strong> {selectedArtwork.artist_name}</p>
                <p><strong>카테고리:</strong> {selectedArtwork.category}</p>
                <p><strong>설명:</strong> {selectedArtwork.description}</p>
                <p><strong>상태:</strong> 
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${STATUS_COLORS[selectedArtwork.status]}`}>
                    {STATUS_LABELS[selectedArtwork.status]}
                  </span>
                </p>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                {selectedArtwork.status === 'pending' && (
                  <>
                    <button
                      onClick={() => approveArtwork(selectedArtwork.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => {
                        setActionTarget(selectedArtwork.id);
                        setShowRejectionModal(true);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      거부
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedArtwork(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 거부 사유 입력 모달 */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">거부 사유 입력</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="거부 사유를 입력해주세요..."
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={4}
            />
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                취소
              </button>
              <button
                onClick={() => rejectArtwork(actionTarget, rejectionReason)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                disabled={!rejectionReason.trim()}
              >
                거부
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && editingArtwork && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">작품 수정</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingArtwork(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    작품명
                  </label>
                  <input
                    type="text"
                    value={editingArtwork.title}
                    onChange={(e) => setEditingArtwork({...editingArtwork, title: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    작가명
                  </label>
                  <input
                    type="text"
                    value={editingArtwork.artist_name}
                    onChange={(e) => setEditingArtwork({...editingArtwork, artist_name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    카테고리
                  </label>
                  <input
                    type="text"
                    value={editingArtwork.category}
                    onChange={(e) => setEditingArtwork({...editingArtwork, category: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={editingArtwork.description}
                    onChange={(e) => setEditingArtwork({...editingArtwork, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이미지 URL
                  </label>
                  <input
                    type="text"
                    value={editingArtwork.image_url}
                    onChange={(e) => setEditingArtwork({...editingArtwork, image_url: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    가격 (원)
                  </label>
                  <input
                    type="number"
                    value={editingArtwork.price_krw || ''}
                    onChange={(e) => setEditingArtwork({...editingArtwork, price_krw: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상태
                  </label>
                  <select
                    value={editingArtwork.status}
                    onChange={(e) => setEditingArtwork({...editingArtwork, status: e.target.value as Artwork['status']})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">임시저장</option>
                    <option value="pending">승인대기</option>
                    <option value="approved">승인완료</option>
                    <option value="rejected">승인거부</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingArtwork.is_for_sale || false}
                    onChange={(e) => setEditingArtwork({...editingArtwork, is_for_sale: e.target.checked})}
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-700">
                    판매 가능
                  </label>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingArtwork(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}