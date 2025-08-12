import { supabase } from '../services/supabase';
import { EmailService } from '../services/email';
import { StripeService } from '../services/stripe';

export class PurchaseAPI {
  
  // 구매 요청 생성
  static async createPurchaseRequest(
    artworkId: string,
    userId: string,
    contactInfo: {
      name: string;
      phone: string;
      email?: string;
      address?: string;
      message?: string;
    },
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ) {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      // 작품 정보 확인
      const { data: artwork, error: artworkError } = await supabase
        .from('artworks')
        .select('*')
        .eq('id', artworkId)
        .single();

      if (artworkError) {
        return { success: false, error: '작품을 찾을 수 없습니다.' };
      }

      if (!artwork.available) {
        return { success: false, error: '현재 구매할 수 없는 작품입니다.' };
      }

      // 사용자 정보 확인
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (userError) {
        return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
      }

      // 구매 요청 생성
      const { data: purchaseRequest, error: insertError } = await supabase
        .from('purchase_requests')
        .insert({
          artwork_id: artworkId,
          user_id: userId,
          contact_name: contactInfo.name,
          contact_phone: contactInfo.phone,
          contact_email: contactInfo.email || user.email,
          delivery_address: contactInfo.address,
          message: contactInfo.message,
          urgency: urgency,
          status: 'pending',
          estimated_price: artwork.price || null,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // 구매 요청 확인 이메일 발송
      await this.sendPurchaseRequestEmail(
        contactInfo.email || user.email,
        artwork,
        purchaseRequest,
        contactInfo.name || user.display_name
      );

      // 관리자에게 알림 이메일 발송
      await this.sendAdminNotificationEmail(artwork, purchaseRequest, contactInfo);

      return {
        success: true,
        purchaseRequest,
        message: '구매 요청이 성공적으로 접수되었습니다.'
      };

    } catch (error) {
      logger.error('Failed to create purchase request:', error);
      return {
        success: false,
        error: '구매 요청 생성 중 오류가 발생했습니다.'
      };
    }
  }

  // 사용자의 구매 요청 목록 조회
  static async getUserPurchaseRequests(userId: string) {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const { data: requests, error } = await supabase
        .from('purchase_requests')
        .select(`
          *,
          artworks (
            id,
            title,
            artist,
            image_url,
            thumbnail_url,
            price
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        success: true,
        requests: requests || []
      };

    } catch (error) {
      logger.error('Failed to get user purchase requests:', error);
      return {
        success: false,
        error: '구매 요청 목록 조회에 실패했습니다.'
      };
    }
  }

  // 모든 구매 요청 조회 (관리자용)
  static async getAllPurchaseRequests(page = 1, limit = 20, status?: string) {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('purchase_requests')
        .select(`
          *,
          artworks (
            id,
            title,
            artist,
            image_url,
            thumbnail_url,
            price
          ),
          users (
            email,
            display_name
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: requests, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        success: true,
        requests: requests || [],
        totalCount: count || 0,
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit)
      };

    } catch (error) {
      logger.error('Failed to get all purchase requests:', error);
      return {
        success: false,
        error: '구매 요청 목록 조회에 실패했습니다.'
      };
    }
  }

  // 구매 요청 상태 업데이트
  static async updatePurchaseRequestStatus(
    requestId: string,
    status: 'pending' | 'processing' | 'contacted' | 'completed' | 'cancelled',
    adminUserId: string,
    adminNote?: string,
    finalPrice?: number
  ) {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const updates: any = {
        status,
        admin_note: adminNote,
        updated_at: new Date().toISOString()
      };

      if (finalPrice !== undefined) {
        updates.final_price = finalPrice;
      }

      if (status === 'processing') {
        updates.processed_at = new Date().toISOString();
        updates.processed_by = adminUserId;
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { data: updatedRequest, error } = await supabase
        .from('purchase_requests')
        .update(updates)
        .eq('id', requestId)
        .select(`
          *,
          artworks (
            id,
            title,
            artist,
            image_url,
            price
          ),
          users (
            email,
            display_name
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      // 상태 변경 알림 이메일 발송
      if (updatedRequest.users && updatedRequest.artworks) {
        await this.sendStatusUpdateEmail(
          updatedRequest.contact_email,
          updatedRequest,
          updatedRequest.artworks,
          status
        );
      }

      return {
        success: true,
        purchaseRequest: updatedRequest,
        message: '구매 요청 상태가 업데이트되었습니다.'
      };

    } catch (error) {
      logger.error('Failed to update purchase request status:', error);
      return {
        success: false,
        error: '구매 요청 상태 업데이트에 실패했습니다.'
      };
    }
  }

  // 구매 요청 취소
  static async cancelPurchaseRequest(requestId: string, userId: string, reason?: string) {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const { data: request, error: selectError } = await supabase
        .from('purchase_requests')
        .select('*, artworks(title, artist)')
        .eq('id', requestId)
        .eq('user_id', userId)
        .single();

      if (selectError) {
        return { success: false, error: '구매 요청을 찾을 수 없습니다.' };
      }

      if (request.status === 'completed') {
        return { success: false, error: '이미 완료된 구매 요청은 취소할 수 없습니다.' };
      }

      const { error: updateError } = await supabase
        .from('purchase_requests')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      return {
        success: true,
        message: '구매 요청이 취소되었습니다.'
      };

    } catch (error) {
      logger.error('Failed to cancel purchase request:', error);
      return {
        success: false,
        error: '구매 요청 취소에 실패했습니다.'
      };
    }
  }

  // 구매 요청 확인 이메일 발송
  private static async sendPurchaseRequestEmail(
    email: string,
    artwork: any,
    purchaseRequest: any,
    customerName: string
  ) {
    const subject = `🎨 작품 구매 요청이 접수되었습니다 - ${artwork.title}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎨 구매 요청 접수</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #374151;">안녕하세요, ${customerName}님!</h2>
          
          <p style="color: #6b7280; line-height: 1.6;">
            작품 구매 요청이 성공적으로 접수되었습니다.
          </p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">📋 구매 요청 정보</h3>
            <p><strong>요청 번호:</strong> ${purchaseRequest.id}</p>
            <p><strong>작품명:</strong> ${artwork.title}</p>
            <p><strong>작가:</strong> ${artwork.artist}</p>
            <p><strong>예상 가격:</strong> ${artwork.price ? `₩${artwork.price.toLocaleString()}` : '문의 필요'}</p>
            <p><strong>요청일:</strong> ${new Date(purchaseRequest.created_at).toLocaleDateString()}</p>
          </div>
          
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">📞 다음 단계</h3>
            <ul style="color: #374151; line-height: 1.6;">
              <li>담당자가 24시간 내에 연락드릴 예정입니다</li>
              <li>작품 상태 및 정확한 가격을 안내해드립니다</li>
              <li>배송 방법 및 결제 방식을 협의합니다</li>
            </ul>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px;">
            문의사항이 있으시면 언제든 연락해 주세요.<br>
            감사합니다!
          </p>
        </div>
      </div>
    `;

    await EmailService.sendEmail(email, subject, htmlContent);
  }

  // 관리자 알림 이메일 발송
  private static async sendAdminNotificationEmail(
    artwork: any,
    purchaseRequest: any,
    contactInfo: any
  ) {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    if (adminEmails.length === 0) return;

    const subject = `🔔 새로운 작품 구매 요청 - ${artwork.title}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f59e0b; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🔔 신규 구매 요청</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #374151;">새로운 작품 구매 요청이 접수되었습니다</h2>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">🎨 작품 정보</h3>
            <p><strong>작품명:</strong> ${artwork.title}</p>
            <p><strong>작가:</strong> ${artwork.artist}</p>
            <p><strong>가격:</strong> ${artwork.price ? `₩${artwork.price.toLocaleString()}` : '미설정'}</p>
          </div>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">👤 고객 정보</h3>
            <p><strong>이름:</strong> ${contactInfo.name}</p>
            <p><strong>연락처:</strong> ${contactInfo.phone}</p>
            <p><strong>이메일:</strong> ${contactInfo.email}</p>
            ${contactInfo.address ? `<p><strong>주소:</strong> ${contactInfo.address}</p>` : ''}
            ${contactInfo.message ? `<p><strong>메시지:</strong> ${contactInfo.message}</p>` : ''}
            <p><strong>긴급도:</strong> ${purchaseRequest.urgency}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/admin" 
               style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              관리자 대시보드에서 처리하기
            </a>
          </div>
        </div>
      </div>
    `;

    for (const adminEmail of adminEmails) {
      await EmailService.sendEmail(adminEmail.trim(), subject, htmlContent);
    }
  }

  // 상태 업데이트 이메일 발송
  private static async sendStatusUpdateEmail(
    email: string,
    purchaseRequest: any,
    artwork: any,
    status: string
  ) {
    const statusMessages = {
      processing: '처리 중',
      contacted: '연락 완료',
      completed: '완료됨',
      cancelled: '취소됨'
    };

    const subject = `📋 구매 요청 상태 업데이트 - ${artwork.title}`;
    
    let statusColor = '#3b82f6';
    let statusIcon = '📋';
    
    if (status === 'completed') {
      statusColor = '#10b981';
      statusIcon = '✅';
    } else if (status === 'cancelled') {
      statusColor = '#ef4444';
      statusIcon = '❌';
    } else if (status === 'processing') {
      statusColor = '#f59e0b';
      statusIcon = '⏳';
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${statusColor}; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">${statusIcon} 구매 요청 상태 업데이트</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #374151;">구매 요청 상태가 변경되었습니다</h2>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">📋 요청 정보</h3>
            <p><strong>요청 번호:</strong> ${purchaseRequest.id}</p>
            <p><strong>작품명:</strong> ${artwork.title}</p>
            <p><strong>현재 상태:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusMessages[status as keyof typeof statusMessages]}</span></p>
            ${purchaseRequest.admin_note ? `<p><strong>관리자 메모:</strong> ${purchaseRequest.admin_note}</p>` : ''}
            ${purchaseRequest.final_price ? `<p><strong>최종 가격:</strong> ₩${purchaseRequest.final_price.toLocaleString()}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" 
               style="background-color: ${statusColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              자세히 보기
            </a>
          </div>
        </div>
      </div>
    `;

    await EmailService.sendEmail(email, subject, htmlContent);
  }

  // HTTP 요청 핸들러
  static async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const pathname = url.pathname.replace('/api/purchase/', '');
    const method = req.method;

    try {
      if (pathname === 'create-payment-intent' && method === 'POST') {
        return this.handleCreatePaymentIntent(req);
      }

      if (pathname === 'confirm-payment' && method === 'POST') {
        return this.handleConfirmPayment(req);
      }

      // 기존 구매 요청 관련 라우팅도 여기에 추가할 수 있습니다
      
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      logger.error('Purchase API error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 다중 이미지 분석을 위한 결제 Intent 생성
  static async handleCreatePaymentIntent(req: Request): Promise<Response> {
    try {
      const { tier, imageCount, amount, userId } = await req.json();

      if (!tier || !imageCount || !amount) {
        return new Response(JSON.stringify({
          error: '필수 매개변수가 누락되었습니다.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await StripeService.createMultiImagePaymentIntent(
        userId || null,
        tier,
        imageCount,
        amount
      );

      if (!result.success) {
        return new Response(JSON.stringify({
          error: result.error
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      logger.error('Create payment intent error:', error);
      return new Response(JSON.stringify({
        error: '결제 생성에 실패했습니다.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 결제 확인
  static async handleConfirmPayment(req: Request): Promise<Response> {
    try {
      const { paymentIntentId } = await req.json();

      if (!paymentIntentId) {
        return new Response(JSON.stringify({
          error: 'Payment Intent ID가 필요합니다.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await StripeService.confirmMultiImagePayment(paymentIntentId);

      if (!result.success) {
        return new Response(JSON.stringify({
          error: result.error
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        status: result.status,
        metadata: result.metadata
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      logger.error('Confirm payment error:', error);
      return new Response(JSON.stringify({
        error: '결제 확인에 실패했습니다.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}