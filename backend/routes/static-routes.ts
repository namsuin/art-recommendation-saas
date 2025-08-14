import { serverLogger } from '../../shared/logger';

export interface RouteHandler {
  (req: Request, corsHeaders: Record<string, string>): Promise<Response>;
}

export class StaticRoutes {

  async handleStaticFile(req: Request, corsHeaders: Record<string, string>, pathname: string): Promise<Response> {
    try {
      // Enhanced path resolution with security checks
      let resolvedPath: string;
      
      try {
        // Remove leading slash and resolve relative to frontend directory
        const relativePath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
        
        // Security: Prevent path traversal
        if (relativePath.includes('..') || relativePath.includes('\\')) {
          return new Response("Access denied", { 
            status: 403,
            headers: { 'Content-Type': 'text/plain', ...corsHeaders }
          });
        }
        
        // Try to resolve from frontend directory
        resolvedPath = Bun.resolveSync(`./frontend/${relativePath}`, process.cwd());
      } catch (resolveError) {
        // If resolution fails, try without frontend prefix
        try {
          const relativePath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
          resolvedPath = Bun.resolveSync(`./${relativePath}`, process.cwd());
        } catch (secondResolveError) {
          if (process.env.NODE_ENV === "development") {
            serverLogger.info(`File not found: ${pathname}`);
          }
          return new Response("File not found", { 
            status: 404,
            headers: { 'Content-Type': 'text/plain', ...corsHeaders }
          });
        }
      }
      
      const file = Bun.file(resolvedPath);
      
      if (!(await file.exists())) {
        return new Response("File not found", { 
          status: 404,
          headers: { 'Content-Type': 'text/plain', ...corsHeaders }
        });
      }
      
      // Enhanced MIME type detection
      const mimeType = this.getMimeType(pathname);
      const headers = {
        'Content-Type': mimeType,
        'Cache-Control': this.getCacheControl(pathname),
        ...corsHeaders
      };
      
      return new Response(file, { headers });
      
    } catch (error) {
      serverLogger.error(`Static file serving error for ${pathname}:`, error);
      return new Response("Internal server error", { 
        status: 500,
        headers: { 'Content-Type': 'text/plain', ...corsHeaders }
      });
    }
  }

  private getMimeType(pathname: string): string {
    const ext = pathname.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'jsx': 'application/javascript',
      'ts': 'application/javascript',
      'tsx': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'eot': 'application/vnd.ms-fontobject',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'xml': 'text/xml',
      'zip': 'application/zip'
    };
    
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private getCacheControl(pathname: string): string {
    const ext = pathname.split('.').pop()?.toLowerCase();
    
    // Static assets can be cached longer
    const longCache = ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf'];
    
    if (longCache.includes(ext || '')) {
      return 'public, max-age=31536000'; // 1 year
    }
    
    // HTML and other dynamic content should not be cached
    return 'no-cache, no-store, must-revalidate';
  }

  async handleRootPath(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      const indexPath = Bun.resolveSync('./frontend/index.html', process.cwd());
      const indexFile = Bun.file(indexPath);
      
      if (await indexFile.exists()) {
        const content = await indexFile.text();
        return new Response(content, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache',
            ...corsHeaders
          }
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") serverLogger.info("Frontend index.html not found");
    }
    
    return new Response("Welcome to Art Recommendation SaaS", {
      headers: {
        'Content-Type': 'text/plain',
        ...corsHeaders
      }
    });
  }

  async handleAnalyzePage(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      const analyzePath = Bun.resolveSync('./frontend/analyze.html', process.cwd());
      const analyzeFile = Bun.file(analyzePath);
      
      if (await analyzeFile.exists()) {
        const content = await analyzeFile.text();
        return new Response(content, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache',
            ...corsHeaders
          }
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") serverLogger.info("Analyze page not found");
    }
    
    return new Response("Analysis page not found", {
      status: 404,
      headers: { 'Content-Type': 'text/plain', ...corsHeaders }
    });
  }

  async handleSpecialPages(req: Request, corsHeaders: Record<string, string>, pathname: string): Promise<Response> {
    const specialPages = [
      '/signup', '/login', '/admin-dashboard', '/profile', '/social.html', 
      '/terms-and-conditions', '/privacy-policy', '/about', '/contact',
      '/multi-image', '/admin', '/artist-application'
    ];
    
    if (specialPages.includes(pathname)) {
      let filename = pathname;
      
      // Map special paths to actual files
      const pathMap: Record<string, string> = {
        '/signup': '/signup.html',
        '/login': '/login.html',
        '/admin-dashboard': '/admin-dashboard.html',
        '/profile': '/profile.html',
        '/terms-and-conditions': '/terms-and-conditions.html',
        '/privacy-policy': '/privacy-policy.html',
        '/about': '/about.html',
        '/contact': '/contact.html',
        '/multi-image': '/multi-image.html',
        '/admin': '/admin.html',
        '/artist-application': '/artist-application.html'
      };
      
      filename = pathMap[pathname] || pathname;
      
      try {
        const filePath = Bun.resolveSync(`./frontend${filename}`, process.cwd());
        const file = Bun.file(filePath);
        
        if (await file.exists()) {
          const content = await file.text();
          return new Response(content, {
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'no-cache',
              ...corsHeaders
            }
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          serverLogger.info(`Special page not found: ${filename}`);
        }
      }
    }
    
    return new Response("Page not found", {
      status: 404,
      headers: { 'Content-Type': 'text/plain', ...corsHeaders }
    });
  }
}