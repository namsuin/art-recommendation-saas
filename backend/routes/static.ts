// Static file serving with error handling
import { readFile } from 'fs/promises';
import { join } from 'path';

// MIME type mapping
const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.jsx': 'text/javascript',
  '.ts': 'text/typescript',
  '.tsx': 'text/typescript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

export async function serveIndexHTML(): Promise<Response> {
  try {
    const htmlPath = join(process.cwd(), 'frontend', 'index.html');
    const htmlContent = await readFile(htmlPath, 'utf-8');
    
    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Failed to serve index.html:', error);
    
    // Fallback HTML
    const fallbackHTML = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Art Recommendation - Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f3f4f6;
          }
          .error-container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            max-width: 500px;
          }
          h1 { color: #ef4444; margin-bottom: 1rem; }
          p { color: #6b7280; margin-bottom: 1.5rem; }
          button {
            background-color: #3b82f6;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.25rem;
            cursor: pointer;
          }
          button:hover { background-color: #2563eb; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>⚠️ 페이지 로드 오류</h1>
          <p>프론트엔드 파일을 찾을 수 없습니다.</p>
          <p style="font-size: 0.875rem;">개발 서버가 올바르게 설정되었는지 확인해주세요.</p>
          <button onclick="location.reload()">다시 시도</button>
        </div>
      </body>
      </html>
    `;
    
    return new Response(fallbackHTML, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

export async function serveStaticFile(filePath: string): Promise<Response> {
  try {
    // Security: prevent directory traversal
    if (filePath.includes('..') || filePath.includes('\0')) {
      return new Response('Forbidden', { status: 403 });
    }

    const fullPath = join(process.cwd(), 'frontend', filePath);
    const content = await readFile(fullPath, 'utf-8');
    
    // Get file extension for MIME type
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    const mimeType = mimeTypes[ext] || 'text/plain';
    
    return new Response(content, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error(`Failed to serve static file ${filePath}:`, error);
    return new Response('Not Found', { status: 404 });
  }
}