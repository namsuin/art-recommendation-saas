import React, { useState, useEffect } from 'react';

interface Artwork {
  id: string;
  title: string;
  description?: string;
  category?: string;
  medium?: string;
  style?: string;
  year_created?: number;
  width_cm?: number;
  height_cm?: number;
  depth_cm?: number;
  price_krw?: number;
  price_usd?: number;
  for_sale?: boolean;
  edition?: string;
  location?: string;
  tags?: string;
  image_url?: string;
  image_data?: string;
}

interface ArtworkEditModalProps {
  artwork: Artwork;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ArtworkEditModal: React.FC<ArtworkEditModalProps> = ({
  artwork,
  userId,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<Partial<Artwork>>({
    title: '',
    description: '',
    category: '',
    medium: '',
    style: '',
    year_created: undefined,
    width_cm: undefined,
    height_cm: undefined,
    depth_cm: undefined,
    price_krw: undefined,
    price_usd: undefined,
    for_sale: false,
    edition: '',
    location: '',
    tags: '',
    image_url: ''
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 기존 작품 데이터로 폼 초기화
    setFormData({
      title: artwork.title || '',
      description: artwork.description || '',
      category: artwork.category || '',
      medium: artwork.medium || '',
      style: artwork.style || '',
      year_created: artwork.year_created,
      width_cm: artwork.width_cm,
      height_cm: artwork.height_cm,
      depth_cm: artwork.depth_cm,
      price_krw: artwork.price_krw,
      price_usd: artwork.price_usd,
      for_sale: artwork.for_sale || false,
      edition: artwork.edition || '',
      location: artwork.location || '',
      tags: artwork.tags || '',
      image_url: artwork.image_url || ''
    });

    // 이미지 미리보기 설정
    if (artwork.image_url) {
      setImagePreview(artwork.image_url);
    } else if (artwork.image_data) {
      setImagePreview(`data:image/jpeg;base64,${artwork.image_data}`);
    }
  }, [artwork]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      
      // 사용자 ID 추가
      formDataToSend.append('userId', userId);
      
      // 각 필드 추가
      if (formData.title) formDataToSend.append('title', formData.title);
      if (formData.description) formDataToSend.append('description', formData.description);
      if (formData.category) formDataToSend.append('category', formData.category);
      if (formData.medium) formDataToSend.append('medium', formData.medium);
      if (formData.style) formDataToSend.append('style', formData.style);
      if (formData.year_created) formDataToSend.append('yearCreated', formData.year_created.toString());
      if (formData.width_cm) formDataToSend.append('widthCm', formData.width_cm.toString());
      if (formData.height_cm) formDataToSend.append('heightCm', formData.height_cm.toString());
      if (formData.depth_cm) formDataToSend.append('depthCm', formData.depth_cm.toString());
      if (formData.price_krw) formDataToSend.append('priceKrw', formData.price_krw.toString());
      if (formData.price_usd) formDataToSend.append('priceUsd', formData.price_usd.toString());
      formDataToSend.append('forSale', formData.for_sale ? 'true' : 'false');
      if (formData.edition) formDataToSend.append('edition', formData.edition);
      if (formData.location) formDataToSend.append('location', formData.location);
      if (formData.tags) formDataToSend.append('tags', formData.tags);
      
      // 이미지 처리
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      } else if (formData.image_url && formData.image_url !== artwork.image_url) {
        formDataToSend.append('imageUrl', formData.image_url);
      }

      const response = await fetch(`/api/artwork/${artwork.id}`, {
        method: 'PUT',
        body: formDataToSend
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || '작품 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Update error:', error);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">작품 수정</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">⚠️ {error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 왼쪽 컬럼 */}
            <div className="space-y-4">
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
                  작품 설명
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    카테고리
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">선택</option>
                    <option value="painting">회화</option>
                    <option value="sculpture">조각</option>
                    <option value="photography">사진</option>
                    <option value="digital">디지털 아트</option>
                    <option value="mixed">혼합 매체</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    제작 연도
                  </label>
                  <input
                    type="number"
                    name="year_created"
                    value={formData.year_created || ''}
                    onChange={handleInputChange}
                    min="1900"
                    max={new Date().getFullYear()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  매체/재료
                </label>
                <input
                  type="text"
                  name="medium"
                  value={formData.medium}
                  onChange={handleInputChange}
                  placeholder="예: 캔버스에 유화, 디지털 프린트"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  스타일
                </label>
                <input
                  type="text"
                  name="style"
                  value={formData.style}
                  onChange={handleInputChange}
                  placeholder="예: 추상화, 사실주의, 팝아트"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 오른쪽 컬럼 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  작품 이미지
                </label>
                {imagePreview && (
                  <div className="mb-4">
                    <img
                      src={imagePreview}
                      alt="작품 미리보기"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  또는 이미지 URL 입력:
                </p>
                <input
                  type="url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  크기 (cm)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    name="width_cm"
                    value={formData.width_cm || ''}
                    onChange={handleInputChange}
                    placeholder="가로"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    name="height_cm"
                    value={formData.height_cm || ''}
                    onChange={handleInputChange}
                    placeholder="세로"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    name="depth_cm"
                    value={formData.depth_cm || ''}
                    onChange={handleInputChange}
                    placeholder="깊이"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  가격
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      name="price_krw"
                      value={formData.price_krw || ''}
                      onChange={handleInputChange}
                      placeholder="KRW"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      name="price_usd"
                      value={formData.price_usd || ''}
                      onChange={handleInputChange}
                      placeholder="USD"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="for_sale"
                    checked={formData.for_sale}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">판매 가능</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  에디션
                </label>
                <input
                  type="text"
                  name="edition"
                  value={formData.edition}
                  onChange={handleInputChange}
                  placeholder="예: 1/10, Original"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  위치
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="예: 서울, 작가 스튜디오"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  태그
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="태그를 쉼표로 구분하여 입력"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              disabled={isLoading}
            >
              {isLoading ? '저장 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};