import React, { useState, useEffect } from 'react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  limits: {
    dailyAnalysis: number;
    historyDays: number | null;
  };
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSubscriptionChange: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  user,
  onSubscriptionChange
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  useEffect(() => {
    if (isOpen && user) {
      loadPlansAndSubscription();
    }
  }, [isOpen, user]);

  const loadPlansAndSubscription = async () => {
    try {
      // Load subscription plans
      const plansResponse = await fetch('/api/subscription/plans');
      const plansResult = await plansResponse.json();
      
      if (plansResult.success) {
        setPlans(Object.values(plansResult.plans));
      }

      // Load current subscription
      if (user?.id) {
        const subResponse = await fetch(`/api/subscription/status?userId=${user.id}`);
        const subResult = await subResponse.json();
        
        if (subResult.success && subResult.subscription) {
          setCurrentSubscription(subResult.subscription);
        }
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      setError('구독 정보를 불러오는데 실패했습니다.');
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (!user?.id || planId === 'free') return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          planId: planId
        })
      });

      const result = await response.json();

      if (result.success) {
        // If client secret is provided, handle payment
        if (result.clientSecret) {
          // In a real implementation, you would use Stripe Elements here
          alert('결제 처리를 위해 Stripe Elements 구현이 필요합니다.');
        } else {
          onSubscriptionChange();
          onClose();
        }
      } else {
        setError(result.error || '구독 생성에 실패했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!currentSubscription) return;

    if (!confirm('정말로 구독을 취소하시겠습니까?')) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          subscriptionId: currentSubscription.stripe_subscription_id
        })
      });

      const result = await response.json();

      if (result.success) {
        onSubscriptionChange();
        onClose();
      } else {
        setError(result.error || '구독 취소에 실패했습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          returnUrl: window.location.origin
        })
      });

      const result = await response.json();

      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        setError(result.error || '결제 관리 페이지로 이동할 수 없습니다.');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">구독 관리</h2>
            <button
              onClick={onClose}
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

          {/* Current Subscription Status */}
          {currentSubscription && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">현재 구독</h3>
              <p>요금제: {currentSubscription.tier === 'premium' ? '프리미엄' : '무료'}</p>
              <p>상태: {currentSubscription.status}</p>
              {currentSubscription.current_period_end && (
                <p>만료일: {new Date(currentSubscription.current_period_end).toLocaleDateString()}</p>
              )}
            </div>
          )}

          {/* Subscription Plans */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`border rounded-lg p-6 ${
                  currentSubscription?.tier === plan.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="text-2xl font-bold text-blue-600">
                    {plan.price === 0 ? '무료' : `₩${plan.price.toLocaleString()}`}
                    {plan.price > 0 && <span className="text-sm font-normal">/{plan.interval}</span>}
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="space-y-2">
                  {currentSubscription?.tier === plan.id ? (
                    <div className="text-center">
                      <span className="text-blue-600 font-semibold">현재 요금제</span>
                      {plan.id === 'premium' && (
                        <div className="mt-2 space-y-2">
                          <button
                            onClick={handleManageBilling}
                            disabled={isLoading}
                            className="w-full bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white py-2 px-4 rounded"
                          >
                            결제 관리
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-2 px-4 rounded"
                          >
                            구독 취소
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    plan.id !== 'free' && (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isLoading}
                        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-2 px-4 rounded"
                      >
                        {isLoading ? '처리중...' : '업그레이드'}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Additional Information */}
          <div className="text-sm text-gray-600 space-y-2">
            <p>• 구독은 언제든지 취소할 수 있습니다.</p>
            <p>• 취소 후에도 현재 결제 기간 동안은 프리미엄 기능을 사용할 수 있습니다.</p>
            <p>• 결제 및 구독 관리는 Stripe를 통해 안전하게 처리됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
};