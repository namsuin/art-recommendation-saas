#!/usr/bin/env bun
/**
 * Art Recommendation SaaS - Simplified Server
 * AI 생성기 제거 버전
 */

// Initialize logging first
import { serverLogger } from "./shared/logger";

serverLogger.info("🎨 Starting Art Recommendation SaaS Server...");

// Environment validation
import { printEnvironmentStatus, validateEnvironment } from "./backend/utils/env-validator";

printEnvironmentStatus();
const envValidation = validateEnvironment();

if (!envValidation.isValid) {
  serverLogger.error('Critical environment configuration errors! Please check your .env file and fix the errors above.');
  process.exit(1);
}

// Core services
import { testSupabaseConnection, supabase } from "./backend/services/supabase";
import { AIAnalysisService } from "./backend/services/ai-analysis";
import { AuthAPI } from "./backend/api/auth";
import { ArtworkManagementAPI } from "./backend/api/artwork-management";
import { mockArtistApplications } from "./backend/services/mock-artist-applications";
import { mockDB } from "./backend/services/mock-database";
import { artsperArtworks, artsperSummary } from './backend/artsper-dashboard-data';

// Initialize services lazily
let aiService: AIAnalysisService | null = null;

function getAIService(): AIAnalysisService {
  if (!aiService) {
    aiService = new AIAnalysisService();
  }
  return aiService;
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
            supabase: await testSupabaseConnection(),
            ai: !!getAIService(),
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
      
      // ======================
      // AUTH ENDPOINTS
      // ======================
      const authAPI = new AuthAPI();
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
          const { data, error } = await mockArtistApplications.create({
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
          const applications = mockArtistApplications?.getAll ? 
            await mockArtistApplications.getAll() : 
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
          const { data: appData, error: appError } = await mockArtistApplications.updateStatus(
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
          // Parse query parameters for pagination
          const searchParams = new URL(url).searchParams;
          const page = parseInt(searchParams.get('page') || '1');
          const limit = parseInt(searchParams.get('limit') || '20');
          const offset = (page - 1) * limit;
          
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
            status: artwork.status,
            created_at: artwork.registration_date,
            available: true
          }));
          
          // Combine both sources
          const allArtworks = [...registryArtworks, ...artsperArtworksFormatted];
          
          // Apply pagination
          const paginatedArtworks = allArtworks.slice(offset, offset + limit);
          const totalPages = Math.ceil(allArtworks.length / limit);
          
          serverLogger.info(`Returning page ${page}/${totalPages} with ${paginatedArtworks.length} artworks (total: ${allArtworks.length})`);
          
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
          const result = await getAIService().analyzeImageAndRecommend(
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
          
          // Collect all image files
          const imageFiles: File[] = [];
          for (const [key, value] of formData.entries()) {
            if (key.startsWith('image') && value instanceof File) {
              imageFiles.push(value);
            }
          }
        
        if (imageFiles.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: "최소 1개 이상의 이미지 파일이 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        // Check payment for 4+ images
        if (imageFiles.length > 3) {
          const paymentToken = formData.get("paymentToken") as string | null;
          
          if (!paymentToken) {
            return new Response(JSON.stringify({
              success: false,
              error: "4장 이상의 이미지 분석을 위해서는 결제가 필요합니다.",
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
            const result = await getAIService().analyzeImageAndRecommend(
              imageBuffer,
              userId || undefined,
              undefined,
              0 // Don't get recommendations for individual images
            );
            
            individualAnalyses.push({
              image_name: imageFile.name,
              image_size: imageFile.size,
              processing_time: result.processingTime || 0,
              analysis: result.analysis
            });
            
            totalProcessingTime += result.processingTime || 0;
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
        const validAnalyses = individualAnalyses.filter(item => item.analysis);
        
        if (validAnalyses.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: "이미지 분석에 실패했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        // Extract common keywords, colors, styles, moods
        const allKeywords = validAnalyses.flatMap(item => item.analysis.keywords || []);
        const allColors = validAnalyses.flatMap(item => item.analysis.colors || []);
        const allStyles = validAnalyses.map(item => item.analysis.style).filter(Boolean);
        const allMoods = validAnalyses.map(item => item.analysis.mood).filter(Boolean);
        
        // Count frequency
        const keywordCounts = new Map();
        allKeywords.forEach(keyword => {
          keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
        });
        
        const colorCounts = new Map();
        allColors.forEach(color => {
          colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        });
        
        // Get truly common elements (appearing in all images)
        const totalImages = validAnalyses.length;
        const trulyCommonKeywords = Array.from(keywordCounts.entries())
          .filter(([keyword, count]) => count === totalImages)
          .map(([keyword]) => keyword);
        
        const trulyCommonColors = Array.from(colorCounts.entries())
          .filter(([color, count]) => count === totalImages)
          .map(([color]) => color);
        
        // Get most frequent elements (high frequency but not necessarily in all images)
        const frequentKeywords = Array.from(keywordCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([keyword]) => keyword);
        
        const frequentColors = Array.from(colorCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([color]) => color);
        
        // Combine truly common + frequent (prioritize truly common)
        const commonKeywords = [
          ...trulyCommonKeywords,
          ...frequentKeywords.filter(k => !trulyCommonKeywords.includes(k))
        ].slice(0, 20);
        
        const commonColors = [
          ...trulyCommonColors,
          ...frequentColors.filter(c => !trulyCommonColors.includes(c))
        ].slice(0, 10);
        
        // Get dominant style and mood
        const styleCounts = new Map();
        allStyles.forEach(style => {
          styleCounts.set(style, (styleCounts.get(style) || 0) + 1);
        });
        const dominantStyle = Array.from(styleCounts.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'mixed';
        
        const moodCounts = new Map();
        allMoods.forEach(mood => {
          moodCounts.set(mood, (moodCounts.get(mood) || 0) + 1);
        });
        const dominantMood = Array.from(moodCounts.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
        
        // Calculate average confidence
        const avgConfidence = validAnalyses.reduce((sum, item) => 
          sum + (item.analysis.confidence || 0), 0) / validAnalyses.length;
        
        // Get recommendations based on common patterns
        let recommendations = [];
        if (commonKeywords.length >= 3) {
          try {
            const searchQuery = commonKeywords.slice(0, 5).join(' ');
            const recommendResult = await getAIService().getRecommendations(searchQuery);
            recommendations = recommendResult.recommendations || [];
          } catch (error) {
            serverLogger.error('Failed to get recommendations:', error);
          }
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
            pattern_description: `이미지들의 공통 테마는 ${dominantMood} 분위기의 ${dominantStyle} 스타일이며, 주로 ${commonColors.slice(0, 3).join(', ')} 색상이 사용되었습니다.`
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
          recommendations: recommendations
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          serverLogger.error('Multi-image analysis error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : '다중 이미지 분석 중 오류가 발생했습니다.'
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
        const response = await ArtworkManagementAPI.registerArtwork(req);
        const responseBody = await response.text();
        
        return new Response(responseBody, {
          status: response.status,
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
        });
      }
      
      // 작품 승인 (관리자용)
      if (url.pathname === "/api/artwork/approve" && method === "POST") {
        const response = await ArtworkManagementAPI.approveArtwork(req);
        const responseBody = await response.text();
        
        return new Response(responseBody, {
          status: response.status,
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
        });
      }
      
      // 작품 거부 (관리자용)
      if (url.pathname === "/api/artwork/reject" && method === "POST") {
        const response = await ArtworkManagementAPI.rejectArtwork(req);
        const responseBody = await response.text();
        
        return new Response(responseBody, {
          status: response.status,
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
        });
      }
      
      // 승인된 작품 목록 (추천 시스템용)
      if (url.pathname === "/api/artwork/approved" && method === "GET") {
        const response = await ArtworkManagementAPI.getApprovedArtworks(req);
        const responseBody = await response.text();
        
        return new Response(responseBody, {
          status: response.status,
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
        });
      }
      
      // 예술가의 작품 목록
      if (url.pathname === "/api/artwork/artist" && method === "GET") {
        const response = await ArtworkManagementAPI.getArtistArtworks(req);
        const responseBody = await response.text();
        
        return new Response(responseBody, {
          status: response.status,
          headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
        });
      }
      
      // 작품 통계 (관리자용)
      if (url.pathname === "/api/artwork/stats" && method === "GET") {
        const response = await ArtworkManagementAPI.getArtworkStats(req);
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
          const response = await ArtworkManagementAPI.updateArtwork(req, artworkId);
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
          const response = await ArtworkManagementAPI.deleteArtwork(req, artworkId);
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