import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Tag, Palette, Ruler, DollarSign, Save, Eye, FileText } from 'lucide-react';
import { supabase } from '../services/supabase';

interface ArtworkFormData {
  title: string;
  description: string;
  yearCreated: number;
  category: string;
  medium: string;
  style: string;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  priceKrw: number;
  isForSale: boolean;
  keywords: string[];
  tags: string[];
  imageFile: File | null;
}

const CATEGORIES = [
  '회화', '조각', '사진', '디지털아트', '판화', '드로잉', '설치미술', '영상미술', '공예', '기타'
];

const MEDIUMS = [
  '유화', '수채화', '아크릴', '과슈', '파스텔', '연필', '펜', '목탄', '청동', '대리석', '석고', '나무', '금속', '디지털', '혼합매체', '기타'
];

const STYLES = [
  '사실주의', '인상주의', '추상화', '표현주의', '미니멀리즘', '팝아트', '현대미술', '고전주의', '초현실주의', '기타'
];

export default function ArtworkRegistrationForm({ userId }: { userId: string }) {
  const [formData, setFormData] = useState<ArtworkFormData>({
    title: '',
    description: '',
    yearCreated: new Date().getFullYear(),
    category: '',
    medium: '',
    style: '',
    widthCm: 0,
    heightCm: 0,
    depthCm: 0,
    priceKrw: 0,
    isForSale: false,
    keywords: [],
    tags: [],
    imageFile: null
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitType, setSubmitType] = useState<'draft' | 'pending'>('draft');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFormData(prev => ({ ...prev, imageFile: file }));
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('artworks')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('artworks')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (type: 'draft' | 'pending') => {
    setError(null);
    setLoading(true);
    setSubmitType(type);

    try {
      // 필수 필드 검증
      if (type === 'pending') {
        if (!formData.title.trim()) throw new Error('작품 제목을 입력해주세요.');
        if (!formData.imageFile) throw new Error('작품 이미지를 업로드해주세요.');
        if (!formData.category) throw new Error('카테고리를 선택해주세요.');
        if (!formData.medium) throw new Error('재료를 선택해주세요.');
      }

      let imageUrl = '';
      if (formData.imageFile) {
        imageUrl = await uploadImage(formData.imageFile);
      }

      // 작품 데이터 준비
      const artworkData = {
        title: formData.title,
        artist_name: (await supabase.from('users').select('display_name').eq('id', userId).single()).data?.display_name || '알 수 없음',
        artist_id: userId,
        description: formData.description,
        year_created: formData.yearCreated || null,
        image_url: imageUrl,
        category: formData.category,
        medium: formData.medium,
        style: formData.style,
        width_cm: formData.widthCm || null,
        height_cm: formData.heightCm || null,
        depth_cm: formData.depthCm || null,
        price_krw: formData.priceKrw || null,
        is_for_sale: formData.isForSale,
        keywords: formData.keywords,
        tags: formData.tags,
        status: type,
        submitted_at: type === 'pending' ? new Date().toISOString() : null
      };

      // 데이터베이스에 저장
      const { data, error } = await supabase
        .from('registered_artworks')
        .insert(artworkData)
        .select('*')
        .single();

      if (error) throw error;

      setSuccess(true);
      
      // 폼 초기화
      setFormData({
        title: '',
        description: '',
        yearCreated: new Date().getFullYear(),
        category: '',
        medium: '',
        style: '',
        widthCm: 0,
        heightCm: 0,
        depthCm: 0,
        priceKrw: 0,
        isForSale: false,
        keywords: [],
        tags: [],
        imageFile: null
      });
      setImagePreview(null);

    } catch (err) {
      console.error('Artwork registration error:', err);
      setError(err instanceof Error ? err.message : '작품 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            작품이 {submitType === 'draft' ? '저장' : '제출'}되었습니다!
          </h2>
          <p className="text-gray-600 mb-4">
            {submitType === 'draft' 
              ? '임시저장된 작품은 언제든 수정할 수 있습니다.'
              : '관리자 승인 후 갤러리에 표시됩니다.'}
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            새 작품 등록
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">작품 등록</h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 왼쪽: 이미지 업로드 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              <ImageIcon className="inline w-5 h-5 mr-2" />
              작품 이미지
            </h3>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                ${imagePreview ? 'border-solid border-green-500' : ''}`}
            >
              <input {...getInputProps()} />
              
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview(null);
                      setFormData(prev => ({ ...prev, imageFile: null }));
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">
                    {isDragActive
                      ? '이미지를 여기에 놓으세요'
                      : '클릭하거나 이미지를 드래그하세요'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">최대 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 기본 정보 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="inline w-4 h-4 mr-1" />
                작품 제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="작품의 제목을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">작품 설명</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="작품에 대한 설명을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제작년도</label>
              <input
                type="number"
                value={formData.yearCreated}
                onChange={(e) => setFormData(prev => ({ ...prev, yearCreated: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">카테고리 *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선택</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">재료/기법 *</label>
                <select
                  value={formData.medium}
                  onChange={(e) => setFormData(prev => ({ ...prev, medium: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선택</option>
                  {MEDIUMS.map(medium => (
                    <option key={medium} value={medium}>{medium}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">스타일</label>
                <select
                  value={formData.style}
                  onChange={(e) => setFormData(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선택</option>
                  {STYLES.map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 크기 정보 */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">
            <Ruler className="inline w-5 h-5 mr-2" />
            작품 크기 (cm)
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">가로</label>
              <input
                type="number"
                value={formData.widthCm || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, widthCm: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">세로</label>
              <input
                type="number"
                value={formData.heightCm || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, heightCm: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">깊이 (선택)</label>
              <input
                type="number"
                value={formData.depthCm || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, depthCm: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* 가격 정보 */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">
            <DollarSign className="inline w-5 h-5 mr-2" />
            판매 정보
          </h3>
          <div className="flex items-center space-x-4 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isForSale}
                onChange={(e) => setFormData(prev => ({ ...prev, isForSale: e.target.checked }))}
                className="mr-2"
              />
              판매용 작품
            </label>
          </div>
          
          {formData.isForSale && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">가격 (원)</label>
              <input
                type="number"
                value={formData.priceKrw || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, priceKrw: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          )}
        </div>

        {/* 키워드 및 태그 */}
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">
              <Tag className="inline w-5 h-5 mr-2" />
              AI 검색 키워드
            </h3>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="키워드 입력 후 Enter"
              />
              <button
                onClick={addKeyword}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                추가
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center"
                >
                  {keyword}
                  <button
                    onClick={() => removeKeyword(keyword)}
                    className="ml-2 text-blue-500 hover:text-blue-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">
              <Palette className="inline w-5 h-5 mr-2" />
              태그
            </h3>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="태그 입력 후 Enter"
              />
              <button
                onClick={addTag}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                추가
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-purple-500 hover:text-purple-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 제출 버튼 */}
        <div className="mt-6 flex justify-center space-x-4">
          <button
            onClick={() => handleSubmit('draft')}
            disabled={loading}
            className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            <Save className="w-5 h-5 mr-2" />
            {loading && submitType === 'draft' ? '저장 중...' : '임시저장'}
          </button>
          
          <button
            onClick={() => handleSubmit('pending')}
            disabled={loading}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Eye className="w-5 h-5 mr-2" />
            {loading && submitType === 'pending' ? '제출 중...' : '승인 요청'}
          </button>
        </div>
      </div>
    </div>
  );
}