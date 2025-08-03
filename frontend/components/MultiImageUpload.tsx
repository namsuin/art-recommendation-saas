import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, AlertCircle, Loader2, Check, DollarSign } from 'lucide-react';

interface ImagePreview {
  id: string;
  file: File;
  preview: string;
}

interface MultiImageUploadProps {
  userId: string | null;
  onAnalysisComplete: (results: any) => void;
}

const PRICING_TIERS = {
  free: { maxImages: 3, price: 0, name: '무료' },
  standard: { maxImages: 10, price: 5, name: '스탠다드' },
  premium: { maxImages: 50, price: 10, name: '프리미엄' }
};

export default function MultiImageUpload({ userId, onAnalysisComplete }: MultiImageUploadProps) {
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<keyof typeof PRICING_TIERS>('free');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [currentAnalyzingImage, setCurrentAnalyzingImage] = useState<string | null>(null);

  // 이미지 개수에 따른 티어 계산
  const calculateTier = (imageCount: number): keyof typeof PRICING_TIERS => {
    if (imageCount <= 3) return 'free';
    if (imageCount <= 10) return 'standard';
    return 'premium';
  };

  // 드롭존 설정
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file)
    }));

    setImages(prev => {
      const updated = [...prev, ...newImages];
      const newTier = calculateTier(updated.length);
      setCurrentTier(newTier);
      return updated;
    });
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  // 이미지 제거
  const removeImage = (id: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      const newTier = calculateTier(updated.length);
      setCurrentTier(newTier);
      return updated;
    });
  };

  // 분석 시작
  const handleAnalyze = async () => {
    if (!userId) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (images.length === 0) {
      setError('분석할 이미지를 업로드해주세요.');
      return;
    }

    const tier = calculateTier(images.length);
    
    // 유료 티어인 경우 결제 필요 여부 확인
    if (PRICING_TIERS[tier].price > 0) {
      setShowPaymentModal(true);
      return;
    }

    // 무료 티어는 바로 분석 진행
    await performAnalysis();
  };

  // 실제 분석 수행
  const performAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress({ current: 0, total: images.length });

    try {
      const formData = new FormData();
      formData.append('userId', userId!);
      
      images.forEach((image, index) => {
        formData.append(`image${index}`, image.file);
      });

      // 진행 상황 시뮬레이션 (실제로는 WebSocket으로 받을 수 있음)
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev.current < prev.total) {
            const newCurrent = prev.current + 1;
            const currentImage = images[newCurrent - 1];
            if (currentImage) {
              setCurrentAnalyzingImage(currentImage.file.name);
            }
            return { current: newCurrent, total: prev.total };
          }
          return prev;
        });
      }, 2000); // 2초마다 진행 상황 업데이트

      const response = await fetch('/api/multi-image/analyze', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setAnalysisProgress({ current: images.length, total: images.length });
      setCurrentAnalyzingImage(null);

      const result = await response.json();

      if (!response.ok) {
        if (result.paymentRequired) {
          setShowPaymentModal(true);
          return;
        }
        throw new Error(result.error || '분석에 실패했습니다.');
      }

      setAnalysisResults(result);
      onAnalysisComplete(result);

    } catch (err) {
      clearInterval(progressInterval);
      setAnalysisProgress({ current: 0, total: 0 });
      setCurrentAnalyzingImage(null);
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 결제 처리
  const handlePayment = async () => {
    // Stripe 결제 페이지로 리다이렉트
    const tier = PRICING_TIERS[currentTier];
    window.location.href = `/payment?tier=${currentTier}&price=${tier.price}&images=${images.length}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">다중 이미지 분석</h2>
        
        {/* 가격 정보 */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">가격 안내</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className={`p-2 rounded ${currentTier === 'free' ? 'bg-blue-100 font-semibold' : ''}`}>
              <div>무료</div>
              <div className="text-gray-600">최대 3장</div>
            </div>
            <div className={`p-2 rounded ${currentTier === 'standard' ? 'bg-blue-100 font-semibold' : ''}`}>
              <div>$5</div>
              <div className="text-gray-600">4-10장</div>
            </div>
            <div className={`p-2 rounded ${currentTier === 'premium' ? 'bg-blue-100 font-semibold' : ''}`}>
              <div>$10</div>
              <div className="text-gray-600">11장 이상</div>
            </div>
          </div>
        </div>

        {/* 드롭존 */}
        {images.length < 50 && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">
              {isDragActive
                ? '여기에 이미지를 놓으세요'
                : '클릭하거나 이미지를 드래그하여 업로드'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              최대 50장, 각 10MB 이하
            </p>
          </div>
        )}

        {/* 업로드된 이미지 미리보기 */}
        {images.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">
                업로드된 이미지 ({images.length}장)
                {PRICING_TIERS[currentTier].price > 0 && (
                  <span className="ml-2 text-blue-600">
                    ${PRICING_TIERS[currentTier].price}
                  </span>
                )}
              </h3>
              {images.length > 3 && (
                <span className="text-sm text-gray-600">
                  공통 키워드 분석 가능
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative group">
                  <img
                    src={image.preview}
                    alt={image.file.name}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* 분석 버튼 및 진행 상황 */}
        <div className="mt-6 flex flex-col items-center space-y-4">
          {/* 진행 상황 표시 */}
          {isAnalyzing && (
            <div className="w-full max-w-md">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  분석 진행 상황: {analysisProgress.current}/{analysisProgress.total}
                </span>
                <span className="text-sm text-gray-600">
                  {Math.round((analysisProgress.current / analysisProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(analysisProgress.current / analysisProgress.total) * 100}%` }}
                ></div>
              </div>
              {currentAnalyzingImage && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  현재 분석 중: {currentAnalyzingImage}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={images.length === 0 || isAnalyzing}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center
              ${images.length === 0 || isAnalyzing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                분석 중... ({analysisProgress.current}/{analysisProgress.total})
              </>
            ) : (
              <>
                {PRICING_TIERS[currentTier].price > 0 && (
                  <DollarSign className="w-5 h-5 mr-1" />
                )}
                {images.length}장 분석하기
                {PRICING_TIERS[currentTier].price > 0 && (
                  <span className="ml-1">(${PRICING_TIERS[currentTier].price})</span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* 결제 모달 */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md">
            <h3 className="text-xl font-bold mb-4">결제가 필요합니다</h3>
            <p className="mb-4">
              {images.length}장 분석을 위해 {PRICING_TIERS[currentTier].name} 플랜
              (${PRICING_TIERS[currentTier].price}) 결제가 필요합니다.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handlePayment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                결제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 분석 결과 표시 */}
      {analysisResults && (
        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-xl font-bold mb-4">다중 이미지 분석 결과</h3>
          
          {/* 공통 키워드 분석 (개별 이미지 키워드는 표시하지 않음) */}
          {analysisResults.commonKeywords ? (
            <div className="mb-6">
              <h4 className="font-semibold mb-2">공통 키워드 분석</h4>
              {analysisResults.commonKeywords.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {analysisResults.commonKeywords.keywords.map((keyword: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-3">공통 키워드를 찾을 수 없습니다.</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">키워드 신뢰도: </span>
                  <span className="font-semibold text-blue-600">
                    {analysisResults.commonKeywords.totalSimilarityScore || 
                     Math.round((analysisResults.commonKeywords.confidence || 0) * 100)}%
                  </span>
                </div>
                {analysisResults.similarityAnalysis && (
                  <div>
                    <span className="text-gray-600">평균 유사도: </span>
                    <span className="font-semibold text-green-600">
                      {analysisResults.similarityAnalysis.averageSimilarity}%
                    </span>
                  </div>
                )}
              </div>
              
              {/* 상위 매칭 작품 */}
              {analysisResults.similarityAnalysis?.topMatches?.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">상위 매칭 작품</h5>
                  <div className="space-y-1">
                    {analysisResults.similarityAnalysis.topMatches.map((match: any, index: number) => (
                      <div key={index} className="text-xs text-gray-600">
                        <span className="font-medium">{match.title}</span>
                        <span className="ml-2 text-green-600">{match.similarity}%</span>
                        {match.matchedKeywords?.length > 0 && (
                          <span className="ml-2">({match.matchedKeywords.slice(0, 2).join(', ')})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                업로드된 이미지들 간의 공통 키워드를 찾을 수 없습니다. 
                더 유사한 이미지들을 업로드해보세요.
              </p>
            </div>
          )}

          {/* 추천 작품 */}
          {analysisResults.recommendations && (
            <div>
              <h4 className="font-semibold mb-4">추천 작품</h4>
              
              {/* 갤러리 추천 (외부 플랫폼만, 학생 작품 제외) */}
              {analysisResults.recommendations.external?.length > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-sm font-medium text-gray-600">갤러리 추천 (외부 플랫폼)</h5>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      무료 10개 / 추가는 유료
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {analysisResults.recommendations.external.slice(0, 10)
                      .filter((artwork: any) => {
                        // 텀블벅, 그라폴리오, 대학 졸업작품 필터링
                        const isTumblbug = artwork.platform === 'tumblbug' || 
                                          artwork.source === '텀블벅' || 
                                          artwork.search_source === '텀블벅' ||
                                          (artwork.source_url && artwork.source_url.includes('tumblbug.com')) ||
                                          artwork.project_type === '크라우드펀딩';
                        
                        const isGrafolio = artwork.platform === 'grafolio' || 
                                         artwork.source === '그라폴리오' || 
                                         artwork.search_source === '그라폴리오' ||
                                         (artwork.source_url && artwork.source_url.includes('grafolio.naver.com'));
                        
                        const isKoreanUniversity = artwork.platform === 'university' ||
                                                 artwork.source === '대학 졸업전시' ||
                                                 artwork.category === 'student_work' ||
                                                 artwork.search_source === 'graduation' ||
                                                 (artwork.university && (
                                                   artwork.university.includes('대학') ||
                                                   artwork.university.includes('대학교') ||
                                                   artwork.university.includes('University')
                                                 )) ||
                                                 (artwork.source_url && (
                                                   artwork.source_url.includes('.ac.kr') ||
                                                   artwork.source_url.includes('univ.') ||
                                                   artwork.source_url.includes('university') ||
                                                   artwork.source_url.includes('college') ||
                                                   artwork.source_url.includes('graduation')
                                                 )) ||
                                                 (artwork.source && (
                                                   artwork.source.includes('졸업전시') ||
                                                   artwork.source.includes('졸업작품') ||
                                                   artwork.source.includes('대학') ||
                                                   artwork.source.includes('University') ||
                                                   artwork.source.includes('College')
                                                 )) ||
                                                 (artwork.title && (
                                                   artwork.title.includes('졸업작품') ||
                                                   artwork.title.includes('졸업전시')
                                                 ));
                        
                        const isStudentWork = artwork.student_work === true ||
                                            artwork.platform === 'academy_art_university' ||
                                            artwork.platform === 'sva_bfa' ||
                                            artwork.platform === 'artsonia';
                        
                        return !isTumblbug && !isGrafolio && !isKoreanUniversity && !isStudentWork;
                      })
                      .map((artwork: any) => {
                      const imageUrl = artwork.image_url || artwork.thumbnail_url || artwork.primaryImage || 'https://via.placeholder.com/300x300/f0f0f0/666666?text=No+Image';
                      const sourceUrl = artwork.source_url || artwork.objectURL || artwork.eventSite;
                      
                      return (
                        <div key={artwork.id || artwork.title} className="relative group cursor-pointer">
                          <div className="relative overflow-hidden rounded-lg">
                            <img
                              src={imageUrl}
                              alt={artwork.title || '작품'}
                              className="w-full h-32 object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.dataset.retried) {
                                  target.dataset.retried = 'true';
                                  target.src = artwork.thumbnail_url || artwork.primaryImageSmall || 'https://via.placeholder.com/300x300/e5e7eb/6b7280?text=Image+Unavailable';
                                } else {
                                  target.src = 'https://via.placeholder.com/300x300/e5e7eb/6b7280?text=Image+Error';
                                }
                              }}
                              onLoad={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.opacity = '1';
                              }}
                              style={{ opacity: '0', transition: 'opacity 0.3s ease' }}
                            />
                            {/* 로딩 상태 */}
                            <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" style={{ zIndex: -1 }}></div>
                          </div>
                          
                          {/* 유사도 점수 표시 */}
                          {(artwork.similarity_score || artwork.similarity_score === 0) && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
                              {typeof artwork.similarity_score === 'object' 
                                ? Math.round(artwork.similarity_score.total * 100)
                                : Math.round(artwork.similarity_score * 100)}%
                            </div>
                          )}
                          
                          {/* 링크 아이콘 */}
                          {sourceUrl && (
                            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </div>
                          )}
                          
                          {/* 호버 정보 */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity rounded-lg flex items-end">
                            <div className="p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity w-full">
                              <p className="text-sm font-semibold line-clamp-1" title={artwork.title}>
                                {artwork.title || '제목 없음'}
                              </p>
                              <p className="text-xs line-clamp-1" title={artwork.artist}>
                                {artwork.artist || '작가 미상'}
                              </p>
                              {artwork.similarity_score?.matchedKeywords && (
                                <p className="text-xs text-green-200 line-clamp-1">
                                  매칭: {artwork.similarity_score.matchedKeywords.slice(0, 2).join(', ')}
                                </p>
                              )}
                              {/* 링크 버튼 */}
                              {sourceUrl && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="mt-1 bg-white bg-opacity-20 hover:bg-opacity-30 text-white py-1 px-2 rounded text-xs transition-all"
                                >
                                  원본 보기
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 학생 작품 섹션 (별도 분리) */}
              {analysisResults.recommendations.external?.filter((artwork: any) => {
                return artwork.student_work === true ||
                       artwork.platform === 'academy_art_university' ||
                       artwork.platform === 'sva_bfa' ||
                       artwork.platform === 'artsonia' ||
                       artwork.category === 'professional_student_work';
              }).length > 0 && (
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-sm font-medium text-gray-600">학생 작품 추천</h5>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      🎓 교육적 목적
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {analysisResults.recommendations.external
                      .filter((artwork: any) => {
                        return artwork.student_work === true ||
                               artwork.platform === 'academy_art_university' ||
                               artwork.platform === 'sva_bfa' ||
                               artwork.platform === 'artsonia' ||
                               artwork.category === 'professional_student_work';
                      })
                      .slice(0, 6)
                      .map((artwork: any) => {
                      const imageUrl = artwork.image_url || artwork.thumbnail_url || artwork.primaryImage || 'https://via.placeholder.com/300x300/f0f0f0/666666?text=No+Image';
                      const sourceUrl = artwork.source_url || artwork.objectURL || artwork.eventSite || '#';
                      
                      return (
                        <div
                          key={artwork.id || artwork.title}
                          className="relative group cursor-pointer border-2 border-green-100"
                          onClick={() => {
                            if (sourceUrl !== '#') {
                              window.open(sourceUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                        >
                          <div className="relative overflow-hidden rounded-lg">
                            <img
                              src={imageUrl}
                              alt={artwork.title || '학생 작품'}
                              className="w-full h-32 object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.dataset.retried) {
                                  target.dataset.retried = 'true';
                                  target.src = artwork.thumbnail_url || artwork.primaryImageSmall || 'https://via.placeholder.com/300x300/e5e7eb/6b7280?text=Student+Work';
                                } else {
                                  target.src = 'https://via.placeholder.com/300x300/e5e7eb/6b7280?text=Student+Art';
                                }
                              }}
                              onLoad={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.opacity = '1';
                              }}
                              style={{ opacity: '0', transition: 'opacity 0.3s ease' }}
                            />
                            {/* 로딩 상태 */}
                            <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" style={{ zIndex: -1 }}></div>
                          </div>
                          
                          {/* 학생 작품 배지 */}
                          <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
                            🎓 학생
                          </div>
                          
                          {/* 외부 링크 아이콘 */}
                          {sourceUrl !== '#' && (
                            <div className="absolute top-2 right-2 bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </div>
                          )}
                          
                          {/* 호버 정보 */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity rounded-lg flex items-end">
                            <div className="p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity w-full">
                              <p className="text-sm font-semibold line-clamp-1" title={artwork.title}>
                                {artwork.title || '학생 작품'}
                              </p>
                              <p className="text-xs line-clamp-1" title={artwork.artist}>
                                {artwork.artist || '학생'}
                              </p>
                              <p className="text-xs text-green-200" title={artwork.school || artwork.university}>
                                {artwork.school || artwork.university || artwork.source || 'Student Work'}
                              </p>
                              {artwork.academic_level && (
                                <p className="text-xs text-green-200">
                                  {artwork.academic_level}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    💡 학생 작품은 교육적 목적으로 표시되며, 작가의 성장과 발전을 지원합니다.
                  </div>
                </div>
              )}

              {/* 더 보기 버튼 (유료 결제 안내) */}
              {analysisResults.recommendations.external?.filter((artwork: any) => {
                const isTumblbug = artwork.platform === 'tumblbug' || 
                                  artwork.source === '텀블벅' || 
                                  artwork.search_source === '텀블벅';
                const isGrafolio = artwork.platform === 'grafolio' || 
                                 artwork.source === '그라폴리오' || 
                                 artwork.search_source === '그라폴리오';
                const isKoreanUniversity = artwork.platform === 'university' ||
                                         artwork.source === '대학 졸업전시' ||
                                         artwork.category === 'student_work' ||
                                         artwork.search_source === 'graduation' ||
                                         (artwork.university && (
                                           artwork.university.includes('대학') ||
                                           artwork.university.includes('대학교') ||
                                           artwork.university.includes('University')
                                         )) ||
                                         (artwork.source_url && (
                                           artwork.source_url.includes('.ac.kr') ||
                                           artwork.source_url.includes('univ.') ||
                                           artwork.source_url.includes('university') ||
                                           artwork.source_url.includes('college') ||
                                           artwork.source_url.includes('graduation')
                                         )) ||
                                         (artwork.source && (
                                           artwork.source.includes('졸업전시') ||
                                           artwork.source.includes('졸업작품') ||
                                           artwork.source.includes('대학') ||
                                           artwork.source.includes('University') ||
                                           artwork.source.includes('College')
                                         )) ||
                                         (artwork.title && (
                                           artwork.title.includes('졸업작품') ||
                                           artwork.title.includes('졸업전시')
                                         ));
                const isStudentWork = artwork.student_work === true ||
                                    artwork.platform === 'academy_art_university' ||
                                    artwork.platform === 'sva_bfa' ||
                                    artwork.platform === 'artsonia';
                return !isTumblbug && !isGrafolio && !isKoreanUniversity && !isStudentWork;
              }).length > 10 && (
                <div className="mt-6 text-center">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h6 className="font-semibold text-blue-800 mb-2">더 많은 추천 작품 보기</h6>
                    <p className="text-sm text-blue-600 mb-3">
                      추가 {analysisResults.recommendations.external.length - 10}개의 작품을 확인하려면 프리미엄 플랜이 필요합니다.
                    </p>
                    <button
                      onClick={() => {
                        // 결제 페이지로 이동 또는 모달 열기
                        window.location.href = '/pricing';
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      프리미엄으로 업그레이드 💎
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-gray-500 mt-4">
            처리 시간: {(analysisResults.processingTime / 1000).toFixed(1)}초
          </p>
        </div>
      )}
    </div>
  );
}