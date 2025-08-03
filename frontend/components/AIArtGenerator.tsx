import React, { useState, useEffect } from 'react';

interface ArtStyle {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnailUrl: string;
  premiumOnly: boolean;
}

interface GenerationResult {
  id: string;
  generatedImageUrl?: string;
  thumbnailUrl?: string;
  metadata: {
    prompt?: string;
    style: string;
    processingTime: number;
  };
}

interface AIArtGeneratorProps {
  userId: string | null;
  isPremium: boolean;
}

export const AIArtGenerator: React.FC<AIArtGeneratorProps> = ({ userId, isPremium }) => {
  const [activeTab, setActiveTab] = useState<'style-transfer' | 'text-to-image' | 'variations'>('text-to-image');
  const [availableStyles, setAvailableStyles] = useState<ArtStyle[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  
  // Text to Image states
  const [prompt, setPrompt] = useState('');
  const [imageSize, setImageSize] = useState<'256x256' | '512x512' | '1024x1024'>('512x512');
  const [quality, setQuality] = useState<'draft' | 'standard' | 'hd'>('standard');
  
  // Style Transfer states
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string>('');
  const [intensity, setIntensity] = useState(80);
  const [preserveColors, setPreserveColors] = useState(false);
  
  // Image Variations states
  const [variationCount, setVariationCount] = useState(4);
  const [variationStrength, setVariationStrength] = useState(50);
  
  // Results states
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // History state
  const [generationHistory, setGenerationHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchAvailableStyles();
    if (userId) {
      fetchGenerationHistory();
    }
  }, [userId, isPremium]);

  const fetchAvailableStyles = async () => {
    try {
      const response = await fetch(`/api/ai-art/styles?premium=${isPremium}`);
      const result = await response.json();
      if (result.success && result.data) {
        setAvailableStyles(result.data);
        if (result.data.length > 0 && !selectedStyle) {
          setSelectedStyle(result.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch styles:', error);
    }
  };

  const fetchGenerationHistory = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/ai-art/history?userId=${userId}&limit=10`);
      const result = await response.json();
      if (result.success && result.data) {
        setGenerationHistory(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const handleTextToImage = async () => {
    if (!prompt.trim()) {
      setError('프롬프트를 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch('/api/ai-art/text-to-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style: selectedStyle,
          size: imageSize,
          quality,
          userId
        })
      });

      const result = await response.json();
      if (result.success && result.data) {
        setResults([result.data]);
        if (userId) {
          fetchGenerationHistory();
        }
      } else {
        setError(result.error || '이미지 생성에 실패했습니다.');
      }
    } catch (error) {
      setError('이미지 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStyleTransfer = async () => {
    if (!sourceImage) {
      setError('원본 이미지를 업로드해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResults([]);

    try {
      const formData = new FormData();
      formData.append('image', sourceImage);
      formData.append('targetStyle', selectedStyle);
      formData.append('intensity', intensity.toString());
      formData.append('preserveColors', preserveColors.toString());
      if (userId) formData.append('userId', userId);

      const response = await fetch('/api/ai-art/style-transfer', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success && result.data) {
        setResults([result.data]);
        if (userId) {
          fetchGenerationHistory();
        }
      } else {
        setError(result.error || '스타일 전이에 실패했습니다.');
      }
    } catch (error) {
      setError('스타일 전이 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageVariations = async () => {
    if (!sourceImage) {
      setError('원본 이미지를 업로드해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResults([]);

    try {
      const formData = new FormData();
      formData.append('image', sourceImage);
      formData.append('variationCount', variationCount.toString());
      formData.append('variationStrength', variationStrength.toString());
      if (userId) formData.append('userId', userId);

      const response = await fetch('/api/ai-art/image-variations', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success && result.data) {
        setResults(result.data);
        if (userId) {
          fetchGenerationHistory();
        }
      } else {
        setError(result.error || '이미지 변형 생성에 실패했습니다.');
      }
    } catch (error) {
      setError('이미지 변형 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSourceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">AI 아트 생성기</h2>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          {showHistory ? '생성기로 돌아가기' : '생성 히스토리 보기'}
        </button>
      </div>

      {!showHistory ? (
        <>
          {/* Tab Navigation */}
          <div className="border-b mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('text-to-image')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'text-to-image'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                텍스트 → 이미지
              </button>
              <button
                onClick={() => setActiveTab('style-transfer')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'style-transfer'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                스타일 전이
              </button>
              <button
                onClick={() => setActiveTab('variations')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'variations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                이미지 변형
              </button>
            </nav>
          </div>

          {/* Style Selection (공통) */}
          {activeTab !== 'variations' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                아트 스타일 선택
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {availableStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    disabled={style.premiumOnly && !isPremium}
                    className={`relative p-3 rounded-lg border-2 transition-all ${
                      selectedStyle === style.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${
                      style.premiumOnly && !isPremium
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-900">{style.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{style.category}</div>
                    {style.premiumOnly && (
                      <span className="absolute top-1 right-1 text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                        Pro
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Text to Image Tab */}
          {activeTab === 'text-to-image' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  프롬프트
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="생성하고 싶은 이미지를 설명해주세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이미지 크기
                  </label>
                  <select
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="256x256">256x256</option>
                    <option value="512x512">512x512</option>
                    <option value="1024x1024">1024x1024</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    품질
                  </label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">초안</option>
                    <option value="standard">표준</option>
                    <option value="hd">고화질</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleTextToImage}
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {isGenerating ? '생성 중...' : '이미지 생성'}
              </button>
            </div>
          )}

          {/* Style Transfer Tab */}
          {activeTab === 'style-transfer' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  원본 이미지
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {sourceImagePreview && (
                  <img
                    src={sourceImagePreview}
                    alt="Source"
                    className="mt-3 max-w-xs rounded-lg"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  스타일 강도: {intensity}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="preserveColors"
                  checked={preserveColors}
                  onChange={(e) => setPreserveColors(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="preserveColors" className="text-sm text-gray-700">
                  원본 색상 유지
                </label>
              </div>

              <button
                onClick={handleStyleTransfer}
                disabled={isGenerating || !sourceImage}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {isGenerating ? '변환 중...' : '스타일 적용'}
              </button>
            </div>
          )}

          {/* Image Variations Tab */}
          {activeTab === 'variations' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  원본 이미지
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {sourceImagePreview && (
                  <img
                    src={sourceImagePreview}
                    alt="Source"
                    className="mt-3 max-w-xs rounded-lg"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  변형 개수: {variationCount}개
                </label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={variationCount}
                  onChange={(e) => setVariationCount(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  변형 강도: {variationStrength}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={variationStrength}
                  onChange={(e) => setVariationStrength(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <button
                onClick={handleImageVariations}
                disabled={isGenerating || !sourceImage}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {isGenerating ? '생성 중...' : '변형 생성'}
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">⚠️ {error}</p>
            </div>
          )}

          {/* Results Display */}
          {results.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">생성 결과</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((result, index) => (
                  <div key={result.id} className="relative group">
                    <img
                      src={result.generatedImageUrl || result.thumbnailUrl}
                      alt={`Generated ${index + 1}`}
                      className="w-full rounded-lg shadow-md"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                      <button
                        onClick={() => downloadImage(result.generatedImageUrl!, `ai-art-${result.id}.jpg`)}
                        className="opacity-0 group-hover:opacity-100 bg-white text-gray-800 px-4 py-2 rounded-md font-medium"
                      >
                        다운로드
                      </button>
                    </div>
                    {result.metadata.processingTime && (
                      <p className="text-xs text-gray-500 mt-2">
                        처리 시간: {result.metadata.processingTime.toFixed(1)}초
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Generation History */
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">최근 생성 히스토리</h3>
          {generationHistory.length === 0 ? (
            <p className="text-gray-500">아직 생성한 작품이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generationHistory.map((item) => (
                <div key={item.id} className="border rounded-lg p-3">
                  <img
                    src={item.output.thumbnailUrl}
                    alt="Generated"
                    className="w-full rounded-md mb-2"
                  />
                  <p className="text-sm font-medium">{item.type}</p>
                  {item.input.prompt && (
                    <p className="text-xs text-gray-600 mt-1">{item.input.prompt}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};