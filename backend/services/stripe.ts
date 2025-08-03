import Stripe from 'stripe';
import { supabase } from './supabase';
import { EmailService } from './email';

// Stripe 초기화
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
}) : null;

// 가격 정보 정의
export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: '무료',
    price: 0,
    currency: 'krw',
    interval: 'month',
    features: [
      '일일 10회 이미지 분석',
      '기본 추천 엔진',
      '히스토리 저장 (30일)',
    ],
    limits: {
      dailyAnalysis: 10,
      historyDays: 30,
    }
  },
  premium: {
    id: 'premium',
    name: '프리미엄',
    price: 9900, // 9,900원
    currency: 'krw',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium',
    features: [
      '일일 100회 이미지 분석',
      '고급 AI 앙상블',
      '무제한 히스토리',
      '우선 지원',
      '새로운 기능 우선 체험',
    ],
    limits: {
      dailyAnalysis: 100,
      historyDays: null, // 무제한
    }
  }
} as const;

export class StripeService {
  
  // Stripe 연결 확인
  static isConfigured(): boolean {
    return !!stripe && !!process.env.STRIPE_PUBLISHABLE_KEY;
  }

  // 고객 생성 또는 조회
  static async getOrCreateCustomer(userId: string, email: string, name?: string): Promise<Stripe.Customer | null> {
    if (!stripe) {
      console.warn('Stripe not configured');
      return null;
    }

    try {
      // 기존 고객 조회
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      // 새 고객 생성
      const customer = await stripe.customers.create({
        email,
        name: name || email.split('@')[0],
        metadata: {
          userId: userId,
        },
      });

      return customer;
    } catch (error) {
      console.error('Failed to get or create Stripe customer:', error);
      return null;
    }
  }

  // 구독 생성
  static async createSubscription(
    userId: string, 
    email: string, 
    planId: keyof typeof SUBSCRIPTION_PLANS,
    paymentMethodId?: string
  ) {
    if (!stripe || planId === 'free') {
      return { success: false, error: 'Invalid plan or Stripe not configured' };
    }

    try {
      const customer = await this.getOrCreateCustomer(userId, email);
      if (!customer) {
        return { success: false, error: 'Failed to create customer' };
      }

      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan.stripePriceId) {
        return { success: false, error: 'Invalid price ID' };
      }

      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customer.id,
        items: [{ price: plan.stripePriceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: userId,
          planId: planId,
        },
      };

      // 결제 수단이 제공된 경우
      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId;
      }

      const subscription = await stripe.subscriptions.create(subscriptionData);

      // 데이터베이스에 구독 정보 저장
      if (supabase) {
        const { error: dbError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            status: subscription.status as any,
            tier: planId,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });

        if (dbError) {
          console.error('Failed to save subscription to database:', dbError);
        }

        // 사용자 tier 업데이트
        await supabase
          .from('users')
          .update({ subscription_tier: planId })
          .eq('id', userId);
      }

      return {
        success: true,
        subscription,
        clientSecret: (subscription.latest_invoice as Stripe.Invoice)?.payment_intent 
          ? (subscription.latest_invoice.payment_intent as Stripe.PaymentIntent).client_secret
          : null,
      };

    } catch (error) {
      console.error('Failed to create subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Subscription creation failed' 
      };
    }
  }

  // 구독 취소
  static async cancelSubscription(userId: string, subscriptionId: string) {
    if (!stripe) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);

      // 데이터베이스 업데이트
      if (supabase) {
        const { error: dbError } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('stripe_subscription_id', subscriptionId);

        if (dbError) {
          console.error('Failed to update subscription in database:', dbError);
        }

        // 사용자 tier를 free로 변경
        await supabase
          .from('users')
          .update({ subscription_tier: 'free' })
          .eq('id', userId);
      }

      return { success: true, subscription };
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Subscription cancellation failed' 
      };
    }
  }

  // 구독 재개
  static async resumeSubscription(userId: string, subscriptionId: string) {
    if (!stripe) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      // 데이터베이스 업데이트
      if (supabase) {
        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status as any,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('stripe_subscription_id', subscriptionId);
      }

      return { success: true, subscription };
    } catch (error) {
      console.error('Failed to resume subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Subscription resume failed' 
      };
    }
  }

  // 사용자 구독 정보 조회
  static async getUserSubscription(userId: string) {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return { success: true, subscription };
    } catch (error) {
      console.error('Failed to get user subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get subscription' 
      };
    }
  }

  // Webhook 처리
  static async handleWebhook(payload: string, signature: string) {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      return { success: false, error: 'Stripe or webhook secret not configured' };
    }

    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.created':
          await this.handleSubscriptionChange(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Webhook processing failed' 
      };
    }
  }

  private static async handleSubscriptionChange(subscription: Stripe.Subscription) {
    if (!supabase) return;

    const userId = subscription.metadata.userId;
    const planId = subscription.metadata.planId;

    if (!userId) return;

    try {
      // 구독 정보 업데이트
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_subscription_id: subscription.id,
          status: subscription.status as any,
          tier: planId as any,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });

      // 사용자 tier 업데이트
      await supabase
        .from('users')
        .update({ 
          subscription_tier: planId as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      // 구독 시작 이메일 전송
      if (subscription.status === 'active') {
        const { data: user } = await supabase
          .from('users')
          .select('email, display_name')
          .eq('id', userId)
          .single();

        if (user) {
          const planName = planId === 'premium' ? '프리미엄' : planId;
          await EmailService.sendSubscriptionStartEmail(
            user.email, 
            planName, 
            user.display_name
          );
        }
      }

    } catch (error) {
      console.error('Failed to handle subscription change:', error);
    }
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    if (!supabase) return;

    const userId = subscription.metadata.userId;
    if (!userId) return;

    try {
      // 구독 상태를 cancelled로 변경
      await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('stripe_subscription_id', subscription.id);

      // 사용자를 free tier로 변경
      await supabase
        .from('users')
        .update({ 
          subscription_tier: 'free',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      // 구독 취소 이메일 전송
      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (user) {
        const endDate = new Date(subscription.current_period_end * 1000).toLocaleDateString();
        await EmailService.sendSubscriptionCancelEmail(
          user.email, 
          '프리미엄', 
          endDate,
          user.display_name
        );
      }

    } catch (error) {
      console.error('Failed to handle subscription deletion:', error);
    }
  }

  private static async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    // 결제 성공 처리 (이메일 알림 등)
    console.log('Payment succeeded for invoice:', invoice.id);
  }

  private static async handlePaymentFailed(invoice: Stripe.Invoice) {
    // 결제 실패 처리 (이메일 알림 등)
    console.log('Payment failed for invoice:', invoice.id);
    
    if (invoice.customer && typeof invoice.customer === 'string') {
      try {
        const customer = await stripe?.customers.retrieve(invoice.customer) as Stripe.Customer;
        if (customer && !customer.deleted && customer.email) {
          await EmailService.sendPaymentFailedEmail(customer.email);
        }
      } catch (error) {
        console.error('Failed to send payment failed email:', error);
      }
    }
  }

  // 결제 정보 업데이트용 포털 세션 생성
  static async createPortalSession(userId: string, returnUrl: string) {
    if (!stripe || !supabase) {
      return { success: false, error: 'Stripe or database not configured' };
    }

    try {
      // 사용자 정보 조회
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const customer = await this.getOrCreateCustomer(userId, user.email);
      if (!customer) {
        return { success: false, error: 'Failed to get customer' };
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: returnUrl,
      });

      return { success: true, url: session.url };
    } catch (error) {
      console.error('Failed to create portal session:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Portal session creation failed' 
      };
    }
  }
}