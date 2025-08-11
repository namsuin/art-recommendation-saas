import React, { useState, useCallback } from 'react';
import { AnalysisResults } from '../utils/artworkUtils';
import { ImageUploadZone } from './ImageUploadZone';
import { ImagePreviewGrid } from './ImagePreviewGrid';
import { AnalysisProgress } from './AnalysisProgress';
import { AnalysisResults as AnalysisResultsComponent } from './AnalysisResults';
import { PaymentModal } from './PaymentModal';

interface ImagePreview {
  id: string;
  file: File;
  preview: string;
}

interface MultiImageUploadProps {
  userId: string | null;
  onAnalysisComplete: (results: AnalysisResults) => void;
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
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [currentAnalyzingImage, setCurrentAnalyzingImage] = useState<string | null>(null);

  // 이미지 개수에 따른 티어 계산
  const calculateTier = (imageCount: number): keyof typeof PRICING_TIERS => {
    if (imageCount <= 3) return 'free';
    if (imageCount <= 10) return 'standard';
    return 'premium';
  };

  // 이미지 업로드 처리
  const handleImageUpload = useCallback((acceptedFiles: File[]) => {
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

  // 이미지 제거
  const removeImage = (id: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      const newTier = calculateTier(updated.length);
      setCurrentTier(newTier);
      return updated;
    });
  };

  // 분석 처리
  const handleAnalyze = async () => {
    if (images.length === 0) return;
    
    const tier = calculateTier(images.length);
    setCurrentTier(tier);

    // 게스트 모드 제한 확인
    if (!userId && images.length > 3) {
      setError('게스트는 최대 3장까지만 분석할 수 있습니다. 로그인 후 더 많은 이미지를 분석하세요.');
      return;
    }
    
    // 로그인 사용자 - 유료 티어인 경우 결제 필요 여부 확인
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
    setAnalysisResults(null);
    setAnalysisProgress({ current: 0, total: images.length });
    setCurrentAnalyzingImage(null);

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      const formData = new FormData();
      
      if (userId) {
        formData.append('userId', userId);
      }
      
      images.forEach((image, index) => {
        formData.append(`image${index}`, image.file);
      });

      // 진행 상황 시뮬레이션
      progressInterval = setInterval(() => {
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
      }, 2000);

      const response = await fetch('/api/multi-analyze', {
        method: 'POST',
        body: formData
      });

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
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
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      setAnalysisProgress({ current: 0, total: 0 });
      setCurrentAnalyzingImage(null);
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 결제 처리
  const handlePayment = async () => {
    const tier = PRICING_TIERS[currentTier];
    window.location.href = `/payment?tier=${currentTier}&price=${tier.price}&images=${images.length}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">다중 이미지 분석</h2>
        
        {/* 게스트 모드 안내 */}
        {!userId && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-800">
                  <strong>🎉 게스트 모드:</strong> 로그인 없이도 최대 3장까지 무료로 분석할 수 있습니다!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  💡 4장 이상 분석하려면 로그인 후 결제가 필요합니다. 로그인하면 분석 결과도 저장됩니다.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* 가격 정보 */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">가격 안내</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className={`p-2 rounded ${currentTier === 'free' ? 'bg-blue-100 font-semibold' : ''}`}>
              <div>무료</div>
              <div className="text-gray-600">최대 3장</div>
              {!userId && <div className="text-xs text-green-600 mt-1">게스트 가능</div>}
            </div>
            <div className={`p-2 rounded ${currentTier === 'standard' ? 'bg-blue-100 font-semibold' : ''}`}>
              <div>$5</div>
              <div className="text-gray-600">4-10장</div>
              {!userId && <div className="text-xs text-red-600 mt-1">로그인 필요</div>}
            </div>
            <div className={`p-2 rounded ${currentTier === 'premium' ? 'bg-blue-100 font-semibold' : ''}`}>
              <div>$10</div>
              <div className="text-gray-600">11장 이상</div>
              {!userId && <div className="text-xs text-red-600 mt-1">로그인 필요</div>}
            </div>
          </div>
        </div>

        {/* 이미지 업로드 영역 */}
        {images.length < 50 && (
          <ImageUploadZone
            onDrop={handleImageUpload}
            maxImages={50}
            currentImageCount={images.length}
            disabled={isAnalyzing}
            error={error}
          />
        )}

        {/* 업로드된 이미지 미리보기 */}
        <ImagePreviewGrid
          images={images}
          onRemoveImage={removeImage}
          disabled={isAnalyzing}
        />

        {/* 분석 버튼 및 진행 상황 */}
        <AnalysisProgress
          isAnalyzing={isAnalyzing}
          analysisProgress={analysisProgress}
          currentAnalyzingImage={currentAnalyzingImage}
          imageCount={images.length}
          currentTier={currentTier}
          pricingTiers={PRICING_TIERS}
          onAnalyze={handleAnalyze}
        />
      </div>

      {/* 결제 모달 */}
      <PaymentModal
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPayment={handlePayment}
        imageCount={images.length}
        currentTier={currentTier}
        pricingTiers={PRICING_TIERS}
      />

      {/* 분석 결과 표시 */}
      <AnalysisResultsComponent
        analysisResults={analysisResults}
        onUpgradeClick={() => window.location.href = '/pricing'}
      />
    </div>
  );
}