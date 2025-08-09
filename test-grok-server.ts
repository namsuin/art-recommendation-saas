#!/usr/bin/env bun

/**
 * 서버의 Grok AI 이미지 생성 엔드포인트 테스트
 */

async function testGrokEndpoint() {
  console.log('🧪 Testing Grok AI Image Generation Endpoint...\n');
  
  // 테스트용 공통 키워드 (다중 이미지 분석 결과 시뮬레이션)
  const testData = {
    keywords: ['modern art', 'abstract', 'colorful', 'geometric', 'vibrant'],
    style: 'contemporary',
    mood: 'energetic',
    colors: ['blue', 'orange', 'yellow'],
    width: 768,
    height: 768
  };
  
  console.log('📋 Test Request Data:');
  console.log('  Keywords:', testData.keywords.join(', '));
  console.log('  Style:', testData.style);
  console.log('  Mood:', testData.mood);
  console.log('  Colors:', testData.colors.join(', '));
  console.log('');
  
  try {
    const response = await fetch('http://localhost:3000/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('📡 Server Response:');
    console.log('  Success:', result.success || result.placeholder);
    
    if (result.success || result.placeholder) {
      console.log('  Image URL:', result.imageUrl ? '✅ Generated' : '❌ Missing');
      console.log('  Prompt:', result.prompt ? result.prompt.substring(0, 100) + '...' : 'N/A');
      console.log('  Processing Time:', result.processingTime + 'ms');
      console.log('  Services Available:', result.services ? result.services.join(', ') : 'None');
      
      if (result.services && result.services.includes('Grok (xAI)')) {
        console.log('\n✅ Grok API is configured and ready!');
      } else if (result.placeholder) {
        console.log('\n⚠️ Grok API not configured - using placeholder');
        console.log('To enable Grok:');
        console.log('1. Get API key from https://x.ai/api');
        console.log('2. Add to .env: GROK_API_KEY=your-key-here');
      } else {
        console.log('\n📌 Using fallback service:', result.services?.[0] || 'Unknown');
      }
    } else {
      console.error('❌ Generation failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error);
    console.log('\n💡 Make sure the server is running:');
    console.log('   bun server.ts');
  }
}

// 서버가 실행 중인지 먼저 확인
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    const health = await response.json();
    console.log('✅ Server is running\n');
    return true;
  } catch {
    console.log('❌ Server is not running');
    console.log('Please start the server first: bun server.ts\n');
    return false;
  }
}

// 메인 실행
async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testGrokEndpoint();
  }
}

main();