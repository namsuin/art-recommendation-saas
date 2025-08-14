import React, { useState } from 'react';

interface ArtworkFormProps {
  user: any;
  onSuccess: () => void;
  onCancel: () => void;
  editingArtwork?: Artwork | null;
}

interface Artwork {
  id: string;
  title: string;
  artist: string;
  image_url: string;
  thumbnail_url?: string;
  description?: string;
  keywords: string[];
  price?: number;
  available: boolean;
  created_at: string;
}

export const ArtworkForm: React.FC<ArtworkFormProps> = ({ 
  user, 
  onSuccess, 
  onCancel, 
  editingArtwork 
}) => {
  const [formData, setFormData] = useState({
    title: editingArtwork?.title || '',
    artist: editingArtwork?.artist || '',
    image_url: editingArtwork?.image_url || '',
    thumbnail_url: editingArtwork?.thumbnail_url || '',
    description: editingArtwork?.description || '',
    keywords: editingArtwork?.keywords?.join(', ') || '',
    price: editingArtwork?.price?.toString() || '',
    available: editingArtwork?.available ?? true
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const keywords = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const artworkData = {
        title: formData.title,
        artist: formData.artist,
        image_url: formData.image_url,
        thumbnail_url: formData.thumbnail_url || undefined,
        description: formData.description || undefined,
        keywords,
        price: formData.price ? parseFloat(formData.price) : undefined,
        available: formData.available,
        userId: user.id
      };

      const url = editingArtwork 
        ? `/api/artwork/${editingArtwork.id}`
        : '/api/artwork/register';
      
      const method = editingArtwork ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(artworkData)
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || '작품 저장에 실패했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {editingArtwork ? '작품 수정' : '새 작품 추가'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">⚠️ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                작품 제목 *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                작가 *
              </label>
              <input
                type="text"
                name="artist"
                value={formData.artist}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이미지 URL *
              </label>
              <input
                type="url"
                name="image_url"
                value={formData.image_url}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {formData.image_url && (
                <div className="mt-2">
                  <img
                    src={formData.image_url}
                    alt="미리보기"
                    className="w-32 h-32 object-cover rounded border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                썸네일 URL (선택)
              </label>
              <input
                type="url"
                name="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명 (선택)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                키워드 (쉼표로 구분) *
              </label>
              <input
                type="text"
                name="keywords"
                value={formData.keywords}
                onChange={handleInputChange}
                placeholder="portrait, renaissance, classical"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                예: portrait, renaissance, classical
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                가격 (선택)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="100000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="available"
                checked={formData.available}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                작품 활성화 (추천에 포함)
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-md"
              >
                {isLoading ? '저장 중...' : (editingArtwork ? '수정' : '추가')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface ArtworkListProps {
  user: any;
  artworks: Artwork[];
  onEdit: (artwork: Artwork) => void;
  onDelete: (artworkId: string) => void;
  onToggleAvailability: (artworkId: string, available: boolean) => void;
}

export const ArtworkList: React.FC<ArtworkListProps> = ({
  user,
  artworks,
  onEdit,
  onDelete,
  onToggleAvailability
}) => {
  if (artworks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">등록된 작품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {artworks.map((artwork) => (
        <div key={artwork.id} className="bg-white rounded-lg shadow p-4">
          <img
            src={artwork.thumbnail_url || artwork.image_url}
            alt={artwork.title}
            className="w-full h-48 object-cover rounded mb-3"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/300x300?text=No+Image';
            }}
          />
          
          <h4 className="font-semibold text-lg">{artwork.title}</h4>
          <p className="text-gray-600">{artwork.artist}</p>
          
          {artwork.price && (
            <p className="text-green-600 font-medium">
              ₩{artwork.price.toLocaleString()}
            </p>
          )}
          
          {artwork.description && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
              {artwork.description}
            </p>
          )}
          
          <div className="flex flex-wrap gap-1 mt-2">
            {artwork.keywords.slice(0, 3).map((keyword, idx) => (
              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                {keyword}
              </span>
            ))}
            {artwork.keywords.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                +{artwork.keywords.length - 3}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center mt-4">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              artwork.available 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {artwork.available ? '활성' : '비활성'}
            </span>
            
            <div className="space-x-2">
              <button
                onClick={() => onEdit(artwork)}
                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs"
              >
                수정
              </button>
              
              <button
                onClick={() => onToggleAvailability(artwork.id, artwork.available)}
                className={`px-3 py-1 rounded text-xs ${
                  artwork.available
                    ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                    : 'bg-green-100 hover:bg-green-200 text-green-700'
                }`}
              >
                {artwork.available ? '비활성화' : '활성화'}
              </button>
              
              <button
                onClick={() => onDelete(artwork.id)}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
              >
                삭제
              </button>
            </div>
          </div>
          
          <div className="text-xs text-gray-400 mt-2">
            등록일: {new Date(artwork.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
};