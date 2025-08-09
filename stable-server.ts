console.log("🚀 Starting stable Art Recommendation SaaS server...");

const server = Bun.serve({
  port: 3000,
  hostname: "localhost",
  
  async fetch(req) {
    const url = new URL(req.url);
    
    console.log(`📞 ${req.method} ${url.pathname}`);
    
    // Add CORS headers
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers });
    }
    
    try {
      // Health check
      if (url.pathname === "/api/health") {
        return new Response(JSON.stringify({ 
          status: "healthy", 
          timestamp: Date.now(),
          uptime: process.uptime()
        }), {
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // Favicon
      if (url.pathname === "/favicon.ico") {
        const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎨</text></svg>`;
        return new Response(svgFavicon, {
          headers: { "Content-Type": "image/svg+xml", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // Root path - serve main HTML
      if (url.pathname === "/" || url.pathname === "/index.html") {
        try {
          const indexPath = Bun.resolveSync('./frontend/index.html', process.cwd());
          const indexFile = Bun.file(indexPath);
          
          if (await indexFile.exists()) {
            const content = await indexFile.text();
            return new Response(content, {
              headers: { 
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache',
                ...Object.fromEntries(headers.entries())
              }
            });
          }
        } catch (error) {
          console.log("Frontend index.html not found, serving simple page");
        }
        
        // Fallback to simple page
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>🎨 Art Recommendation SaaS</title>
            <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎨</text></svg>">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; min-height: 100vh; box-sizing: border-box;
              }
              .container { max-width: 800px; margin: 0 auto; text-align: center; }
              h1 { font-size: 3em; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
              .status { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0; }
              .time { opacity: 0.8; font-size: 0.9em; }
              .feature { background: rgba(255,255,255,0.05); padding: 15px; margin: 10px 0; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🎨 Art Recommendation SaaS</h1>
              
              <div class="status">
                <h2>✅ 서버 정상 작동 중</h2>
                <p class="time">현재 시간: ${new Date().toLocaleString('ko-KR')}</p>
                <p>업타임: ${Math.floor(process.uptime())}초</p>
              </div>
              
              <div class="feature">
                <h3>🚀 사용 가능한 기능</h3>
                <p>• AI 기반 아트 추천</p>
                <p>• 이미지 분석 및 스타일 매칭</p>
                <p>• 사용자 맞춤 갤러리</p>
              </div>
              
              <div class="feature">
                <h3>🔗 API 엔드포인트</h3>
                <p><a href="/api/health" style="color: #fff;">건강 상태 확인</a></p>
              </div>
            </div>
          </body>
          </html>
        `, {
          headers: { 
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache',
            ...Object.fromEntries(headers.entries())
          }
        });
      }
      
      // Try to serve static files from frontend directory
      if (url.pathname.startsWith('/')) {
        try {
          const filePath = Bun.resolveSync('./frontend' + url.pathname, process.cwd());
          const file = Bun.file(filePath);
          
          if (await file.exists()) {
            let contentType = 'text/plain';
            
            if (url.pathname.endsWith('.html')) contentType = 'text/html';
            else if (url.pathname.endsWith('.css')) contentType = 'text/css';
            else if (url.pathname.endsWith('.js') || url.pathname.endsWith('.tsx') || url.pathname.endsWith('.ts')) contentType = 'application/javascript';
            else if (url.pathname.endsWith('.json')) contentType = 'application/json';
            else if (url.pathname.endsWith('.png')) contentType = 'image/png';
            else if (url.pathname.endsWith('.jpg') || url.pathname.endsWith('.jpeg')) contentType = 'image/jpeg';
            else if (url.pathname.endsWith('.svg')) contentType = 'image/svg+xml';
            
            return new Response(file, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': contentType.startsWith('text/') ? 'no-cache' : 'public, max-age=3600',
                ...Object.fromEntries(headers.entries())
              }
            });
          }
        } catch (error) {
          // File not found, continue to 404
        }
      }
      
      // 404 for all other routes
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>404 - Page Not Found</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            h1 { color: #666; }
            a { color: #667eea; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>🎨 페이지를 찾을 수 없습니다</h1>
          <p>요청하신 페이지 "${url.pathname}"을 찾을 수 없습니다.</p>
          <p><a href="/">홈으로 돌아가기</a></p>
        </body>
        </html>
      `, { 
        status: 404,
        headers: { 'Content-Type': 'text/html', ...Object.fromEntries(headers.entries()) }
      });
      
    } catch (error) {
      console.error("Server error:", error);
      return new Response(JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now()
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
      });
    }
  },

  error(error) {
    console.error("Server error:", error);
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head><title>서버 오류</title></head>
      <body>
        <h1>서버 오류가 발생했습니다</h1>
        <p>잠시 후 다시 시도해주세요.</p>
      </body>
      </html>
    `, { 
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
});

console.log(`✅ 🎨 Art Recommendation SaaS server running!`);
console.log(`🌐 URL: http://localhost:${server.port}`);
console.log(`❤️  Health: http://localhost:${server.port}/api/health`);
console.log(`📋 Status: Stable server with auto-restart support`);
console.log(`🔄 Hot reload: Changes will be automatically detected`);