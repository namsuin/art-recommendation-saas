# Frontend Files Documentation

## 📁 HTML Files Structure

### Core Files (필수)
- **`index.html`** - 메인 애플리케이션 (단일/다중 이미지 분석)
- **`auth.html`** - 로그인/회원가입 페이지
- **`payment.html`** - 결제 처리 페이지 (Stripe 통합)

### Feature Pages (기능별)
- **`analyze.html`** - 독립적인 이미지 분석 페이지
- **`profile.html`** - 사용자 프로필 및 분석 히스토리
- **`social.html`** - 소셜 기능 및 공유
- **`admin-dashboard.html`** - 관리자 대시보드

## 🎯 Page Purposes

1. **index.html** (Main)
   - 단일 이미지 분석
   - 다중 이미지 분석 (PayPal 결제 통합)
   - 게스트/회원 모드 지원

2. **auth.html**
   - Supabase 인증
   - 이메일/비밀번호 로그인
   - 회원가입

3. **payment.html**
   - Stripe 결제 (레거시)
   - PayPal로 대체됨 (index.html에 통합)

4. **analyze.html**
   - 간단한 분석 전용 페이지
   - 서버 라우트: `/analyze`

5. **profile.html**
   - 사용자 정보 관리
   - 분석 히스토리 조회
   - 저장된 추천 작품

6. **social.html**
   - 작품 공유 기능
   - 커뮤니티 기능

7. **admin-dashboard.html**
   - 시스템 모니터링
   - 사용자 관리
   - 통계 대시보드

## ✅ Cleanup Completed
- Removed test files: `simple.html`, `test.html`, `test-profile-edit.html`
- Removed duplicates: `index-refactored.html`, `simple-test.html`, `test-multi-image.html`
- Total reduction: 10 files → 7 files (30% reduction)