#!/usr/bin/env bun

// Google Vision API 디버깅 스크립트

import { ImageAnnotatorClient } from '@google-cloud/vision';

console.log('🔍 Google Vision API 디버깅...\n');

async function debugVision() {
  const keyFile = '/Users/suin2/art-recommendation-saas/cedar-gift-467808-f9-993fe64d0376.json';
  
  console.log('1️⃣ 환경 확인:');
  console.log(`   키 파일 존재: ${await Bun.file(keyFile).exists()}`);
  console.log(`   프로젝트 ID: cedar-gift-467808-f9\n`);
  
  try {
    console.log('2️⃣ 클라이언트 생성 중...');
    const client = new ImageAnnotatorClient({
      keyFilename: keyFile,
      projectId: 'cedar-gift-467808-f9'
    });
    console.log('   ✅ 클라이언트 생성 성공\n');
    
    console.log('3️⃣ API 테스트 (실제 PNG 이미지)...');
    // 1x1 빨간색 픽셀 PNG
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const imageBuffer = Buffer.from(pngBase64, 'base64');
    
    console.log('   이미지 크기:', imageBuffer.length, 'bytes');
    console.log('   이미지 타입: PNG\n');
    
    const [result] = await client.labelDetection({
      image: { content: imageBuffer }
    });
    console.log('   ✅ API 호출 성공!');
    console.log(`   라벨 수: ${result.labelAnnotations?.length || 0}`);
    
    if (result.labelAnnotations && result.labelAnnotations.length > 0) {
      console.log('\n   감지된 라벨:');
      result.labelAnnotations.forEach((label, i) => {
        console.log(`   ${i + 1}. ${label.description} (${(label.score * 100).toFixed(1)}%)`);
      });
    }
    
    // 색상 분석도 테스트
    console.log('\n4️⃣ 색상 분석 테스트...');
    const [colorResult] = await client.imageProperties({
      image: { content: imageBuffer }
    });
    
    if (colorResult.imagePropertiesAnnotation?.dominantColors?.colors) {
      const colors = colorResult.imagePropertiesAnnotation.dominantColors.colors;
      console.log(`   ✅ 색상 감지: ${colors.length}개`);
      colors.slice(0, 3).forEach((color, i) => {
        const c = color.color;
        console.log(`   ${i + 1}. RGB(${Math.round(c.red || 0)}, ${Math.round(c.green || 0)}, ${Math.round(c.blue || 0)}) - ${(color.pixelFraction * 100).toFixed(1)}%`);
      });
    }
    
  } catch (error: any) {
    console.log('❌ 오류 발생:\n');
    console.log('   메시지:', error.message);
    console.log('   코드:', error.code);
    console.log('   상태:', error.statusDetails);
    
    if (error.code === 7) {
      console.log('\n⚠️  권한 오류! 해결 방법:');
      console.log('   1. https://console.cloud.google.com/apis/library/vision.googleapis.com 접속');
      console.log('   2. 프로젝트 선택: cedar-gift-467808-f9');
      console.log('   3. "사용" 버튼 클릭하여 API 활성화');
      console.log('   4. 결제 계정이 연결되어 있는지 확인');
    }
  }
}

debugVision();