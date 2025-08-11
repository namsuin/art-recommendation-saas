import React from 'react';

interface PricingTier {
  name: string;
  price: number;
}

interface PaymentModalProps {
  show: boolean;
  onClose: () => void;
  onPayment: () => void;
  imageCount: number;
  currentTier: string;
  pricingTiers: Record<string, PricingTier>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  show,
  onClose,
  onPayment,
  imageCount,
  currentTier,
  pricingTiers
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md">
        <h3 className="text-xl font-bold mb-4">결제가 필요합니다</h3>
        <p className="mb-4">
          {imageCount}장 분석을 위해 {pricingTiers[currentTier].name} 플랜
          (${pricingTiers[currentTier].price}) 결제가 필요합니다.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onPayment}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            결제하기
          </button>
        </div>
      </div>
    </div>
  );
};