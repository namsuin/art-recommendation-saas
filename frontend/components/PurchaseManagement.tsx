import React, { useState, useEffect } from 'react';

interface PurchaseRequest {
  id: string;
  artwork_id: string;
  user_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  delivery_address?: string;
  message?: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'pending' | 'processing' | 'contacted' | 'completed' | 'cancelled';
  estimated_price?: number;
  final_price?: number;
  admin_note?: string;
  created_at: string;
  updated_at: string;
  artworks: {
    id: string;
    title: string;
    artist: string;
    image_url: string;
    price?: number;
  };
  users: {
    email: string;
    display_name?: string;
  };
}

interface PurchaseManagementProps {
  user: any;
  onClose: () => void;
}

export const PurchaseManagement: React.FC<PurchaseManagementProps> = ({ user, onClose }) => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [updating, setUpdating] = useState(false);

  // Status update form state
  const [newStatus, setNewStatus] = useState<string>('');
  const [adminNote, setAdminNote] = useState('');
  const [finalPrice, setFinalPrice] = useState('');

  useEffect(() => {
    loadPurchaseRequests();
  }, [selectedStatus]);

  const loadPurchaseRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      const statusParam = selectedStatus === 'all' ? '' : `&status=${selectedStatus}`;
      const response = await fetch(`/api/admin/purchase/requests?userId=${user.id}${statusParam}`);
      const result = await response.json();

      if (result.success) {
        setRequests(result.requests);
      } else {
        setError(result.error || '구매 요청 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedRequest || !newStatus) return;

    setUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/purchase/requests/${selectedRequest.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          status: newStatus,
          adminNote: adminNote.trim() || undefined,
          finalPrice: finalPrice ? parseFloat(finalPrice) : undefined
        })
      });

      const result = await response.json();

      if (result.success) {
        await loadPurchaseRequests();
        setSelectedRequest(null);
        setNewStatus('');
        setAdminNote('');
        setFinalPrice('');
      } else {
        setError(result.error || '상태 업데이트에 실패했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  const openStatusModal = (request: PurchaseRequest) => {
    setSelectedRequest(request);
    setNewStatus(request.status);
    setAdminNote(request.admin_note || '');
    setFinalPrice(request.final_price?.toString() || '');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      contacted: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[urgency as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const statusLabels = {
    pending: '대기중',
    processing: '처리중',
    contacted: '연락완료',
    completed: '완료',
    cancelled: '취소됨'
  };

  const urgencyLabels = {
    low: '낮음',
    medium: '보통',
    high: '높음'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">구매 요청 관리</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Status Filter */}
        <div className="p-6 border-b">
          <div className="flex space-x-4">
            {['all', 'pending', 'processing', 'contacted', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  selectedStatus === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? '전체' : statusLabels[status as keyof typeof statusLabels]}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">⚠️ {error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2">로딩 중...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">구매 요청이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {requests.map((request) => (
                <div key={request.id} className="bg-white border rounded-lg p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex space-x-4">
                      <img
                        src={request.artworks.image_url}
                        alt={request.artworks.title}
                        className="w-20 h-20 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/80x80?text=No+Image';
                        }}
                      />
                      <div>
                        <h3 className="text-lg font-semibold">{request.artworks.title}</h3>
                        <p className="text-gray-600">{request.artworks.artist}</p>
                        <p className="text-green-600 font-medium">
                          {request.artworks.price ? `₩${request.artworks.price.toLocaleString()}` : '가격 미정'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                        {statusLabels[request.status]}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(request.urgency)}`}>
                        {urgencyLabels[request.urgency]}
                      </span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">고객 정보</h4>
                      <p><strong>이름:</strong> {request.contact_name}</p>
                      <p><strong>연락처:</strong> {request.contact_phone}</p>
                      <p><strong>이메일:</strong> {request.contact_email}</p>
                      {request.delivery_address && (
                        <p><strong>주소:</strong> {request.delivery_address}</p>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">요청 정보</h4>
                      <p><strong>요청일:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
                      <p><strong>예상 가격:</strong> {request.estimated_price ? `₩${request.estimated_price.toLocaleString()}` : '미정'}</p>
                      {request.final_price && (
                        <p><strong>최종 가격:</strong> ₩{request.final_price.toLocaleString()}</p>
                      )}
                    </div>
                  </div>

                  {request.message && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">고객 메시지</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">{request.message}</p>
                    </div>
                  )}

                  {request.admin_note && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">관리자 메모</h4>
                      <p className="text-gray-700 bg-blue-50 p-3 rounded">{request.admin_note}</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => openStatusModal(request)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium"
                    >
                      상태 변경
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Update Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">상태 변경 - {selectedRequest.artworks.title}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상태
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    최종 가격 (선택)
                  </label>
                  <input
                    type="number"
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(e.target.value)}
                    placeholder="최종 가격을 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    관리자 메모 (선택)
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                    placeholder="고객에게 전달할 메시지나 내부 메모를 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  취소
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={updating}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded"
                >
                  {updating ? '업데이트 중...' : '업데이트'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};