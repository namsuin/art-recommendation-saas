// 이메일 서비스 - 실제 운영에서는 SendGrid, AWS SES, 또는 Nodemailer 등을 사용
export class EmailService {
  
  // 이메일 구성 확인
  static isConfigured(): boolean {
    return !!(process.env.EMAIL_SERVICE_ENABLED && 
              process.env.EMAIL_FROM_ADDRESS &&
              (process.env.SENDGRID_API_KEY || 
               process.env.AWS_SES_REGION || 
               process.env.SMTP_HOST));
  }

  // 기본 이메일 전송 함수 (실제 구현에서는 실제 이메일 서비스 사용)
  private static async sendEmail(
    to: string, 
    subject: string, 
    htmlContent: string, 
    textContent?: string
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.info('📧 Email service not configured, logging email instead:');
      logger.info(`To: ${to}`);
      logger.info(`Subject: ${subject}`);
      logger.info(`Content: ${textContent || htmlContent}`);
      return true;
    }

    try {
      // 실제 구현에서는 여기에 실제 이메일 서비스 코드 작성
      // 예: SendGrid, AWS SES, Nodemailer 등
      
      // 현재는 로깅만 수행
      logger.info(`📧 Sending email to ${to}: ${subject}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  // 환영 이메일 (회원가입)
  static async sendWelcomeEmail(userEmail: string, displayName?: string): Promise<boolean> {
    const name = displayName || userEmail.split('@')[0];
    
    const subject = '🎨 AI Art Recommendation에 오신 것을 환영합니다!';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8fafc; padding: 20px; text-align: center;">
          <h1 style="color: #1f2937; margin: 0;">🎨 AI Art Recommendation</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #374151;">안녕하세요, ${name}님!</h2>
          
          <p style="color: #6b7280; line-height: 1.6;">
            AI Art Recommendation 서비스에 가입해 주셔서 감사합니다. 
            이제 AI 기술을 활용하여 개인 맞춤형 예술 작품 추천을 받으실 수 있습니다.
          </p>
          
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">🚀 시작하기</h3>
            <ul style="color: #374151; line-height: 1.6;">
              <li>이미지를 업로드하여 AI 분석을 받아보세요</li>
              <li>개인화된 작품 추천을 확인해보세요</li>
              <li>프리미엄 구독으로 더 많은 기능을 이용해보세요</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              지금 시작하기
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px;">
            궁금한 점이 있으시면 언제든 문의해 주세요.<br>
            감사합니다!
          </p>
        </div>
      </div>
    `;
    
    const textContent = `
안녕하세요, ${name}님!

AI Art Recommendation 서비스에 가입해 주셔서 감사합니다.
이제 AI 기술을 활용하여 개인 맞춤형 예술 작품 추천을 받으실 수 있습니다.

시작하기:
- 이미지를 업로드하여 AI 분석을 받아보세요
- 개인화된 작품 추천을 확인해보세요  
- 프리미엄 구독으로 더 많은 기능을 이용해보세요

지금 시작하기: ${process.env.APP_URL || 'http://localhost:3000'}

궁금한 점이 있으시면 언제든 문의해 주세요.
감사합니다!
    `;

    return await this.sendEmail(userEmail, subject, htmlContent, textContent);
  }

  // 구독 시작 알림
  static async sendSubscriptionStartEmail(
    userEmail: string, 
    planName: string, 
    displayName?: string
  ): Promise<boolean> {
    const name = displayName || userEmail.split('@')[0];
    
    const subject = `🎉 ${planName} 구독이 시작되었습니다!`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎉 구독 시작!</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #374151;">축하합니다, ${name}님!</h2>
          
          <p style="color: #6b7280; line-height: 1.6;">
            <strong>${planName}</strong> 구독이 성공적으로 시작되었습니다.
            이제 프리미엄 기능을 마음껏 이용하실 수 있습니다!
          </p>
          
          <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #065f46; margin-top: 0;">✨ 프리미엄 혜택</h3>
            <ul style="color: #374151; line-height: 1.6;">
              <li>일일 100회 이미지 분석</li>
              <li>고급 AI 앙상블 분석</li>
              <li>무제한 히스토리 저장</li>
              <li>우선 고객 지원</li>
              <li>새로운 기능 우선 체험</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" 
               style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              프리미엄 기능 사용하기
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px;">
            구독 관리는 마이페이지에서 언제든 가능합니다.<br>
            감사합니다!
          </p>
        </div>
      </div>
    `;

    const textContent = `
축하합니다, ${name}님!

${planName} 구독이 성공적으로 시작되었습니다.
이제 프리미엄 기능을 마음껏 이용하실 수 있습니다!

프리미엄 혜택:
- 일일 100회 이미지 분석
- 고급 AI 앙상블 분석  
- 무제한 히스토리 저장
- 우선 고객 지원
- 새로운 기능 우선 체험

프리미엄 기능 사용하기: ${process.env.APP_URL || 'http://localhost:3000'}

구독 관리는 마이페이지에서 언제든 가능합니다.
감사합니다!
    `;

    return await this.sendEmail(userEmail, subject, htmlContent, textContent);
  }

  // 구독 취소 알림
  static async sendSubscriptionCancelEmail(
    userEmail: string, 
    planName: string, 
    endDate: string,
    displayName?: string
  ): Promise<boolean> {
    const name = displayName || userEmail.split('@')[0];
    
    const subject = '구독이 취소되었습니다';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f59e0b; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">구독 취소 알림</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #374151;">안녕하세요, ${name}님</h2>
          
          <p style="color: #6b7280; line-height: 1.6;">
            <strong>${planName}</strong> 구독 취소 요청이 처리되었습니다.
          </p>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">📅 중요 안내</h3>
            <p style="color: #374151; line-height: 1.6; margin: 0;">
              구독은 <strong>${endDate}</strong>까지 유효하며, 
              그 이후에는 무료 요금제로 전환됩니다.
            </p>
          </div>
          
          <p style="color: #6b7280; line-height: 1.6;">
            기간이 끝나기 전까지는 계속해서 프리미엄 기능을 이용하실 수 있습니다.
            언제든 구독을 재개하실 수 있습니다.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              구독 관리하기
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px;">
            저희 서비스를 이용해 주셔서 감사했습니다.<br>
            다시 만날 날을 기대합니다!
          </p>
        </div>
      </div>
    `;

    const textContent = `
안녕하세요, ${name}님

${planName} 구독 취소 요청이 처리되었습니다.

중요 안내:
구독은 ${endDate}까지 유효하며, 그 이후에는 무료 요금제로 전환됩니다.

기간이 끝나기 전까지는 계속해서 프리미엄 기능을 이용하실 수 있습니다.
언제든 구독을 재개하실 수 있습니다.

구독 관리하기: ${process.env.APP_URL || 'http://localhost:3000'}

저희 서비스를 이용해 주셔서 감사했습니다.
다시 만날 날을 기대합니다!
    `;

    return await this.sendEmail(userEmail, subject, htmlContent, textContent);
  }

  // 결제 실패 알림
  static async sendPaymentFailedEmail(
    userEmail: string, 
    displayName?: string
  ): Promise<boolean> {
    const name = displayName || userEmail.split('@')[0];
    
    const subject = '⚠️ 결제 처리에 문제가 발생했습니다';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ef4444; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">⚠️ 결제 알림</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #374151;">안녕하세요, ${name}님</h2>
          
          <p style="color: #6b7280; line-height: 1.6;">
            구독 갱신을 위한 결제 처리 중 문제가 발생했습니다.
          </p>
          
          <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">🔧 해결 방법</h3>
            <ul style="color: #374151; line-height: 1.6;">
              <li>결제 수단 정보를 확인해 주세요</li>
              <li>카드 유효 기간 및 한도를 확인해 주세요</li>
              <li>다른 결제 수단으로 변경해 보세요</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; line-height: 1.6;">
            빠른 시일 내에 결제 수단을 업데이트하지 않으면 
            구독이 일시 중단될 수 있습니다.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" 
               style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              결제 수단 업데이트
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px;">
            문의사항이 있으시면 고객센터로 연락해 주세요.<br>
            감사합니다.
          </p>
        </div>
      </div>
    `;

    const textContent = `
안녕하세요, ${name}님

구독 갱신을 위한 결제 처리 중 문제가 발생했습니다.

해결 방법:
- 결제 수단 정보를 확인해 주세요
- 카드 유효 기간 및 한도를 확인해 주세요  
- 다른 결제 수단으로 변경해 보세요

빠른 시일 내에 결제 수단을 업데이트하지 않으면 구독이 일시 중단될 수 있습니다.

결제 수단 업데이트: ${process.env.APP_URL || 'http://localhost:3000'}

문의사항이 있으시면 고객센터로 연락해 주세요.
감사합니다.
    `;

    return await this.sendEmail(userEmail, subject, htmlContent, textContent);
  }

  // 사용량 한도 알림 (80% 도달 시)
  static async sendUsageLimitWarningEmail(
    userEmail: string, 
    currentUsage: number, 
    limit: number,
    displayName?: string
  ): Promise<boolean> {
    const name = displayName || userEmail.split('@')[0];
    const percentage = Math.round((currentUsage / limit) * 100);
    
    const subject = `📊 일일 사용량 ${percentage}% 도달 알림`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f59e0b; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">📊 사용량 알림</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #374151;">안녕하세요, ${name}님</h2>
          
          <p style="color: #6b7280; line-height: 1.6;">
            오늘 일일 이미지 분석 사용량이 <strong>${percentage}%</strong>에 도달했습니다.
          </p>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">📈 사용 현황</h3>
            <p style="color: #374151; line-height: 1.6; margin: 0;">
              현재 사용량: <strong>${currentUsage}회</strong><br>
              일일 한도: <strong>${limit}회</strong><br>
              남은 사용량: <strong>${limit - currentUsage}회</strong>
            </p>
          </div>
          
          <p style="color: #6b7280; line-height: 1.6;">
            프리미엄 구독으로 업그레이드하시면 일일 100회까지 분석할 수 있습니다.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" 
               style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              프리미엄 업그레이드
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px;">
            사용량은 매일 자정에 초기화됩니다.<br>
            감사합니다!
          </p>
        </div>
      </div>
    `;

    const textContent = `
안녕하세요, ${name}님

오늘 일일 이미지 분석 사용량이 ${percentage}%에 도달했습니다.

사용 현황:
현재 사용량: ${currentUsage}회
일일 한도: ${limit}회  
남은 사용량: ${limit - currentUsage}회

프리미엄 구독으로 업그레이드하시면 일일 100회까지 분석할 수 있습니다.

프리미엄 업그레이드: ${process.env.APP_URL || 'http://localhost:3000'}

사용량은 매일 자정에 초기화됩니다.
감사합니다!
    `;

    return await this.sendEmail(userEmail, subject, htmlContent, textContent);
  }
}