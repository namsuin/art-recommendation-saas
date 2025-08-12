import React, { useState, useEffect } from 'react';

interface Artwork {
  id: string;
  title: string;
  artist: string;
  artist_bio?: string;
  image_url: string;
  description?: string;
  year?: number;
  medium?: string;
  style?: string;
  keywords: string[];
  colors: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export function ArtworkRegistry() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    artist_bio: '',
    description: '',
    year: '',
    medium: '',
    style: '',
    image_url: '',
    image_file: null as File | null
  });

  useEffect(() => {
    fetchArtworks();
  }, []);

  const fetchArtworks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/artworks');
      const data = await response.json();
      
      if (data.success && data.artworks) {
        setArtworks(data.artworks);
      }
    } catch (error) {
      console.error('Failed to fetch artworks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image_file: file }));
      
      // Preview image
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, image_url: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.artist) {
      alert('제목과 작가명은 필수입니다');
      return;
    }
    
    if (!formData.image_file && !formData.image_url) {
      alert('이미지를 업로드하거나 URL을 입력해주세요');
      return;
    }

    setAnalyzing(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('artist', formData.artist);
      formDataToSend.append('artist_bio', formData.artist_bio);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('year', formData.year);
      formDataToSend.append('medium', formData.medium);
      formDataToSend.append('style', formData.style);
      
      if (formData.image_file) {
        formDataToSend.append('image', formData.image_file);
      } else if (formData.image_url && !formData.image_url.startsWith('data:')) {
        formDataToSend.append('image_url', formData.image_url);
      }

      const response = await fetch('/api/admin/artworks', {
        method: 'POST',
        body: formDataToSend
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ 작품이 성공적으로 등록되었습니다!\n\nGoogle Vision으로 자동 분석이 완료되었습니다.');
        
        // Reset form
        setFormData({
          title: '',
          artist: '',
          artist_bio: '',
          description: '',
          year: '',
          medium: '',
          style: '',
          image_url: '',
          image_file: null
        });
        
        setShowAddForm(false);
        fetchArtworks(); // Refresh list
      } else {
        alert('작품 등록 실패: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('작품 등록 중 오류가 발생했습니다');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (artworkId: string) => {
    if (!confirm('정말로 이 작품을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/artworks/${artworkId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        alert('작품이 삭제되었습니다');
        fetchArtworks();
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('작품 삭제 중 오류가 발생했습니다');
    }
  };

  return (
    <div className="artwork-registry p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">🎨 작품 관리</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {showAddForm ? '취소' : '+ 새 작품 등록'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">새 작품 등록</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">작품명 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">작가명 *</label>
                <input
                  type="text"
                  value={formData.artist}
                  onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">작가 소개</label>
              <input
                type="text"
                value={formData.artist_bio}
                onChange={(e) => setFormData(prev => ({ ...prev, artist_bio: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: Dutch Post-Impressionist painter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">작품 설명</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="작품에 대한 설명을 입력하세요"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">제작년도</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 1889"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">매체</label>
                <input
                  type="text"
                  value={formData.medium}
                  onChange={(e) => setFormData(prev => ({ ...prev, medium: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: Oil on canvas"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">스타일</label>
                <input
                  type="text"
                  value={formData.style}
                  onChange={(e) => setFormData(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: Post-Impressionism"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium mb-1">작품 이미지 *</label>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block">
                    <span className="text-sm text-gray-600">파일 업로드</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </label>
                </div>
                
                <div className="text-center text-gray-500">또는</div>
                
                <div className="flex-1">
                  <label className="block">
                    <span className="text-sm text-gray-600">이미지 URL</span>
                    <input
                      type="url"
                      value={formData.image_url.startsWith('data:') ? '' : formData.image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value, image_file: null }))}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/image.jpg"
                    />
                  </label>
                </div>
              </div>

              {formData.image_url && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">미리보기:</p>
                  <img 
                    src={formData.image_url} 
                    alt="Preview" 
                    className="max-w-xs rounded-lg shadow-lg"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={analyzing}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
              >
                {analyzing ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    AI 분석 중...
                  </span>
                ) : (
                  '작품 등록'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Artworks List */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">등록된 작품 ({artworks.length})</h3>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : artworks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            등록된 작품이 없습니다
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {artworks.map(artwork => (
              <div key={artwork.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                {artwork.image_url && (
                  <img 
                    src={artwork.image_url} 
                    alt={artwork.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h4 className="font-semibold text-lg">{artwork.title}</h4>
                  <p className="text-gray-600">{artwork.artist}</p>
                  {artwork.year && (
                    <p className="text-sm text-gray-500">{artwork.year}</p>
                  )}
                  {artwork.style && (
                    <p className="text-sm text-gray-500">{artwork.style}</p>
                  )}
                  
                  {artwork.keywords.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">키워드:</p>
                      <div className="flex flex-wrap gap-1">
                        {artwork.keywords.slice(0, 5).map((keyword, idx) => (
                          <span 
                            key={idx}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                        {artwork.keywords.length > 5 && (
                          <span className="text-xs text-gray-500">
                            +{artwork.keywords.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 flex justify-between items-center">
                    <span className={`text-xs px-2 py-1 rounded ${
                      artwork.status === 'approved' ? 'bg-green-100 text-green-700' :
                      artwork.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {artwork.status === 'approved' ? '✅ 승인됨' :
                       artwork.status === 'pending' ? '⏳ 대기중' :
                       '❌ 거부됨'}
                    </span>
                    
                    <button
                      onClick={() => handleDelete(artwork.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}