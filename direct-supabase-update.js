#!/usr/bin/env bun

// Supabase에 직접 업데이트해보기

const { createClient } = await import('@supabase/supabase-js');

const supabaseAdmin = createClient('https://lzvfmnnshjrjugsrmswu.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dmZtbm5zaGpyanVnc3Jtc3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA1NjMzNiwiZXhwIjoyMDY5NjMyMzM2fQ.1b0pP5WdI9rKfnFQLYqULbfL02da0iaJ-kAxbxdk02A', {
  auth: { autoRefreshToken: false, persistSession: false }
});

const userId = '46f3e470-fb03-4bcb-8bd8-4462f35ecafe';

console.log('🔧 Supabase에 직접 새로운 값으로 업데이트...');

// 기존 메타데이터 무시하고 새로운 값만으로 업데이트
const updateData = {
  user_metadata: {
    display_name: 'DIRECT_UPDATE_TEST',
    nickname: 'DIRECT_NICK',
    email: 'aspirenova@naver.com', // 필요한 기본 값들 유지
    email_verified: true,
    phone_verified: false,
    sub: userId
  }
};

console.log('📋 업데이트할 데이터:', JSON.stringify(updateData, null, 2));

const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);

if (error) {
  console.error('❌ 업데이트 실패:', error);
} else {
  console.log('✅ 업데이트 성공');
  console.log('📊 결과:', JSON.stringify(data.user?.user_metadata, null, 2));
}

// 재확인
console.log('\n🔍 재조회...');
const { data: recheck } = await supabaseAdmin.auth.admin.getUserById(userId);
console.log('📊 재조회 결과:', JSON.stringify(recheck.user?.user_metadata, null, 2));