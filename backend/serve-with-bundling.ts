#!/usr/bin/env bun

// Bun server with automatic bundling support
import indexHTML from '../frontend/index.html';

// 환경 확인
console.log('\n🔧 Bun Bundling Server Starting...');
console.log('📁 Working Directory:', process.cwd());
console.log('🎨 Frontend: http://localhost:3000');

const server = Bun.serve({
  port: 3000,
  
  fetch(req) {
    const url = new URL(req.url);
    
    // 메인 페이지
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(indexHTML, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }
    
    // 404
    return new Response('Not Found', { status: 404 });
  },
  
  development: {
    // HMR과 자동 번들링 활성화
    hmr: true,
  },
});

console.log(`✅ Server running at http://localhost:${server.port}`);
console.log('📦 Bun will automatically bundle imported modules');
console.log('🔄 Hot Module Replacement enabled\n');