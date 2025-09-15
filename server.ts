#!/usr/bin/env bun
/**
 * Art Recommendation SaaS - Simplified Server
 * AI 생성기 제거 버전
 */

// Initialize logging first
import { serverLogger } from "./shared/logger";

serverLogger.info("🎨 Starting Art Recommendation SaaS Server...");

// Environment validation - Production-safe version
try {
  serverLogger.info('Environment: ' + (process.env.NODE_ENV || 'development'));
  serverLogger.info('Port: ' + (process.env.PORT || '3000'));
} catch (error) {
  serverLogger.warn('Environment check skipped');
}

// Core services - Essential services with lazy loading
let services: any = {};

// Lazy load essential services to save startup memory
async function getService(serviceName: string) {
  if (!services[serviceName]) {
    try {
      switch (serviceName) {
        case 'supabase':
          const supabase = await import("./backend/services/supabase");
          services[serviceName] = supabase;
          break;
        case 'auth':
          const { AuthAPI } = await import("./backend/api/auth");
          services[serviceName] = new AuthAPI();
          break;
        case 'artwork':
          const { ArtworkManagementAPI } = await import("./backend/api/artwork-management");
          services[serviceName] = new ArtworkManagementAPI();
          break;
        case 'mockData':
          const [artistApps, database] = await Promise.all([
            import("./backend/services/mock-artist-applications"),
            import("./backend/services/mock-database")
          ]);
          services[serviceName] = {
            mockArtistApplications: artistApps.mockArtistApplications,
            mockDB: database.mockDB
          };
          break;
        case 'ai':
          serverLogger.info('🔄 Loading AI Analysis Service...');
          const { AIAnalysisService } = await import("./backend/services/ai-analysis");
          serverLogger.info('✅ AI Analysis Service imported, initializing...');
          services[serviceName] = new AIAnalysisService();
          serverLogger.info('🎯 AI Analysis Service initialized successfully');
          break;
      }
      serverLogger.info(`${serviceName} service loaded`);
    } catch (error) {
      serverLogger.warn(`${serviceName} service failed to load:`, error);
      services[serviceName] = null;
    }
  }
  return services[serviceName];
}

const server = Bun.serve({
  port: parseInt(process.env.PORT || '3000'),
  hostname: "0.0.0.0",
  
  // Handle server startup errors
  error(error) {
    serverLogger.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
  
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
    
    // Handle CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Request logging for development
    if (process.env.NODE_ENV === 'development') {
      serverLogger.info(`${method} ${url.pathname}`);
    }
    
    try {
      // ======================
      // API ENDPOINTS
      // ======================
      
      
      // Health check
      if (url.pathname === "/api/health") {
        return new Response(JSON.stringify({
          status: "healthy",
          timestamp: new Date().toISOString(),
          services: {
            supabase: await (await getService('supabase'))?.testSupabaseConnection?.() || false,
            ai: !!(await getService('ai')),
          }
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // Configuration endpoint (for frontend to get config values)
      if (url.pathname === "/api/config") {
        return new Response(JSON.stringify({
          // Public configuration only - no sensitive data
          appName: 'Art Recommendation SaaS',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'production'
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // Secure admin token verification endpoint
      if (url.pathname === "/api/admin/verify" && method === "POST") {
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

      // Image proxy endpoint to handle CORS issues with external images
      if (url.pathname === "/api/image-proxy" && (method === "GET" || method === "HEAD")) {
        const imageUrl = url.searchParams.get('url');
        
        if (!imageUrl) {
          return new Response('Missing image URL parameter', { 
            status: 400,
            headers: corsHeaders 
          });
        }

        try {
          // Validate URL to prevent SSRF attacks
          const targetUrl = new URL(imageUrl);
          const allowedHosts = [
            'media.artsper.com',
            'images.metmuseum.org', 
            'collectionapi.metmuseum.org',
            'upload.wikimedia.org',
            'www.wikiart.org',
            'nrs.harvard.edu',
            'iiif.harvardartmuseums.org',
            'api.europeana.eu',
            'europeana1914-1918.s3.amazonaws.com'
          ];
          
          if (!allowedHosts.some(host => targetUrl.hostname.includes(host))) {
            return new Response('Unauthorized image source', { 
              status: 403,
              headers: corsHeaders 
            });
          }

          serverLogger.info(`🖼️ Proxying image: ${imageUrl}`);
          
          const imageResponse = await fetch(imageUrl, {
            headers: {
              'User-Agent': 'Art-Recommendation-SaaS/1.0',
              'Referer': 'https://art-recommendation-saas.onrender.com/',
            }
          });

          if (!imageResponse.ok) {
            return new Response('Failed to fetch image', { 
              status: imageResponse.status,
              headers: corsHeaders 
            });
          }

          const contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg';
          const imageBuffer = await imageResponse.arrayBuffer();

          return new Response(imageBuffer, {
            headers: {
              ...corsHeaders,
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            }
          });

        } catch (error) {
          serverLogger.error('Image proxy error:', error);
          return new Response('Failed to proxy image', { 
            status: 500,
            headers: corsHeaders 
          });
        }
      }
      
      // ======================
      // AUTH ENDPOINTS
      // ======================
      const authAPI = await getService('auth');
      const authEndpoints = ['/api/auth/signup', '/api/auth/signin', '/api/auth/login', '/api/auth/logout', '/api/auth/check', '/api/auth/user', '/api/auth/signout'];
      
      if (authEndpoints.includes(url.pathname)) {
        const result = await authAPI.handleRequest(req);
        
        // Add CORS headers to auth responses
        result.headers.append("Access-Control-Allow-Origin", "*");
        result.headers.append("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        result.headers.append("Access-Control-Allow-Headers", "Content-Type, Authorization");
        
        return result;
      }
      
      // ======================
      // ADMIN ENDPOINTS
      // ======================
      if (url.pathname === "/api/admin/dashboard/stats" && method === "GET") {
        try {
          // 관리자 인증 확인
          const auth = await checkAdminAuth(req);
          if (!auth.isAdmin) {
            return auth.response!;
          }

          // 관리자 대시보드가 기대하는 구조로 데이터 반환
          const stats = {
            success: true,
            data: {
              users: {
                total: 4,
                activeToday: 3,
                growthRate: 15.3
              },
              analyses: {
                today: 8,
                total: 76,
                averagePerUser: 19
              },
              revenue: {
                totalRevenue: 4250.00,
                monthlyRecurring: 149.97,
                conversionRate: 8.7
              },
              system: {
                uptime: 99.9,
                status: "healthy",
                avgResponseTime: 245,
                errorRate: 0.12,
                cpuUsage: 25.4,
                memoryUsage: 68.2,
                diskUsage: 45.7,
                activeConnections: 142,
                apiCalls: {
                  today: 1247,
                  thisHour: 89
                },
                services: {
                  "Google Vision": "active",
                  "Clarifai": "active", 
                  "Supabase": "active",
                  "Redis": "warning"
                }
              },
              artworks: {
                total: 4,
                pending: 1,
                approved: 2,
                rejected: 1
              }
            },
            recentActivity: [
              { type: 'analysis', user: 'user123', time: new Date().toISOString(), details: 'Image analysis completed' },
              { type: 'signup', user: 'newuser', time: new Date().toISOString(), details: 'New user registration' }
            ]
          };
          
          return new Response(JSON.stringify(stats), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to fetch admin stats"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // ======================
      // PROFILE ENDPOINTS
      // ======================
      
      // Get user's liked artworks
      if (url.pathname === "/api/profile/liked-artworks" && method === "GET") {
        const userId = url.searchParams.get("userId");
        const limit = parseInt(url.searchParams.get("limit") || "20");
        
        if (!userId) {
          return new Response(JSON.stringify({
            success: false,
            error: "userId is required"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        try {
          // Mock data - in real implementation, query from database
          const mockLikedArtworks = [
            {
              id: "artwork-1",
              title: "Starry Night",
              artist: "Vincent van Gogh",
              image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/757px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
              liked_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
              source_platform: "met"
            },
            {
              id: "artwork-2", 
              title: "The Great Wave",
              artist: "Hokusai",
              image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/The_Great_Wave_off_Kanagawa.jpg/640px-The_Great_Wave_off_Kanagawa.jpg",
              liked_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
              source_platform: "met"
            }
          ];
          
          return new Response(JSON.stringify({
            success: true,
            likedArtworks: mockLikedArtworks.slice(0, limit)
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to fetch liked artworks"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // Get user's upload history
      if (url.pathname === "/api/profile/upload-history" && method === "GET") {
        const userId = url.searchParams.get("userId");
        const limit = parseInt(url.searchParams.get("limit") || "10");
        
        if (!userId) {
          return new Response(JSON.stringify({
            success: false,
            error: "userId is required"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        try {
          // Mock data - in real implementation, query user_uploads table
          const mockHistory = [
            {
              id: "upload-1",
              upload_date: new Date(Date.now() - 86400000).toISOString(),
              style: "Impressionism",
              keywords: ["landscape", "sunset", "painting", "colors"],
              recommendations_count: 8
            },
            {
              id: "upload-2",
              upload_date: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
              style: "Modern",
              keywords: ["abstract", "geometric", "contemporary"],
              recommendations_count: 12
            }
          ];
          
          return new Response(JSON.stringify({
            success: true,
            history: mockHistory.slice(0, limit)
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to fetch upload history"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // Get user's profile stats
      if (url.pathname === "/api/profile/stats" && method === "GET") {
        const userId = url.searchParams.get("userId");
        
        if (!userId) {
          return new Response(JSON.stringify({
            success: false,
            error: "userId is required"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        try {
          // Mock stats - in real implementation, aggregate from database
          const mockStats = {
            member_since: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
            total_uploads: 5,
            total_likes: 12,
            favorite_styles: ["Impressionism", "Modern", "Abstract"],
            activity_score: 17
          };
          
          return new Response(JSON.stringify({
            success: true,
            stats: mockStats
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to fetch profile stats"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // Update user profile
      if (url.pathname === "/api/profile/update" && method === "POST") {
        try {
          const formData = await req.formData();
          const userId = formData.get("userId") as string;
          const displayName = formData.get("displayName") as string;
          const nickname = formData.get("nickname") as string;
          const profileImageFile = formData.get("profileImage") as File;
          
          if (!userId) {
            return new Response(JSON.stringify({
              success: false,
              error: "userId is required"
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          
          if (process.env.NODE_ENV === 'development') {
            serverLogger.info('Profile update request', {
              userId,
              displayName,
              nickname,
              profileImage: profileImageFile?.name || 'none'
            });
          }
          
          let profileImageUrl = null;
          
          // Handle profile image upload
          if (profileImageFile && profileImageFile.size > 0) {
            // Validate image
            if (!profileImageFile.type.startsWith('image/')) {
              return new Response(JSON.stringify({
                success: false,
                error: "Only image files are allowed"
              }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders }
              });
            }
            
            if (profileImageFile.size > 5 * 1024 * 1024) { // 5MB limit
              return new Response(JSON.stringify({
                success: false,
                error: "Image size must be under 5MB"
              }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders }
              });
            }
            
            // Convert image to base64 for storage
            const imageBuffer = await profileImageFile.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');
            profileImageUrl = `data:${profileImageFile.type};base64,${base64Image}`;
          }
          
          // In real implementation, update user profile in database using Supabase
          // For now, return success with mock data
          
          serverLogger.info('Profile update successful');
          
          return new Response(JSON.stringify({
            success: true,
            message: "Profile updated successfully",
            profileImageUrl: profileImageUrl,
            updatedFields: {
              displayName,
              nickname,
              profileImage: !!profileImageFile
            }
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
          
        } catch (error) {
          serverLogger.error('Profile update error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to update profile"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // Artist application endpoint
      if (url.pathname === "/api/artist/apply" && method === "POST") {
        try {
          const body = await req.json();
          const { userId, email, artistName, bio, portfolioUrl, instagramUrl, experience, specialties, statement } = body;
          
          if (!userId || !email || !artistName || !bio || !experience || !specialties || !statement) {
            return new Response(JSON.stringify({
              success: false,
              error: "Missing required fields"
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          
          // Mock 데이터 사용 (Supabase 테이블이 아직 생성되지 않음)
          const mockData = await getService('mockData');
          const { data, error } = await mockData?.mockArtistApplications?.create?.({
            user_id: userId,
            email: email,
            artist_name: artistName,
            bio: bio,
            portfolio_url: portfolioUrl,
            instagram_url: instagramUrl,
            experience: experience,
            specialties: specialties,
            statement: statement,
            status: 'pending'
          });
            
          if (error) {
            serverLogger.error('Artist application insert error:', error);
            return new Response(JSON.stringify({
              success: false,
              error: "Failed to submit application"
            }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          
          if (process.env.NODE_ENV === 'development') {
            serverLogger.info('Artist application submitted', {
              userId,
              artistName,
              email,
              experience,
              specialties: specialties.length
            });
          }
          
          return new Response(JSON.stringify({
            success: true,
            message: "Artist application submitted successfully",
            applicationId: data?.[0]?.id
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
          
        } catch (error) {
          serverLogger.error('Artist application error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to process application"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // Get artist applications (Admin only)
      if (url.pathname === "/api/admin/artist-applications" && method === "GET") {
        try {
          // Mock 데이터 사용 - getAll 메서드가 없으면 빈 배열 반환
          const mockData = await getService('mockData');
          const applications = mockData?.mockArtistApplications?.getAll ? 
            await mockData.mockArtistApplications.getAll() : 
            { data: [], error: null };
          
          const { data, error } = applications;

          if (error) {
            serverLogger.error('Failed to fetch artist applications:', error);
            return new Response(JSON.stringify({
              success: false,
              error: "Failed to fetch applications"
            }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            applications: data || []
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          serverLogger.error('Error fetching artist applications:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "Server error"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // Approve/Reject artist application (Admin only)
      if (url.pathname === "/api/admin/artist-applications/review" && method === "POST") {
        try {
          const body = await req.json();
          const { applicationId, action, reviewNotes } = body;

          if (!applicationId || !action || !['approve', 'reject'].includes(action)) {
            return new Response(JSON.stringify({
              success: false,
              error: "Invalid request parameters"
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }

          const newStatus = action === 'approve' ? 'approved' : 'rejected';

          // Mock 데이터 업데이트
          const mockData = await getService('mockData');
          const { data: appData, error: appError } = await mockData?.mockArtistApplications?.updateStatus?.(
            applicationId,
            newStatus,
            reviewNotes
          );

          if (appError) {
            serverLogger.error('Failed to update application:', appError);
            return new Response(JSON.stringify({
              success: false,
              error: "Failed to update application"
            }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }

          // If approved, update user role to artist
          if (action === 'approve' && appData) {
            if (process.env.NODE_ENV === "development") serverLogger.info(`🔄 Updating user role for user_id: ${appData.user_id}`);
            
            // 먼저 해당 사용자가 존재하는지 확인 (users 테이블 사용)
            const { data: existingUser, error: checkError } = await supabase
              .from('users')
              .select('*')
              .eq('id', appData.user_id)
              .single();
            
            if (checkError) {
              serverLogger.error('❌ User not found in database:', checkError);
              if (process.env.NODE_ENV === "development") serverLogger.info('🔍 Searching by email instead...');
              
              // Supabase 테이블이 존재하지 않는 경우 바로 Mock 시스템 사용
              if (checkError.code === '42P01') {
                if (process.env.NODE_ENV === "development") serverLogger.info('🔄 Database table missing, using Mock system directly');
                
                const { data: mockUpdateData, error: mockError } = await mockDB.updateUserRole(
                  appData.user_id,
                  appData.email,
                  'artist',
                  {
                    artist_name: appData.artist_name,
                    artist_bio: appData.bio,
                    artist_portfolio_url: appData.portfolio_url,
                    artist_instagram: appData.instagram_url
                  }
                );
                
                if (mockError) {
                  serverLogger.error('❌ Mock role update failed:', mockError);
                } else {
                  if (process.env.NODE_ENV === "development") serverLogger.info('✅ User role updated successfully via Mock (direct):', mockUpdateData);
                }
                
                // Mock 업데이트 완료 후 다음 단계로 건너뛰기
                if (process.env.NODE_ENV === "development") serverLogger.info(`🎨 Artist application ${action}d:`, applicationId);
                return new Response(JSON.stringify({
                  success: true,
                  message: `Application ${action}d successfully`
                }), {
                  headers: { "Content-Type": "application/json", ...corsHeaders }
                });
              }
              
              // 이메일로 사용자 찾기 시도
              const { data: userByEmail, error: emailError } = await supabase
                .from('users')
                .select('*')
                .eq('email', appData.email)
                .single();
              
              if (emailError) {
                serverLogger.error('❌ User not found by email either:', emailError);
                if (process.env.NODE_ENV === "development") serverLogger.info('🔄 Falling back to Mock database for user role update');
                
                // Supabase 실패 시 Mock 시스템 사용
                const { data: mockUpdateData, error: mockError } = await mockDB.updateUserRole(
                  appData.user_id,
                  appData.email,
                  'artist',
                  {
                    artist_name: appData.artist_name,
                    artist_bio: appData.bio,
                    artist_portfolio_url: appData.portfolio_url,
                    artist_instagram: appData.instagram_url
                  }
                );
                
                if (mockError) {
                  serverLogger.error('❌ Mock role update failed:', mockError);
                } else {
                  if (process.env.NODE_ENV === "development") serverLogger.info('✅ User role updated successfully via Mock:', mockUpdateData);
                }
              } else {
                if (process.env.NODE_ENV === "development") serverLogger.info('✅ Found user by email:', userByEmail.id);
                // 이메일로 찾은 사용자 ID로 업데이트
                const { data: updateData, error: userError } = await supabase
                  .from('users')
                  .update({
                    role: 'artist',
                    artist_name: appData.artist_name,
                    artist_bio: appData.bio,
                    artist_portfolio_url: appData.portfolio_url,
                    artist_instagram: appData.instagram_url,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', userByEmail.id)
                  .select();

                if (userError) {
                  serverLogger.error('❌ Failed to update user role by email:', userError);
                } else {
                  if (process.env.NODE_ENV === "development") serverLogger.info('✅ User role updated successfully by email:', updateData);
                }
              }
            } else {
              if (process.env.NODE_ENV === "development") serverLogger.info('✅ User found, updating role:', existingUser);
              
              const { data: updateData, error: userError } = await supabase
                .from('users')
                .update({
                  role: 'artist',
                  artist_name: appData.artist_name,
                  artist_bio: appData.bio,
                  artist_portfolio_url: appData.portfolio_url,
                  artist_instagram: appData.instagram_url,
                  updated_at: new Date().toISOString()
                })
                .eq('id', appData.user_id)
                .select();

              if (userError) {
                serverLogger.error('❌ Failed to update user role:', userError);
              } else {
                if (process.env.NODE_ENV === "development") serverLogger.info('✅ User role updated successfully:', updateData);
              }
            }
          }

          if (process.env.NODE_ENV === "development") serverLogger.info(`🎨 Artist application ${action}d:`, applicationId);

          return new Response(JSON.stringify({
            success: true,
            message: `Application ${action}d successfully`
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          serverLogger.error('Error reviewing artist application:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "Server error"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // Update artist application (Admin only)
      if (url.pathname.startsWith("/api/admin/artist-applications/") && method === "PUT") {
        try {
          const applicationId = url.pathname.split('/').pop();
          const body = await req.json();
          const { 
            artist_name, 
            bio, 
            statement, 
            portfolio_url, 
            instagram_url, 
            experience, 
            specialties 
          } = body;

          if (!applicationId || !artist_name) {
            return new Response(JSON.stringify({
              success: false,
              error: "Application ID and artist name are required"
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }

          // Mock 데이터 업데이트
          const updateData = {};
          if (artist_name) updateData.artist_name = artist_name;
          if (bio) updateData.bio = bio;
          if (statement) updateData.statement = statement;
          if (portfolio_url !== undefined) updateData.portfolio_url = portfolio_url;
          if (instagram_url !== undefined) updateData.instagram_url = instagram_url;
          if (experience) updateData.experience = experience;
          if (specialties) updateData.specialties = specialties;

          const { data, error } = await mockArtistApplications.update(applicationId, updateData);

          if (error) {
            serverLogger.error('Failed to update artist application:', error);
            return new Response(JSON.stringify({
              success: false,
              error: "Failed to update application"
            }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            application: data,
            message: "Application updated successfully"
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          serverLogger.error('Error updating artist application:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "Server error"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // Delete artist application (Admin only)
      if (url.pathname.startsWith("/api/admin/artist-applications/") && method === "DELETE") {
        try {
          const applicationId = url.pathname.split('/').pop();

          if (!applicationId) {
            return new Response(JSON.stringify({
              success: false,
              error: "Application ID is required"
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }

          // Mock 데이터 삭제
          const { error } = await mockArtistApplications.delete(applicationId);

          if (error) {
            serverLogger.error('Failed to delete artist application:', error);
            return new Response(JSON.stringify({
              success: false,
              error: "Failed to delete application"
            }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            message: "Application deleted successfully"
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          serverLogger.error('Error deleting artist application:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "Server error"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // Additional admin endpoint for users list
      if (url.pathname === "/api/admin/dashboard/users" && method === "GET") {
        try {
          // Get all real users from the mock database
          const allUsers = await mockDB.getAllUsers();
          
          // Return users data
          const usersData = {
            success: true,
            data: allUsers,
            pagination: {
              total: allUsers.length,
              page: 1,
              limit: 20,
              total_pages: Math.ceil(allUsers.length / 20)
            }
          };
          
          return new Response(JSON.stringify(usersData), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to fetch users list"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // Admin endpoint for updating user
      if (url.pathname.startsWith("/api/admin/users/") && method === "PUT") {
        try {
          const pathParts = url.pathname.split('/');
          const userId = pathParts[pathParts.length - 1];
          
          if (!userId) {
            return new Response(JSON.stringify({
              success: false,
              error: "User ID is required"
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }

          const body = await req.json();
          const result = await mockDB.updateUserByAdmin(userId, body);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 404,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          serverLogger.error("User update error:", error);
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to update user"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // Admin revenue endpoint
      if (url.pathname === "/api/admin/dashboard/revenue" && method === "GET") {
        try {
          // Mock revenue data - in real implementation, query from database
          const mockRevenue = {
            success: true,
            data: {
              total_revenue: 4250.00,
              monthly_revenue: 890.50,
              daily_revenue: 125.75,
              currency: "USD",
              growth_rate: 15.3,
              transactions: [
                {
                  id: "txn-1",
                  date: new Date(Date.now() - 86400000).toISOString(),
                  amount: 29.99,
                  type: "subscription",
                  user_email: "user1@example.com",
                  status: "completed"
                },
                {
                  id: "txn-2", 
                  date: new Date(Date.now() - 172800000).toISOString(),
                  amount: 19.99,
                  type: "multi_analysis",
                  user_email: "artist1@example.com",
                  status: "completed"
                },
                {
                  id: "txn-3",
                  date: new Date(Date.now() - 259200000).toISOString(), 
                  amount: 49.99,
                  type: "premium_upgrade",
                  user_email: "premium@example.com",
                  status: "completed"
                }
              ],
              monthly_breakdown: [
                { month: "2025-01", revenue: 2340.00 },
                { month: "2025-02", revenue: 1910.00 },
                { month: "2025-03", revenue: 890.50 }
              ]
            }
          };
          
          return new Response(JSON.stringify(mockRevenue), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to fetch revenue data"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // Admin artworks endpoint - 직접 등록한 작품 정보
      if (url.pathname === "/api/admin/dashboard/artworks" && method === "GET") {
        try {
          // Use Artsper artworks data
          const response = {
            success: true,
            artworks: artsperArtworks,
            summary: artsperSummary
          };
          
          return new Response(JSON.stringify(response), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to fetch artworks data"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // Admin analysis logs endpoint - 분석 조회 기록  
      if (url.pathname === "/api/admin/dashboard/analysis-logs" && method === "GET") {
        try {
          const mockAnalysisLogs = {
            success: true,
            analysis_logs: [
              {
                id: "analysis-1",
                user_email: "user1@example.com",
                user_name: "Art Lover",
                analysis_date: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                analysis_type: "single_image",
                processing_time: 2340,
                detected_style: "Impressionism",
                detected_colors: ["blue", "green", "yellow"],
                keywords_count: 8,
                recommendations_generated: 12,
                api_used: ["Google Vision", "Met Museum"],
                success: true
              },
              {
                id: "analysis-2",
                user_email: "artist1@example.com", 
                user_name: "Professional Artist",
                analysis_date: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
                analysis_type: "multi_image",
                processing_time: 5670,
                detected_style: "Contemporary",
                detected_colors: ["red", "black", "white"],
                keywords_count: 15,
                recommendations_generated: 8,
                images_count: 3,
                api_used: ["Google Vision", "Clarifai", "Harvard Museums"],
                success: true
              },
              {
                id: "analysis-3",
                user_email: "curator@museum.com",
                user_name: "Museum Curator",
                analysis_date: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
                analysis_type: "single_image",
                processing_time: 1890,
                detected_style: "Classical",
                detected_colors: ["brown", "gold", "cream"],
                keywords_count: 12,
                recommendations_generated: 15,
                api_used: ["Google Vision", "Europeana"],
                success: true
              },
              {
                id: "analysis-4",
                user_email: "user1@example.com",
                user_name: "Art Lover", 
                analysis_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                analysis_type: "single_image",
                processing_time: 0,
                error_message: "Google Vision API quota exceeded",
                api_used: ["Google Vision"],
                success: false
              }
            ],
            summary: {
              total_analyses: 4,
              successful: 3,
              failed: 1,
              average_processing_time: 3300,
              most_used_style: "Impressionism",
              most_active_user: "user1@example.com"
            }
          };
          
          return new Response(JSON.stringify(mockAnalysisLogs), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to fetch analysis logs"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // Admin payments endpoint - 결제 기록
      if (url.pathname === "/api/admin/dashboard/payments" && method === "GET") {
        try {
          const mockPayments = {
            success: true,
            payments: [
              {
                id: "pay-1",
                user_email: "artist1@example.com",
                user_name: "Professional Artist",
                payment_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                amount: 29.99,
                currency: "USD",
                payment_method: "stripe",
                transaction_id: "pi_1234567890",
                status: "completed",
                description: "Premium subscription - Monthly",
                invoice_id: "inv_001"
              },
              {
                id: "pay-2",
                user_email: "curator@museum.com", 
                user_name: "Museum Curator",
                payment_date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
                amount: 19.99,
                currency: "USD", 
                payment_method: "paypal",
                transaction_id: "pp_9876543210",
                status: "completed",
                description: "Multi-image analysis (5 images)",
                invoice_id: "inv_002"
              },
              {
                id: "pay-3",
                user_email: "user1@example.com",
                user_name: "Art Lover",
                payment_date: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
                amount: 9.99,
                currency: "USD",
                payment_method: "stripe",
                transaction_id: "pi_1122334455", 
                status: "failed",
                error_message: "Card declined",
                description: "Single image analysis premium",
                invoice_id: "inv_003"
              },
              {
                id: "pay-4",
                user_email: "premium@example.com",
                user_name: "Premium User",
                payment_date: new Date(Date.now() - 604800000).toISOString(), // 7 days ago  
                amount: 99.99,
                currency: "USD",
                payment_method: "stripe",
                transaction_id: "pi_5566778899",
                status: "completed",
                description: "Annual subscription - Premium",
                invoice_id: "inv_004"
              }
            ],
            summary: {
              total_payments: 4,
              successful_payments: 3,
              failed_payments: 1,
              total_revenue: 149.97,
              average_payment: 37.49,
              payment_methods: {
                stripe: 3,
                paypal: 1
              }
            }
          };
          
          return new Response(JSON.stringify(mockPayments), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to fetch payment records"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // ======================
      // ARTWORK MANAGEMENT ENDPOINTS
      // ======================
      
      // Register new artwork (Admin only)
      if (url.pathname === "/api/admin/artworks" && method === "POST") {
        try {
          let title, artist, artist_bio, description, year, medium, style, imageFile, imageUrl, category, tags, status, price;
          
          const contentType = req.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            // Handle JSON request
            const body = await req.json();
            title = body.title;
            artist = body.artist_name || body.artist;
            artist_bio = body.artist_bio;
            description = body.description;
            year = body.year;
            medium = body.medium;
            style = body.style || body.category;
            imageUrl = body.image_url;
            category = body.category;
            tags = body.tags;
            status = body.status || 'pending';
            price = body.price;
          } else {
            // Handle FormData request
            const formData = await req.formData();
            title = formData.get("title") as string;
            artist = formData.get("artist") as string;
            artist_bio = formData.get("artist_bio") as string | null;
            description = formData.get("description") as string | null;
            year = formData.get("year") as string | null;
            medium = formData.get("medium") as string | null;
            style = formData.get("style") as string | null;
            imageFile = formData.get("image") as File | null;
            imageUrl = formData.get("image_url") as string | null;
          }
          
          if (!title || !artist) {
            return new Response(JSON.stringify({
              success: false,
              error: "Title and artist are required"
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          
          if (!imageFile && !imageUrl) {
            // Allow artwork without image for now
            serverLogger.warn("Artwork registered without image");
          }
          
          const { artworkRegistry } = await import('./backend/services/artwork-registry');
          
          // Create a simplified artwork directly for dashboard
          const artworkData: any = {
            title,
            artist,
            artist_bio: artist_bio || undefined,
            description: description || undefined,
            year: year ? (typeof year === 'string' ? parseInt(year) : year) : undefined,
            medium: medium || undefined,
            style: style || category || undefined,
            image_file: imageFile ? Buffer.from(await imageFile.arrayBuffer()) : undefined,
            image_url: imageUrl || undefined
          };
          
          // Add extra fields for dashboard display
          if (contentType.includes('application/json')) {
            // Create simplified artwork for JSON requests from dashboard
            const artwork = artworkRegistry.registerSimpleArtwork({
              title,
              artist_name: artist,
              artist_bio: artist_bio,
              description: description || '',
              image_url: imageUrl || '',
              price: price || '',
              category: category || style || 'painting',
              medium: medium,
              year: year,
              tags: tags || '',
              status: status || 'pending',
              created_by: 'admin'
            });
            
            return new Response(JSON.stringify({
              success: true,
              artwork,
              message: 'Artwork registered successfully'
            }), {
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          
          const result = await artworkRegistry.registerArtwork(artworkData, 'admin');
          
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          serverLogger.error("Failed to register artwork:", error);
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to register artwork"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // Get all artworks with pagination
      if (url.pathname === "/api/admin/artworks" && method === "GET") {
        try {
          // Parse query parameters for pagination and search
          const searchParams = new URL(url).searchParams;
          const page = parseInt(searchParams.get('page') || '1');
          const limit = parseInt(searchParams.get('limit') || '20');
          const offset = (page - 1) * limit;
          const searchTerm = searchParams.get('search')?.toLowerCase() || '';
          
          const { artworkRegistry } = await import('./backend/services/artwork-registry');
          const registeredArtworks = artworkRegistry.getAllArtworks();
          
          // Transform registry artworks to dashboard format
          const registryArtworks = registeredArtworks.map(artwork => ({
            id: artwork.id,
            title: artwork.title,
            artist_name: artwork.artist,
            artist_bio: artwork.artist_bio,
            description: artwork.description,
            image_url: artwork.image_url,
            category: artwork.style || 'painting',
            medium: artwork.medium,
            year: artwork.year,
            price: '',  // price field can be added if needed
            tags: artwork.keywords ? artwork.keywords.join(', ') : '',
            status: artwork.status,
            created_at: artwork.created_at,
            available: artwork.available
          }));
          
          // Load Artsper artworks from compressed JSON file
          let artsperArtworks = [];
          try {
            const compressedFile = await Bun.file('./artsper-dashboard-full.json.gz').arrayBuffer();
            const decompressed = Bun.gunzipSync(new Uint8Array(compressedFile));
            const jsonText = new TextDecoder().decode(decompressed);
            const artsperData = JSON.parse(jsonText);
            artsperArtworks = artsperData.artworks || [];
            serverLogger.info(`📊 Loaded ${artsperArtworks.length} Artsper artworks from dashboard-full (compressed)`);
          } catch (error) {
            serverLogger.warn('Could not load artsper-dashboard-full.json.gz:', error);
          }
          
          // Transform Artsper artworks to match the expected format
          const artsperArtworksFormatted = artsperArtworks.map(artwork => ({
            id: artwork.id,
            title: artwork.title,
            artist_name: artwork.artist,
            artist_bio: '',
            description: artwork.description,
            image_url: artwork.image_url,
            category: artwork.category,
            medium: artwork.medium,
            year: '',
            price: artwork.price ? artwork.price.toString() : '',
            tags: '',
            status: artwork.status || 'approved',
            created_at: artwork.registration_date || new Date().toISOString(),
            available: true
          }));
          
          // Combine both sources
          let allArtworks = [...registryArtworks, ...artsperArtworksFormatted];
          
          // Apply search filter if searchTerm is provided
          if (searchTerm) {
            allArtworks = allArtworks.filter(artwork => 
              artwork.title.toLowerCase().includes(searchTerm) ||
              artwork.artist_name.toLowerCase().includes(searchTerm) ||
              artwork.description.toLowerCase().includes(searchTerm) ||
              artwork.category.toLowerCase().includes(searchTerm)
            );
          }
          
          // Apply pagination to filtered results
          const paginatedArtworks = allArtworks.slice(offset, offset + limit);
          const totalPages = Math.ceil(allArtworks.length / limit);
          
          serverLogger.info(`Search: "${searchTerm}" | Page ${page}/${totalPages} with ${paginatedArtworks.length} artworks (total filtered: ${allArtworks.length})`);
          
          return new Response(JSON.stringify({
            success: true,
            artworks: paginatedArtworks,
            pagination: {
              total: allArtworks.length,
              page: page,
              limit: limit,
              totalPages: totalPages
            }
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to fetch artworks"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // Delete artwork
      if (url.pathname.startsWith("/api/admin/artworks/") && method === "DELETE") {
        try {
          const artworkId = url.pathname.split('/').pop();
          if (!artworkId) {
            return new Response(JSON.stringify({
              success: false,
              error: "Artwork ID is required"
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          
          const { artworkRegistry } = await import('./backend/services/artwork-registry');
          const deleted = artworkRegistry.deleteArtwork(artworkId);
          
          return new Response(JSON.stringify({
            success: deleted,
            message: deleted ? "Artwork deleted successfully" : "Artwork not found"
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to delete artwork"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // Update artwork (admin)
      if (url.pathname.startsWith("/api/admin/artworks/") && method === "PUT") {
        try {
          const artworkId = url.pathname.split('/').pop();
          if (!artworkId) {
            return new Response(JSON.stringify({
              success: false,
              error: "Artwork ID is required"
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          
          // Check if it's FormData or JSON
          const contentType = req.headers.get('content-type') || '';
          let updateData: any = {};
          
          if (contentType.includes('multipart/form-data')) {
            // Full artwork update from admin
            const formData = await req.formData();
            updateData = {
              title: formData.get('title') as string,
              artist_name: formData.get('artist_name') as string,
              category: formData.get('category') as string,
              medium: formData.get('medium') as string,
              style: formData.get('style') as string,
              description: formData.get('description') as string,
              year_created: parseInt(formData.get('year_created') as string),
              keywords: JSON.parse(formData.get('keywords') as string || '[]'),
              tags: JSON.parse(formData.get('tags') as string || '[]'),
              is_for_sale: formData.get('is_for_sale') === 'true',
              price_krw: formData.get('price_krw') ? parseInt(formData.get('price_krw') as string) : null,
              updated_at: new Date().toISOString()
            };
          } else {
            // JSON update from dashboard
            const body = await req.json();
            updateData = {
              title: body.title,
              artist: body.artist_name,
              description: body.description,
              image_url: body.image_url,
              style: body.category,
              medium: body.medium,
              year: body.year,
              status: body.status,
              tags: body.tags,
              price: body.price,
              updated_at: new Date().toISOString()
            };
          }
          
          // Update artwork using artwork registry
          const { artworkRegistry } = await import('./backend/services/artwork-registry');
          const updated = artworkRegistry.updateArtwork(artworkId, updateData);
          
          if (updated) {
            const artwork = artworkRegistry.getArtwork(artworkId);
            return new Response(JSON.stringify({
              success: true,
              message: "Artwork updated successfully",
              artwork
            }), {
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          } else {
            return new Response(JSON.stringify({
              success: false,
              error: "Artwork not found"
            }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
        } catch (error) {
          serverLogger.error("Failed to update artwork:", error);
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to update artwork"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // Approve artwork
      if (url.pathname.match(/^\/api\/admin\/artworks\/[^\/]+\/approve$/) && method === "POST") {
        try {
          const pathParts = url.pathname.split('/');
          const artworkId = pathParts[pathParts.length - 2];
          
          if (!artworkId) {
            return new Response(JSON.stringify({
              success: false,
              error: "Artwork ID is required"
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          
          const { artworkRegistry } = await import('./backend/services/artwork-registry');
          const updated = artworkRegistry.updateArtworkStatus(artworkId, 'approved');
          
          if (updated) {
            const artwork = artworkRegistry.getArtwork(artworkId);
            return new Response(JSON.stringify({
              success: true,
              message: "Artwork approved successfully",
              artwork
            }), {
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          } else {
            return new Response(JSON.stringify({
              success: false,
              error: "Artwork not found"
            }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
        } catch (error) {
          serverLogger.error("Failed to approve artwork:", error);
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to approve artwork"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // Get matching artworks for recommendations
      if (url.pathname === "/api/artworks/recommendations" && method === "POST") {
        try {
          const body = await req.json();
          const { keywords } = body;
          
          if (!keywords || !Array.isArray(keywords)) {
            return new Response(JSON.stringify({
              success: false,
              error: "Keywords array is required"
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          
          const { artworkRegistry } = await import('./backend/services/artwork-registry');
          const matches = await artworkRegistry.getMatchingArtworks(keywords, 5);
          
          return new Response(JSON.stringify({
            success: true,
            recommendations: matches
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to get recommendations"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // ======================
      // AI ANALYSIS ENDPOINTS
      // ======================
      
      // Debug endpoint for analyze (GET)
      if (url.pathname === "/api/analyze" && method === "GET") {
        return new Response(JSON.stringify({
          message: "AI Analysis endpoint is active",
          method: "POST required",
          expected_body: "FormData with 'image' file",
          timestamp: new Date().toISOString()
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      if (url.pathname === "/api/analyze" && method === "POST") {
        try {
          if (process.env.NODE_ENV === "development") serverLogger.info('🔍 AI Analysis request received');
          
          const formData = await req.formData();
          const imageFile = formData.get("image") as File | null;
          const userId = formData.get("userId") as string | null;
          
          if (process.env.NODE_ENV === "development") serverLogger.info('📋 Request details:', {
            hasImageFile: !!imageFile,
            imageFileSize: imageFile?.size,
            userId: userId || 'anonymous'
          });
          
          if (!imageFile) {
            if (process.env.NODE_ENV === "development") serverLogger.info('❌ No image file provided');
            return new Response(JSON.stringify({
              success: false,
              error: "이미지 파일이 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          
          if (process.env.NODE_ENV === "development") serverLogger.info('🖼️ Processing image:', imageFile.name, `(${imageFile.size} bytes)`);
          
          const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
          const aiService = await getService('ai');
          if (!aiService) {
            throw new Error('AI 서비스가 초기화되지 않았습니다.');
          }
          const result = await aiService.analyzeImageAndRecommend(
            imageBuffer,
            userId || undefined,
            imageFile.name
          );
          
          if (process.env.NODE_ENV === "development") serverLogger.info('✅ Analysis completed successfully');
          
          return new Response(JSON.stringify({
            success: true,
            ...result
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          serverLogger.error('❌ AI Analysis error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "이미지 분석 중 오류가 발생했습니다.",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // ======================
      // MULTI-IMAGE ANALYSIS
      // ======================
      if (url.pathname === "/api/multi-analyze" && method === "POST") {
        try {
          const formData = await req.formData();
          const userId = formData.get("userId") as string | null;
          const language = formData.get("language") as string || "kr";
          
          // Collect all image files
          const imageFiles: File[] = [];
          for (const [key, value] of formData.entries()) {
            if (key.startsWith('image') && value instanceof File) {
              imageFiles.push(value);
            }
          }
        
        if (imageFiles.length === 0) {
          const errorMessage = language === "en" 
            ? "At least one image file is required."
            : "최소 1개 이상의 이미지 파일이 필요합니다.";
          return new Response(JSON.stringify({
            success: false,
            error: errorMessage
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        // Check payment for 4+ images
        if (imageFiles.length > 3) {
          const paymentToken = formData.get("paymentToken") as string | null;
          
          if (!paymentToken) {
            const errorMessage = language === "en"
              ? "Payment is required for analyzing 4 or more images."
              : "4장 이상의 이미지 분석을 위해서는 결제가 필요합니다.";
            return new Response(JSON.stringify({
              success: false,
              error: errorMessage,
              payment_required: true,
              image_count: imageFiles.length
            }), {
              status: 402,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
        }
        
        if (process.env.NODE_ENV === "development") serverLogger.info(`🔍 Analyzing ${imageFiles.length} images for user: ${userId || 'guest'}`);
        
        // Analyze each image
        const individualAnalyses = [];
        let totalProcessingTime = 0;
        
        for (let i = 0; i < imageFiles.length; i++) {
          const imageFile = imageFiles[i];
          if (process.env.NODE_ENV === "development") serverLogger.info(`📸 Processing image ${i + 1}/${imageFiles.length}: ${imageFile.name}`);
          
          try {
            const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
            if (process.env.NODE_ENV === "development") serverLogger.info(`🔍 Processing image ${i + 1} with direct color extraction...`);
            
            // Direct AI service calls for color extraction (bypass Ensemble)
            const startTime = Date.now();
            
            // Reuse service instances to avoid RESOURCE_EXHAUSTED
            if (!global.googleVisionInstance) {
              const { GoogleVisionService } = await import('./ai-service/integrations/google-vision');
              global.googleVisionInstance = new GoogleVisionService();
            }
            if (!global.clarifaiInstance) {
              const { ClarifaiService } = await import('./ai-service/integrations/clarifai');
              global.clarifaiInstance = new ClarifaiService();
            }
            
            const googleVision = global.googleVisionInstance;
            const clarifai = global.clarifaiInstance;
            
            // Extract colors directly
            const colors: string[] = [];
            const keywords: string[] = [];
            
            // Google Vision colors and keywords
            if (googleVision.isServiceEnabled()) {
              const gvResult = await googleVision.analyzeImage(imageBuffer);
              if (gvResult) {
                const gvColors = googleVision.extractColors(gvResult);
                const gvKeywords = googleVision.extractArtKeywords(gvResult);
                colors.push(...gvColors);
                keywords.push(...gvKeywords);
                if (process.env.NODE_ENV === "development") {
                  serverLogger.info(`🎨 Google Vision: ${gvColors.length} colors, ${gvKeywords.length} keywords`);
                }
              }
            }
            
            // Clarifai colors and keywords  
            if (clarifai.isServiceEnabled()) {
              const clarifaiResult = await clarifai.analyzeImage(imageBuffer);
              if (clarifaiResult) {
                const clarifaiColors = clarifai.extractColors(clarifaiResult);
                const clarifaiKeywords = clarifai.extractArtKeywords(clarifaiResult);
                colors.push(...clarifaiColors);
                keywords.push(...clarifaiKeywords);
                if (process.env.NODE_ENV === "development") {
                  serverLogger.info(`🎨 Clarifai: ${clarifaiColors.length} colors, ${clarifaiKeywords.length} keywords`);
                }
              }
            }
            
            const processingTime = Date.now() - startTime;
            
            // Create simple analysis result
            const analysis = {
              keywords: [...new Set(keywords)].slice(0, 20),
              colors: [...new Set(colors)].slice(0, 10),
              style: keywords.includes('portrait') ? 'portrait' : 
                     keywords.includes('landscape') ? 'landscape' : 
                     keywords.includes('abstract') ? 'abstract' : 'mixed',
              mood: keywords.includes('bright') ? 'bright' : 
                    keywords.includes('dark') ? 'dark' : 'neutral',
              confidence: colors.length > 0 ? 0.8 : 0.5
            };
            
            individualAnalyses.push({
              image_name: imageFile.name,
              image_size: imageFile.size,
              processing_time: processingTime,
              analysis
            });
            
            totalProcessingTime += processingTime;
          } catch (error) {
            serverLogger.error(`Failed to analyze ${imageFile.name}:`, error);
            individualAnalyses.push({
              image_name: imageFile.name,
              image_size: imageFile.size,
              error: error instanceof Error ? error.message : 'Unknown error',
              analysis: null
            });
          }
        }
        
        // Combine analyses to find common patterns
        serverLogger.info(`🔍 [DEBUG] Individual analyses completed. Total: ${individualAnalyses.length}`);
        individualAnalyses.forEach((item, index) => {
          serverLogger.info(`🔍 [DEBUG] Analysis ${index}: ${item.image_name}, analysis present: ${!!item.analysis}`);
        });
        
        const validAnalyses = individualAnalyses.filter(item => item.analysis);
        serverLogger.info(`🔍 Multi-image processing: ${individualAnalyses.length} total analyses, ${validAnalyses.length} valid analyses`);
        
        if (validAnalyses.length === 0) {
          const errorMessage = language === "en"
            ? "Image analysis failed."
            : "이미지 분석에 실패했습니다.";
          return new Response(JSON.stringify({
            success: false,
            error: errorMessage
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        // Enhanced pattern analysis with weighted scoring
        const allKeywords = validAnalyses.flatMap(item => item.analysis.keywords || []);
        const allColors = validAnalyses.flatMap(item => item.analysis.colors || []);
        const allStyles = validAnalyses.map(item => item.analysis.style).filter(Boolean);
        const allMoods = validAnalyses.map(item => item.analysis.mood).filter(Boolean);
        
        if (process.env.NODE_ENV === "development") {
          serverLogger.info('🎨 Individual image color analysis:');
          validAnalyses.forEach((item, index) => {
            const colors = item.analysis.colors || [];
            serverLogger.info(`  Image ${index + 1}: [${colors.join(', ')}] (${colors.length} colors)`);
          });
        }
        
        // Advanced keyword analysis with importance weighting
        const keywordAnalysis = new Map();
        validAnalyses.forEach((item, imageIndex) => {
          const keywords = item.analysis.keywords || [];
          const confidence = item.analysis.confidence || 0.5;
          
          keywords.forEach((keyword, position) => {
            if (!keywordAnalysis.has(keyword)) {
              keywordAnalysis.set(keyword, {
                count: 0,
                totalWeight: 0,
                confidence: 0,
                positions: [],
                images: new Set()
              });
            }
            
            const data = keywordAnalysis.get(keyword);
            // Higher weight for keywords that appear earlier (more important)
            const positionWeight = Math.max(0.1, 1 - (position / keywords.length));
            const weightedScore = confidence * positionWeight;
            
            data.count++;
            data.totalWeight += weightedScore;
            data.confidence += confidence;
            data.positions.push(position);
            data.images.add(imageIndex);
          });
        });
        
        // Advanced color analysis with frequency and consistency
        const colorAnalysis = new Map();
        validAnalyses.forEach((item, imageIndex) => {
          const colors = item.analysis.colors || [];
          const confidence = item.analysis.confidence || 0.5;
          
          colors.forEach((color, position) => {
            if (!colorAnalysis.has(color)) {
              colorAnalysis.set(color, {
                count: 0,
                totalWeight: 0,
                confidence: 0,
                images: new Set()
              });
            }
            
            const data = colorAnalysis.get(color);
            const positionWeight = Math.max(0.1, 1 - (position / colors.length));
            const weightedScore = confidence * positionWeight;
            
            data.count++;
            data.totalWeight += weightedScore;
            data.confidence += confidence;
            data.images.add(imageIndex);
          });
        });
        
        // Calculate style consistency
        const styleCounts = new Map();
        allStyles.forEach(style => {
          styleCounts.set(style, (styleCounts.get(style) || 0) + 1);
        });
        const dominantStyle = Array.from(styleCounts.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'mixed';
        
        const styleConsistency = styleCounts.size > 0 
          ? (styleCounts.get(dominantStyle) || 0) / validAnalyses.length 
          : 0;
        
        // Get sophisticated common patterns
        const totalImages = validAnalyses.length;
        const threshold = Math.max(2, Math.ceil(totalImages * 0.6)); // At least 60% of images
        
        if (process.env.NODE_ENV === "development") {
          serverLogger.info(`🔍 Keyword analysis: ${keywordAnalysis.size} total keywords found`);
          serverLogger.info(`📊 Threshold: 67% = ${Math.ceil(totalImages * 0.67)}, 60% = ${threshold}`);
        }
        
        // Truly common keywords (appearing in majority of images)
        const trulyCommonKeywords = Array.from(keywordAnalysis.entries())
          .filter(([keyword, data]) => data.images.size >= Math.max(2, Math.ceil(totalImages * 0.67)))
          .sort((a, b) => b[1].totalWeight - a[1].totalWeight)
          .slice(0, 10)
          .map(([keyword]) => keyword);
        
        // High-value frequent keywords (high weighted score)
        const frequentKeywords = Array.from(keywordAnalysis.entries())
          .filter(([keyword, data]) => data.images.size >= threshold && !trulyCommonKeywords.includes(keyword))
          .sort((a, b) => b[1].totalWeight - a[1].totalWeight)
          .slice(0, 15)
          .map(([keyword]) => keyword);
        
        // Truly common colors
        const trulyCommonColors = Array.from(colorAnalysis.entries())
          .filter(([color, data]) => data.images.size >= Math.max(2, Math.ceil(totalImages * 0.67)))
          .sort((a, b) => b[1].totalWeight - a[1].totalWeight)
          .slice(0, 5)
          .map(([color]) => color);
        
        // High-value frequent colors
        const frequentColors = Array.from(colorAnalysis.entries())
          .filter(([color, data]) => data.images.size >= threshold && !trulyCommonColors.includes(color))
          .sort((a, b) => b[1].totalWeight - a[1].totalWeight)
          .slice(0, 8)
          .map(([color]) => color);
        
        // Create final weighted keyword list
        const commonKeywords = [
          ...trulyCommonKeywords,
          ...frequentKeywords
        ].slice(0, 20);
        
        if (process.env.NODE_ENV === "development") {
          serverLogger.info(`✨ Results: ${trulyCommonKeywords.length} truly common, ${frequentKeywords.length} frequent`);
          serverLogger.info(`🎯 Final common keywords (${commonKeywords.length}): [${commonKeywords.join(', ')}]`);
        }
        
        // Create final weighted color list
        const commonColors = [
          ...trulyCommonColors,
          ...frequentColors
        ].slice(0, 10);
        
        if (process.env.NODE_ENV === "development") {
          serverLogger.info(`🌈 Color analysis: ${colorAnalysis.size} total colors found`);
          serverLogger.info(`🔍 Color results: ${trulyCommonColors.length} truly common, ${frequentColors.length} frequent`);
          serverLogger.info(`🎯 Final common colors (${commonColors.length}): [${commonColors.join(', ')}]`);
        }
        
        // Get dominant mood (style already calculated above)
        const moodCounts = new Map();
        allMoods.forEach(mood => {
          moodCounts.set(mood, (moodCounts.get(mood) || 0) + 1);
        });
        const dominantMood = Array.from(moodCounts.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
        
        // Calculate average confidence
        const avgConfidence = validAnalyses.length > 0 
          ? validAnalyses.reduce((sum, item) => 
              sum + (item.analysis.confidence || 0.5), 0) / validAnalyses.length
          : 0.5;
        
        // Enhanced similarity analysis between images
        const similarities = [];
        if (validAnalyses.length > 1) {
          for (let i = 0; i < validAnalyses.length; i++) {
            for (let j = i + 1; j < validAnalyses.length; j++) {
              const analysis1 = validAnalyses[i].analysis;
              const analysis2 = validAnalyses[j].analysis;
              
              // Calculate keyword similarity
              const keywords1 = new Set(analysis1.keywords || []);
              const keywords2 = new Set(analysis2.keywords || []);
              const keywordIntersection = new Set([...keywords1].filter(k => keywords2.has(k)));
              const keywordUnion = new Set([...keywords1, ...keywords2]);
              const keywordSimilarity = keywordUnion.size > 0 ? keywordIntersection.size / keywordUnion.size : 0;
              
              // Calculate color similarity
              const colors1 = new Set(analysis1.colors || []);
              const colors2 = new Set(analysis2.colors || []);
              const colorIntersection = new Set([...colors1].filter(c => colors2.has(c)));
              const colorUnion = new Set([...colors1, ...colors2]);
              const colorSimilarity = colorUnion.size > 0 ? colorIntersection.size / colorUnion.size : 0;
              
              // Calculate style similarity
              const styleSimilarity = analysis1.style === analysis2.style ? 1 : 0;
              
              // Overall similarity with weights
              const overallSimilarity = (
                keywordSimilarity * 0.5 + 
                colorSimilarity * 0.3 + 
                styleSimilarity * 0.2
              );
              
              similarities.push({
                image1: validAnalyses[i].image_name,
                image2: validAnalyses[j].image_name,
                similarity: overallSimilarity,
                title: `${validAnalyses[i].image_name} ↔ ${validAnalyses[j].image_name}`
              });
            }
          }
        }
        
        // Sort similarities and get top matches
        const topMatches = similarities
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5)
          .map(match => ({
            title: match.title,
            similarity: `${Math.round(match.similarity * 100)}%`
          }));
        
        const averageSimilarity = similarities.length > 0 
          ? similarities.reduce((sum, match) => sum + match.similarity, 0) / similarities.length 
          : 0;
        
        // Enhanced recommendations based on weighted patterns
        let recommendations = [];
        serverLogger.info(`📊 Multi-image analysis: ${validAnalyses.length} images, ${commonKeywords.length} common keywords: [${commonKeywords.slice(0, 5).join(', ')}]`);
        
        if (commonKeywords.length >= 1) { // Even lower threshold - single keyword
          try {
            // 🎯 FIRST PRIORITY: Check registered artworks from admin dashboard
            let registeredMatches = [];
            try {
              const { artworkRegistry } = await import('./backend/services/artwork-registry');
              const combinedKeywords = [...commonKeywords, ...commonColors];
              serverLogger.info(`🎨 [Multiple Upload] Checking registered artworks with keywords: [${combinedKeywords.join(', ')}]`);
              
              const matches = await artworkRegistry.getMatchingArtworks(combinedKeywords, 5);
              
              registeredMatches = matches.map(artwork => ({
                artwork: {
                  id: artwork.id,
                  title: artwork.title,
                  artist: artwork.artist,
                  image_url: artwork.image_url,
                  thumbnail_url: artwork.image_url,
                  description: artwork.description || '',
                  keywords: artwork.keywords,
                  colors: artwork.colors,
                  style: artwork.style,
                  year: artwork.year,
                  medium: artwork.medium,
                  platform: 'Admin Dashboard',
                  source: 'Registered Artwork',
                  search_source: 'internal'
                },
                similarity: artwork.match_score || 0,
                reasoning: [
                  language === 'en' ? `🌟 Curated artwork from admin dashboard` : `🌟 관리자 대시보드의 선별된 작품`,
                  language === 'en' ? `Matches: ${commonKeywords.slice(0, 3).join(', ')}` : `일치 항목: ${commonKeywords.slice(0, 3).join(', ')}`,
                  artwork.style ? (language === 'en' ? `Style: ${artwork.style}` : `스타일: ${artwork.style}`) : '',
                  language === 'en' ? `Artist: ${artwork.artist}` : `작가: ${artwork.artist}`
                ].filter(Boolean)
              }));
              
              serverLogger.info(`✨ Found ${registeredMatches.length} registered artworks from admin dashboard`);
            } catch (error) {
              serverLogger.error('Failed to get registered artworks:', error);
            }

            // Add registered artworks first (highest priority)
            recommendations = [...registeredMatches];
            
            // Create a more sophisticated search query for external sources
            const primaryKeywords = commonKeywords.slice(0, 3);
            const styleKeywords = dominantStyle !== 'mixed' ? [dominantStyle] : [];
            const colorKeywords = commonColors.slice(0, 2);
            
            // Combine keywords with priorities
            const enhancedQuery = [
              ...primaryKeywords,
              ...styleKeywords,
              ...colorKeywords.map(color => `${color} color`)
            ].join(' ');
            
            serverLogger.info(`🔍 Enhanced multi-image search query: "${enhancedQuery}"`);
            const aiService = await getService('ai');
            if (!aiService) {
              throw new Error('AI 서비스가 초기화되지 않았습니다.');
            }
            const recommendResult = await aiService.getRecommendations(enhancedQuery, 15, language);
            const externalRecommendations = recommendResult.recommendations || [];
            
            // Add external recommendations after registered ones
            recommendations = [...recommendations, ...externalRecommendations];
            
            // Additional filtering based on style consistency
            if (styleConsistency > 0.7 && dominantStyle !== 'mixed') {
              recommendations = recommendations.filter(rec => {
                const artwork = rec.artwork;
                const artworkStyle = artwork.metadata?.style || artwork.style || '';
                return !artworkStyle || artworkStyle.toLowerCase().includes(dominantStyle.toLowerCase());
              });
            }
            
            serverLogger.info(`📊 Generated ${recommendations.length} enhanced recommendations for multi-image analysis`);
          } catch (error) {
            serverLogger.error('Failed to get enhanced recommendations:', error);
            // Fallback to simple query
            try {
              const fallbackQuery = commonKeywords.slice(0, 3).join(' ');
              const aiService = await getService('ai');
              if (!aiService) {
                throw new Error('AI 서비스가 초기화되지 않았습니다.');
              }
              const fallbackResult = await aiService.getRecommendations(fallbackQuery, 10, language);
              recommendations = fallbackResult.recommendations || [];
            } catch (fallbackError) {
              serverLogger.error('Fallback recommendation failed:', fallbackError);
            }
          }
        } else {
          // If no common keywords, use individual image keywords
          serverLogger.info('❓ No common keywords found, using individual image analysis');
          const allIndividualKeywords = validAnalyses.flatMap(item => item.analysis.keywords || []).slice(0, 10);
          
          if (allIndividualKeywords.length > 0) {
            try {
              const individualQuery = allIndividualKeywords.slice(0, 5).join(' ');
              serverLogger.info(`🔍 Individual keywords search query: "${individualQuery}"`);
              const aiService = await getService('ai');
              if (!aiService) {
                throw new Error('AI 서비스가 초기화되지 않았습니다.');
              }
              const individualResult = await aiService.getRecommendations(individualQuery, 12, language);
              recommendations = individualResult.recommendations || [];
              serverLogger.info(`📊 Generated ${recommendations.length} recommendations from individual keywords`);
            } catch (error) {
              serverLogger.error('Individual keywords recommendation failed:', error);
            }
          }
        }
        
        // Final recommendations summary
        serverLogger.info(`🎯 Final multi-image recommendations: ${recommendations.length} total`);
        if (recommendations.length > 0) {
          serverLogger.info(`📋 Sample recommendations: ${recommendations.slice(0, 3).map(r => r.artwork?.title || 'Unknown').join(', ')}`);
        } else {
          serverLogger.warn('⚠️ No recommendations generated for multi-image analysis');
        }
        
        // Store common analysis for later use
        global.lastCommonAnalysis = {
          common_keywords: commonKeywords,
          common_colors: commonColors,
          dominant_style: dominantStyle,
          dominant_mood: dominantMood
        };
        
          return new Response(JSON.stringify({
            success: true,
            total_images: imageFiles.length,
            analyzed_images: validAnalyses.length,
            total_processing_time: totalProcessingTime,
            processingTime: totalProcessingTime, // Frontend compatibility
            user_type: userId ? 'logged_in' : 'guest',
            individual_analyses: individualAnalyses.map(item => ({
              image_name: item.image_name,
              image_size: item.image_size,
            processing_time: item.processing_time,
            keywords: item.analysis?.keywords?.slice(0, 10),
            colors: item.analysis?.colors?.slice(0, 5),
            style: item.analysis?.style,
            mood: item.analysis?.mood
          })),
          combined_analysis: {
            common_keywords: commonKeywords,
            common_colors: commonColors,
            dominant_style: dominantStyle,
            dominant_mood: dominantMood,
            average_confidence: avgConfidence,
            style_consistency: styleConsistency,
            pattern_description: language === "en"
              ? `The common theme of the images is ${dominantStyle} style with ${dominantMood} atmosphere, primarily using ${commonColors.slice(0, 3).join(', ')} colors. Images show ${Math.round(styleConsistency * 100)}% style consistency.`
              : `이미지들의 공통 테마는 ${dominantMood} 분위기의 ${dominantStyle} 스타일이며, 주로 ${commonColors.slice(0, 3).join(', ')} 색상이 사용되었습니다. 이미지들의 스타일 일관성은 ${Math.round(styleConsistency * 100)}%입니다.`
          },
          // Frontend expects commonKeywords at root level
          commonKeywords: {
            keywords: commonKeywords,
            trulyCommon: trulyCommonKeywords,
            frequent: frequentKeywords.slice(0, 10),
            confidence: avgConfidence,
            totalSimilarityScore: Math.round(avgConfidence * 100),
            totalImages: totalImages
          },
          // Frontend expects commonColors at root level
          commonColors: {
            colors: commonColors,
            trulyCommon: trulyCommonColors,
            frequent: frequentColors.slice(0, 6),
            confidence: avgConfidence,
            totalColorScore: Math.round(avgConfidence * 100),
            totalImages: totalImages
          },
          // Enhanced similarity analysis
          similarityAnalysis: {
            averageSimilarity: averageSimilarity,
            topMatches: topMatches,
            totalComparisons: similarities.length,
            consistencyScore: Math.round((averageSimilarity + styleConsistency) / 2 * 100)
          },
          recommendations: {
            internal: recommendations.filter(r => r.artwork?.search_source === 'internal'), // Admin dashboard artworks
            external: recommendations.filter(r => r.artwork?.search_source !== 'internal') // External API artworks
          },
          // Debug info
          debug: process.env.NODE_ENV === 'development' ? {
            totalRecommendations: recommendations.length,
            hasRecommendations: recommendations.length > 0,
            sampleTitles: recommendations.slice(0, 3).map(r => r.artwork?.title || 'Unknown')
          } : undefined
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          serverLogger.error('❌ Multi-image analysis error:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            userId: userId || 'anonymous',
            imageCount: imageFiles?.length || 0
          });
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : (language === "en" ? 'An error occurred during multi-image analysis.' : '다중 이미지 분석 중 오류가 발생했습니다.'),
            debug: process.env.NODE_ENV === 'development' ? {
              errorType: error.constructor.name,
              stack: error instanceof Error ? error.stack : undefined
            } : undefined
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // ======================
      // STATIC FILES & FRONTEND
      // ======================
      
      // Favicon
      if (url.pathname === "/favicon.ico") {
        const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎨</text></svg>`;
        return new Response(svgFavicon, {
          headers: { "Content-Type": "image/svg+xml", ...corsHeaders }
        });
      }
      
      // Instagram API endpoints
      if (url.pathname.startsWith("/api/instagram/profile/") && method === "GET") {
        try {
          const username = url.pathname.split('/').pop() || '';
          const { instagramService } = await import('./backend/services/instagram-integration');
          const result = await instagramService.importAsArtworks(username);
          
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error) {
          serverLogger.error('Instagram API error:', error);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to fetch Instagram profile' 
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }
      
      if (url.pathname === "/api/instagram/import" && method === "POST") {
        try {
          const body = await req.json();
          const { username } = body;
          
          if (!username) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'Username is required' 
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          
          const { instagramService } = await import('./backend/services/instagram-integration');
          const result = await instagramService.importAsArtworks(username);
          
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error) {
          serverLogger.error('Instagram import error:', error);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to import Instagram posts' 
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }
      
      // Analyze page
      if (url.pathname === "/analyze" || url.pathname === "/analyze.html") {
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
                ...corsHeaders
              }
            });
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") serverLogger.info("Frontend index.html not found");
        }
      }
      
      // ======================
      // ARTWORK MANAGEMENT ENDPOINTS
      // ======================
      
      // 작품 등록 (예술가용)
      if (url.pathname === "/api/artwork/register" && method === "POST") {
        const artworkAPI = await getService('artwork');
        const response = await artworkAPI?.registerArtwork?.(req) || new Response('Service unavailable', { status: 503 });
        const responseBody = await response.text();
        
        return new Response(responseBody, {
          status: response.status,
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
        });
      }
      
      // 작품 승인 (관리자용)
      if (url.pathname === "/api/artwork/approve" && method === "POST") {
        const artworkAPI = await getService('artwork');
        const response = await artworkAPI?.approveArtwork?.(req) || new Response('Service unavailable', { status: 503 });
        const responseBody = await response.text();
        
        return new Response(responseBody, {
          status: response.status,
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
        });
      }
      
      // 작품 거부 (관리자용)
      if (url.pathname === "/api/artwork/reject" && method === "POST") {
        const artworkAPI = await getService('artwork');
        const response = await artworkAPI?.rejectArtwork?.(req) || new Response('Service unavailable', { status: 503 });
        const responseBody = await response.text();
        
        return new Response(responseBody, {
          status: response.status,
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
        });
      }
      
      // 승인된 작품 목록 (추천 시스템용)
      if (url.pathname === "/api/artwork/approved" && method === "GET") {
        const artworkAPI = await getService('artwork');
        const response = await artworkAPI?.getApprovedArtworks?.(req) || new Response('Service unavailable', { status: 503 });
        const responseBody = await response.text();
        
        return new Response(responseBody, {
          status: response.status,
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
        });
      }
      
      // 예술가의 작품 목록
      if (url.pathname === "/api/artwork/artist" && method === "GET") {
        const artworkAPI = await getService('artwork');
        const response = await artworkAPI?.getArtistArtworks?.(req) || new Response('Service unavailable', { status: 503 });
        const responseBody = await response.text();
        
        return new Response(responseBody, {
          status: response.status,
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
        });
      }
      
      // 작품 통계 (관리자용)
      if (url.pathname === "/api/artwork/stats" && method === "GET") {
        const artworkAPI = await getService('artwork');
        const response = await artworkAPI?.getArtworkStats?.(req) || new Response('Service unavailable', { status: 503 });
        const responseBody = await response.text();
        
        return new Response(responseBody, {
          status: response.status,
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
        });
      }
      
      // 작품 수정 (예술가용)
      if (url.pathname.startsWith("/api/artwork/") && method === "PUT") {
        const artworkId = url.pathname.split('/').pop();
        if (artworkId && artworkId !== 'artwork') {
          const artworkAPI = await getService('artwork');
          const response = await artworkAPI?.updateArtwork?.(req, artworkId) || new Response('Service unavailable', { status: 503 });
          const responseBody = await response.text();
          
          return new Response(responseBody, {
            status: response.status,
            headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
          });
        }
      }
      
      // 작품 삭제 (예술가용)
      if (url.pathname.startsWith("/api/artwork/") && method === "DELETE") {
        const artworkId = url.pathname.split('/').pop();
        if (artworkId && artworkId !== 'artwork') {
          const artworkAPI = await getService('artwork');
          const response = await artworkAPI?.deleteArtwork?.(req, artworkId) || new Response('Service unavailable', { status: 503 });
          const responseBody = await response.text();
          
          return new Response(responseBody, {
            status: response.status,
            headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
          });
        }
      }
      
      // 역할 기반 인증 엔드포인트
      if (url.pathname === "/api/user/role" && method === "GET") {
        const userId = url.searchParams.get('userId');
        if (!userId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'userId가 필요합니다.'
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        try {
          const userRole = await RoleAuthService.getUserRole(userId);
          const userProfile = await RoleAuthService.getUserProfile(userId);
          
          return new Response(JSON.stringify({
            success: true,
            role: userRole,
            profile: userProfile
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : '사용자 정보 조회 실패'
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }
      
      // Static file serving for frontend assets
      // 일반 사용자 접근 가능 페이지
      const publicPaths = ['/auth', '/profile', '/social', '/payment', '/artist-register', '/signup', '/admin', '/dashboard', '/artist-signup', '/instagram-import', '/terms-and-conditions', '/dashboard/artworksregister'];
      // 관리자 전용 페이지 (숨겨진 경로)
      const adminPaths = ['/system/admin-panel'];
      
      // 작품 등록 페이지
      if (url.pathname === '/dashboard/artworksregister') {
        try {
          const artworksRegisterPath = Bun.resolveSync('./frontend/artworksregister.html', process.cwd());
          const artworksRegisterFile = Bun.file(artworksRegisterPath);
          
          if (await artworksRegisterFile.exists()) {
            const content = await artworksRegisterFile.text();
            return new Response(content, {
              headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache',
                ...corsHeaders
              }
            });
          }
        } catch (error) {
          serverLogger.error('Failed to serve artworks register page:', error);
        }
      }
      
      // 대시보드는 React 앱으로 처리 (index.html 서빙)
      if (url.pathname === '/dashboard') {
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
          if (process.env.NODE_ENV === "development") serverLogger.info("Dashboard: index.html not found");
        }
      }
      
      // 일반 사용자 접근 가능한 페이지들
      const pathWithoutHtml = url.pathname.endsWith('.html') ? url.pathname.slice(0, -5) : url.pathname;
      if (publicPaths.includes(url.pathname) || publicPaths.includes(pathWithoutHtml)) {
        try {
          const htmlPath = Bun.resolveSync(`./frontend${url.pathname.endsWith('.html') ? url.pathname : url.pathname + '.html'}`, process.cwd());
          const htmlFile = Bun.file(htmlPath);
          
          if (await htmlFile.exists()) {
            const content = await htmlFile.text();
            return new Response(content, {
              headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache',
                ...corsHeaders
              }
            });
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") serverLogger.info(`Page ${url.pathname} not found`);
        }
      }

      // 관리자 전용 페이지 (인증 필요)
      if (adminPaths.includes(url.pathname)) {
        try {
          // Authorization 헤더 또는 쿼리 파라미터에서 토큰 확인
          const authHeader = req.headers.get('Authorization');
          const urlParams = new URLSearchParams(url.search);
          const token = authHeader?.replace('Bearer ', '') || urlParams.get('token');

          if (!token) {
            // Temporary bypass for testing React modules - REMOVE IN PRODUCTION
            serverLogger.info("🔓 Bypassing admin authentication for React testing");
            // Continue to serve the admin panel
          } else {
            // 토큰에서 사용자 역할 확인 (실제 구현에서는 JWT 검증 또는 DB 조회 필요)
            // 현재는 간단한 모의 구현
            const userRole = await getUserRoleFromToken(token);
            
            if (userRole !== 'admin') {
              return new Response(JSON.stringify({
                error: 'Forbidden',
                message: '관리자 권한이 필요합니다.'
              }), {
                status: 403,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
            }
          }

          // 관리자 대시보드 파일 서빙 (dashboard.html을 system/admin-panel로 매핑)
          const adminHtmlPath = Bun.resolveSync('./frontend/dashboard.html', process.cwd());
          const adminHtmlFile = Bun.file(adminHtmlPath);
          
          if (await adminHtmlFile.exists()) {
            const content = await adminHtmlFile.text();
            return new Response(content, {
              headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache',
                'X-Frame-Options': 'DENY', // 보안 강화
                'X-Content-Type-Options': 'nosniff',
                ...corsHeaders
              }
            });
          }
        } catch (error) {
          serverLogger.error('Admin page access error:', error);
          return new Response(JSON.stringify({
            error: 'Server Error',
            message: '관리자 페이지 접근 중 오류가 발생했습니다.'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }

      // Static file serving (CSS, JS, TSX, images, etc.)
      if (url.pathname.startsWith('/frontend/') || 
          url.pathname.endsWith('.css') || 
          url.pathname.endsWith('.js') || 
          url.pathname.endsWith('.tsx') ||
          url.pathname.endsWith('.jsx') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.jpg') ||
          url.pathname.endsWith('.svg')) {
        try {
          let filePath;
          if (url.pathname.startsWith('/frontend/')) {
            filePath = `.${url.pathname}`;
          } else {
            filePath = `./frontend${url.pathname}`;
          }
          
          if (process.env.NODE_ENV === "development") {
            serverLogger.info(`Attempting to serve static file: ${url.pathname} -> ${filePath}`);
          }
          
          const file = Bun.file(filePath);
          
          // Check if file exists
          const fileExists = await file.exists();
          
          if (fileExists) {
            // Determine content type
            let contentType = 'text/plain';
            if (url.pathname.endsWith('.css')) {
              contentType = 'text/css';
            } else if (url.pathname.endsWith('.js')) {
              contentType = 'application/javascript';
            } else if (url.pathname.endsWith('.tsx') || url.pathname.endsWith('.jsx')) {
              contentType = 'application/javascript';
              // For TypeScript files, we need to compile them
              try {
                const compiledJs = await Bun.build({
                  entrypoints: [filePath],
                  target: 'browser',
                  format: 'iife',  // Changed from 'esm' to 'iife' for self-contained bundle
                  minify: false,
                  splitting: false
                  // Removed external - bundle everything including React
                });
                
                if (compiledJs.success && compiledJs.outputs[0]) {
                  const jsContent = await compiledJs.outputs[0].text();
                  return new Response(jsContent, {
                    headers: {
                      'Content-Type': contentType,
                      'Cache-Control': 'no-cache',
                      ...corsHeaders
                    }
                  });
                } else {
                  if (process.env.NODE_ENV === "development") {
                    serverLogger.info(`TSX compilation failed for ${filePath}:`, compiledJs.logs);
                  }
                  // Fallback to raw file
                  return new Response(file, {
                    headers: {
                      'Content-Type': contentType,
                      'Cache-Control': 'no-cache',
                      ...corsHeaders
                    }
                  });
                }
              } catch (tsxError) {
                if (process.env.NODE_ENV === "development") {
                  serverLogger.info(`TSX processing error for ${filePath}:`, tsxError);
                }
                // Return raw file if compilation fails
                return new Response(file, {
                  headers: {
                    'Content-Type': 'text/plain',
                    'Cache-Control': 'no-cache',
                    ...corsHeaders
                  }
                });
              }
            } else if (url.pathname.endsWith('.png')) {
              contentType = 'image/png';
            } else if (url.pathname.endsWith('.jpg') || url.pathname.endsWith('.jpeg')) {
              contentType = 'image/jpeg';
            } else if (url.pathname.endsWith('.svg')) {
              contentType = 'image/svg+xml';
            }
            
            return new Response(file, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache',
                ...corsHeaders
              }
            });
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") serverLogger.info(`Static file serving error for ${url.pathname}:`, error);
        }
      }
      
      // 404 for unknown routes
      return new Response("Not Found", {
        status: 404,
        headers: { 'Content-Type': 'text/plain', ...corsHeaders }
      });
      
    } catch (error) {
      serverLogger.error('Server error:', error);
      return new Response(JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  },
});

// 관리자 인증 확인 함수
async function checkAdminAuth(req: Request): Promise<{ isAdmin: boolean; response?: Response }> {
  if (process.env.NODE_ENV === "development") serverLogger.info('🔍 Admin auth check');
  
  // Authorization header 체크
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    
    // 환경변수에서 관리자 토큰 확인
    const adminAuthCode = process.env.ADMIN_AUTH_CODE;
    if (token && token === adminAuthCode) {
      if (process.env.NODE_ENV === "development") serverLogger.info('✅ Admin access granted via token');
      return { isAdmin: true };
    }
  }
  
  // Cookie 체크 (fallback for frontend)
  const cookies = req.headers.get('Cookie');
  if (cookies) {
    const adminToken = cookies.split(';').find(c => c.trim().startsWith('admin-token='));
    if (adminToken) {
      const token = adminToken.split('=')[1];
      const adminAuthCode = process.env.ADMIN_AUTH_CODE;
      if (token && token === adminAuthCode) {
        if (process.env.NODE_ENV === "development") serverLogger.info('✅ Admin access granted via cookie');
        return { isAdmin: true };
      }
    }
  }
  
  if (process.env.NODE_ENV === "development") serverLogger.info('❌ Admin access denied - invalid or missing token');
  return {
    isAdmin: false,
    response: new Response(JSON.stringify({
      success: false,
      error: 'Admin access required'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  };
}

// 토큰에서 사용자 역할을 가져오는 헬퍼 함수
async function getUserRoleFromToken(token: string): Promise<string | null> {
  try {
    if (!supabase) {
      serverLogger.warn('Supabase not configured, using fallback authentication');
      return null;
    }

    // Supabase JWT 검증을 통한 사용자 인증
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      serverLogger.warn('Invalid token or user not found:', error?.message);
      return null;
    }

    // 사용자 프로필에서 역할 조회
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      serverLogger.warn('Failed to get user profile:', profileError.message);
      return 'user'; // 기본값
    }

    return profile?.role || 'user';
  } catch (error) {
    serverLogger.error('Token validation error:', error);
    return null;
  }
}

// Enhanced startup logging
if (process.env.NODE_ENV === "development") serverLogger.info(`
🎉 Art Recommendation SaaS Server Started!
🌐 Local URL: http://localhost:${server.port}
🌍 Production URL: https://art-recommendation-saas.onrender.com
❤️  Health Check: ${process.env.NODE_ENV === 'production' ? 'https://art-recommendation-saas.onrender.com' : 'http://localhost:' + server.port}/api/health
🔧 Environment: ${process.env.NODE_ENV || 'development'}
🚀 Runtime: Bun ${Bun.version}
📋 Features: AI Analysis, Authentication, Static Serving
⚡ Performance: Optimized and lightweight
🏠 Hostname: ${server.hostname}
🔌 Port: ${server.port}
`);

// Startup health check
setTimeout(async () => {
  try {
    const healthUrl = `http://localhost:${server.port}/api/health`;
    const response = await fetch(healthUrl);
    if (response.ok) {
      if (process.env.NODE_ENV === "development") serverLogger.info('✅ Server health check passed');
    } else {
      serverLogger.error('❌ Server health check failed:', response.status);
    }
  } catch (error) {
    serverLogger.error('❌ Server health check error:', error);
  }
}, 2000);