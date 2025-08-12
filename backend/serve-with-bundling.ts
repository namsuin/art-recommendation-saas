#!/usr/bin/env bun

// Bun server with automatic bundling support
import indexHTML from '../frontend/index.html';

// 환경 확인
logger.info('\n🔧 Bun Bundling Server Starting...');
logger.info('📁 Working Directory:', process.cwd());
logger.info('🎨 Frontend: http://localhost:3000');

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

logger.info(`✅ Server running at http://localhost:${server.port}`);
logger.info('📦 Bun will automatically bundle imported modules');
logger.info('🔄 Hot Module Replacement enabled\n');