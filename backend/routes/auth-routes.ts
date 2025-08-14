import { serverLogger } from '../../shared/logger';
import { AuthAPI } from '../api/auth';

export interface RouteHandler {
  (req: Request, corsHeaders: Record<string, string>): Promise<Response>;
}

export class AuthRoutes {
  private authAPI: AuthAPI;
  
  constructor() {
    this.authAPI = new AuthAPI();
  }

  async handleAuthRequest(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      const result = await this.authAPI.handleRequest(req);
      
      // Add CORS headers to auth responses
      result.headers.append("Access-Control-Allow-Origin", "*");
      result.headers.append("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      result.headers.append("Access-Control-Allow-Headers", "Content-Type, Authorization");
      
      return result;
    } catch (error) {
      serverLogger.error('Auth route error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication request failed'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }

  getAuthEndpoints(): string[] {
    return [
      '/api/auth/signup',
      '/api/auth/signin', 
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/check',
      '/api/auth/user',
      '/api/auth/signout'
    ];
  }
}