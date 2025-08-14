import { serverLogger } from '../../shared/logger';

export interface RouteHandler {
  (req: Request, corsHeaders: Record<string, string>): Promise<Response>;
}

export class AdminRoutes {
  
  // Helper function to verify admin authentication
  private async verifyAdmin(req: Request): Promise<boolean> {
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const adminAuthCode = process.env.ADMIN_AUTH_CODE;
      return token && adminAuthCode && token === adminAuthCode;
    }

    // Check cookies as fallback
    const cookieHeader = req.headers.get('Cookie');
    if (cookieHeader) {
      const cookies = cookieHeader;
      const adminToken = cookies.split(';').find(c => c.trim().startsWith('admin-token='));
      if (adminToken) {
        const token = adminToken.split('=')[1];
        const adminAuthCode = process.env.ADMIN_AUTH_CODE;
        return token && adminAuthCode && token === adminAuthCode;
      }
    }

    return false;
  }

  async handleVerifyToken(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      const body = await req.json();
      const token = body.token;
      
      const adminAuthCode = process.env.ADMIN_AUTH_CODE;
      const isValid = token && adminAuthCode && token === adminAuthCode;
      
      if (isValid) {
        return new Response(JSON.stringify({
          valid: true
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } else {
        return new Response(JSON.stringify({
          valid: false,
          error: "Invalid admin token"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    } catch (error) {
      serverLogger.error('Admin verification error:', error);
      return new Response(JSON.stringify({
        valid: false,
        error: "Token verification failed"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }

  async handleDashboardStats(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    const isAdmin = await this.verifyAdmin(req);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    try {
      // Mock statistics - in production this would query the database
      const stats = {
        totalUsers: 1247,
        premiumUsers: 89,
        freeUsers: 1158,
        todaySignups: 23,
        activeSubscriptions: 89
      };

      return new Response(JSON.stringify({
        success: true,
        stats
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (error) {
      serverLogger.error('Dashboard stats error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to load dashboard stats'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }

  async handleDashboardUsers(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    const isAdmin = await this.verifyAdmin(req);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    try {
      // Mock user data - in production this would query the database
      const usageStats = {
        todayAnalysis: 156,
        monthlyAnalysis: 3420,
        totalArtworks: 5,
        totalRecommendations: 8934,
        clickedRecommendations: 2156,
        clickRate: "24.1%"
      };

      const recentUsers = [
        {
          id: "user_1",
          email: "user1@example.com",
          display_name: "Art Lover",
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_tier: "free"
        },
        {
          id: "user_2", 
          email: "user2@example.com",
          display_name: "Creative Mind",
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_tier: "premium"
        }
      ];

      const recentUploads = [
        {
          id: "upload_1",
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          analysis_keywords: ["landscape", "nature", "serene"],
          users: {
            email: "user1@example.com",
            display_name: "Art Lover"
          }
        }
      ];

      return new Response(JSON.stringify({
        success: true,
        stats: usageStats,
        recentUsers,
        recentUploads
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (error) {
      serverLogger.error('Dashboard users error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to load user data'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }

  async handleDashboardRevenue(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    const isAdmin = await this.verifyAdmin(req);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    try {
      // Mock revenue data - in production this would query payment records
      const revenueData = {
        success: true,
        recentUsers: [],
        recentUploads: []
      };

      return new Response(JSON.stringify(revenueData), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (error) {
      serverLogger.error('Dashboard revenue error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to load revenue data'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
}