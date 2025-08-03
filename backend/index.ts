import { testSupabaseConnection, supabase } from "./services/supabase";
import { AIAnalysisService } from "./services/ai-analysis";
import { AuthAPI } from "./api/auth";
import { AdminAPI } from "./api/admin";
import { PurchaseAPI } from "./api/purchase";
import { MultiImageAPI } from "./api/multi-image";
import { StripeService, SUBSCRIPTION_PLANS } from "./services/stripe";
import { AnalyticsService } from "./services/analytics";
import { RecommendationsV2API } from "./routes/recommendations-v2";
import { SocialFeaturesService } from "./services/social-features";
import { printEnvironmentStatus, validateEnvironment } from "./utils/env-validator";
import { serveIndexHTML, serveStaticFile } from "./routes/static";

interface WebSocketData {
  message: string;
  timestamp: number;
}

// Initialize AI Analysis Service (lazy initialization)
let aiService: AIAnalysisService | null = null;
let recommendationsV2API: RecommendationsV2API | null = null;
let socialFeaturesService: SocialFeaturesService | null = null;
let multiImageAPI: MultiImageAPI | null = null;

function getAIService(): AIAnalysisService {
  if (!aiService) {
    console.log('🔧 Creating new AI Analysis Service...');
    aiService = new AIAnalysisService();
    console.log('🎯 AI Analysis Service created successfully');
  }
  return aiService;
}

function getRecommendationsV2API(): RecommendationsV2API {
  if (!recommendationsV2API) {
    recommendationsV2API = new RecommendationsV2API();
  }
  return recommendationsV2API;
}

function getSocialFeaturesService(): SocialFeaturesService {
  if (!socialFeaturesService) {
    socialFeaturesService = new SocialFeaturesService();
  }
  return socialFeaturesService;
}

function getMultiImageAPI(): MultiImageAPI {
  if (!multiImageAPI) {
    multiImageAPI = new MultiImageAPI();
  }
  return multiImageAPI;
}

// Validate environment on startup
printEnvironmentStatus();
const envValidation = validateEnvironment();

if (!envValidation.isValid) {
  console.error('\n❌ Critical environment configuration errors detected!');
  console.error('Please check your .env file and fix the errors above.');
  process.exit(1);
}

const server = Bun.serve({
  port: 3000,
  hostname: "0.0.0.0",
  
  routes: {
    "/": {
      GET: () => serveIndexHTML()
    },
    
    // Static file serving
    "/app.tsx": {
      GET: () => serveStaticFile('app.tsx')
    },
    "/components/*": {
      GET: (req) => {
        const url = new URL(req.url);
        const filePath = url.pathname.substring(1); // Remove leading slash
        return serveStaticFile(filePath);
      }
    },
    "/hooks/*": {
      GET: (req) => {
        const url = new URL(req.url);
        const filePath = url.pathname.substring(1); // Remove leading slash
        return serveStaticFile(filePath);
      }
    },
    "/styles/*": {
      GET: (req) => {
        const url = new URL(req.url);
        const filePath = url.pathname.substring(1); // Remove leading slash
        return serveStaticFile(filePath);
      }
    },
    "/dist/*": {
      GET: (req) => {
        const url = new URL(req.url);
        const filePath = url.pathname.substring(1); // Remove leading slash
        return serveStaticFile(filePath);
      }
    },
    
    "/api/health": {
      GET: async () => {
        try {
          const supabaseHealthy = await testSupabaseConnection();
          let aiStatus = null;
          
          try {
            aiStatus = await getAIService().getServiceStatus();
          } catch (aiError) {
            console.warn("AI service status check failed:", aiError);
            aiStatus = { error: "AI service initialization failed" };
          }
          
          return new Response(JSON.stringify({ 
            status: "healthy", 
            timestamp: Date.now(),
            services: {
              supabase: supabaseHealthy ? "connected" : "disconnected",
              ai_services: aiStatus
            }
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error("Health check failed:", error);
          return new Response(JSON.stringify({
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: Date.now()
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/ai/test": {
      GET: async () => {
        try {
          const testResults = await getAIService().testServices();
          const serviceStatus = await getAIService().getServiceStatus();
          
          return new Response(JSON.stringify({
            status: "success",
            test_results: testResults,
            service_status: serviceStatus,
            timestamp: Date.now()
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: Date.now()
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/analyze": {
      POST: async (req) => {
        try {
          const formData = await req.formData();
          const imageFile = formData.get("image") as File;
          const userId = formData.get("userId") as string | null;
          const tasteGroupId = formData.get("tasteGroupId") as string | null;
          const uploadId = formData.get("uploadId") as string | null;
          
          if (!imageFile) {
            return new Response(JSON.stringify({ error: "No image provided" }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          // Validate file type and size
          if (!imageFile.type.startsWith('image/')) {
            return new Response(JSON.stringify({ error: "Invalid file type. Please upload an image." }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          if (imageFile.size > 10 * 1024 * 1024) { // 10MB limit
            return new Response(JSON.stringify({ error: "File too large. Maximum size is 10MB." }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          // 로그인한 사용자만 분석 가능 (선택적)
          if (userId) {
            const uploadLimit = await AuthAPI.checkUploadLimit(userId);
            if (!uploadLimit.canUpload) {
              return new Response(JSON.stringify({ 
                error: "일일 분석 제한에 도달했습니다.",
                resetTime: uploadLimit.resetTime
              }), {
                status: 429,
                headers: { "Content-Type": "application/json" }
              });
            }
          }

          console.log(`🔍 Analyzing image: ${imageFile.name} (${imageFile.size} bytes)`);

          // Convert file to buffer for AI analysis
          const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

          // Perform AI analysis and get recommendations
          const result = await getAIService().analyzeImageAndRecommend(
            imageBuffer,
            userId || undefined,
            tasteGroupId || undefined,
            10 // limit
          );

          // 분석 결과를 업로드 기록에 업데이트 (사용자가 로그인한 경우)
          if (userId && uploadId) {
            const { supabase } = await import('./services/supabase');
            if (supabase) {
              const { error: updateError } = await supabase
                .from('user_uploads')
                .update({
                  analysis_keywords: result.analysis.keywords,
                  analysis_embeddings: result.analysis.embeddings || null,
                })
                .eq('id', uploadId)
                .eq('user_id', userId);

              if (updateError) {
                console.error('Failed to update upload record:', updateError);
              }

              // 추천 결과도 저장
              if (result.recommendations.length > 0) {
                const recommendations = result.recommendations.map(rec => ({
                  user_id: userId,
                  upload_id: uploadId,
                  artwork_id: rec.id,
                  similarity_score: rec.similarity,
                  reasoning: rec.reasoning || []
                }));

                const { error: recError } = await supabase
                  .from('recommendations')
                  .insert(recommendations);

                if (recError) {
                  console.error('Failed to save recommendations:', recError);
                }
              }

              // 분석 카운트 증가
              await AuthAPI.incrementUploadCount(userId);
              
              // 사용량 분석 기록
              await AnalyticsService.recordUsage(userId, 'image_analysis');
              await AnalyticsService.recordUsage(userId, 'recommendation');
            }
          }

          return new Response(JSON.stringify({
            status: "success",
            image_size: imageFile.size,
            image_type: imageFile.type,
            processing_time: result.processingTime,
            recommendations: result.recommendations,
            analysis: {
              keywords: result.analysis.keywords,
              colors: result.analysis.colors,
              style: result.analysis.style,
              mood: result.analysis.mood,
              confidence: result.analysis.confidence
            }
          }), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error("❌ Analysis error:", error);
          return new Response(JSON.stringify({ 
            error: "Analysis failed",
            message: error instanceof Error ? error.message : "Unknown error",
            status: "error"
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/artworks": {
      GET: async () => {
        try {
          const { data: artworks, error } = await supabase
            .from('artworks')
            .select('*')
            .eq('available', true)
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) {
            console.error('Database error:', error);
            // Fallback to mock data if database is not ready
            const mockArtworks = [
              {
                id: "1",
                title: "모나리자",
                artist: "레오나르도 다 빈치",
                image_url: "https://via.placeholder.com/300x300?text=Mona+Lisa",
                keywords: ["portrait", "renaissance", "classical"],
                created_at: "2024-01-01T00:00:00Z"
              }
            ];
            return new Response(JSON.stringify({ artworks: mockArtworks }), {
              headers: { "Content-Type": "application/json" }
            });
          }

          return new Response(JSON.stringify({ artworks: artworks || [] }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Artworks API error:', error);
          return new Response(JSON.stringify({ 
            error: "Failed to fetch artworks",
            artworks: [] 
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/auth/signup": {
      POST: async (req) => {
        try {
          const { email, password, displayName } = await req.json();
          
          if (!email || !password) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: "이메일과 비밀번호가 필요합니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await AuthAPI.signUp(email, password, displayName);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Signup error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "회원가입 처리 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/auth/signin": {
      POST: async (req) => {
        try {
          const { email, password } = await req.json();
          
          if (!email || !password) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: "이메일과 비밀번호가 필요합니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await AuthAPI.signIn(email, password);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Signin error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "로그인 처리 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/auth/signout": {
      POST: async () => {
        try {
          const result = await AuthAPI.signOut();
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Signout error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "로그아웃 처리 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/auth/user": {
      GET: async () => {
        try {
          const result = await AuthAPI.getCurrentUser();
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 401,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Get user error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "사용자 정보 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/auth/profile": {
      PUT: async (req) => {
        try {
          const { userId, displayName, avatarUrl } = await req.json();
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: "사용자 ID가 필요합니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const updates: { display_name?: string; avatar_url?: string } = {};
          if (displayName) updates.display_name = displayName;
          if (avatarUrl) updates.avatar_url = avatarUrl;

          const result = await AuthAPI.updateProfile(userId, updates);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Update profile error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "프로필 업데이트 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/auth/upload-limit": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              canUpload: false, 
              remainingUploads: 0,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await AuthAPI.checkUploadLimit(userId);
          
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Upload limit check error:', error);
          return new Response(JSON.stringify({
            canUpload: true,
            remainingUploads: 10,
            error: "업로드 제한 확인 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/upload": {
      POST: async (req) => {
        try {
          const formData = await req.formData();
          const imageFile = formData.get("image") as File;
          const userId = formData.get("userId") as string;
          
          if (!imageFile || !userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "이미지 파일과 사용자 ID가 필요합니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          // 파일 유형 및 크기 검증
          if (!imageFile.type.startsWith('image/')) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "이미지 파일만 업로드 가능합니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          if (imageFile.size > 10 * 1024 * 1024) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "파일 크기는 10MB를 초과할 수 없습니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          // 업로드 제한 확인
          const uploadLimit = await AuthAPI.checkUploadLimit(userId);
          if (!uploadLimit.canUpload) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "일일 업로드 제한에 도달했습니다.",
              resetTime: uploadLimit.resetTime
            }), {
              status: 429,
              headers: { "Content-Type": "application/json" }
            });
          }

          // 파일 업로드 경로 생성
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

          // Supabase Storage에 업로드
          const { storage } = await import('../services/supabase');
          const uploadResult = await storage.uploadImage(imageFile, fileName);

          if (uploadResult.error) {
            console.error('Image upload failed:', uploadResult.error);
            return new Response(JSON.stringify({ 
              success: false,
              error: "이미지 업로드에 실패했습니다." 
            }), {
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }

          // 업로드된 이미지 URL 생성
          const imageUrl = storage.getImageUrl(fileName);

          // 사용자 업로드 기록 저장
          const { supabase } = await import('../services/supabase');
          if (supabase) {
            const { data: uploadRecord, error: dbError } = await supabase
              .from('user_uploads')
              .insert({
                user_id: userId,
                image_url: imageUrl,
                analysis_keywords: [], // AI 분석 후 업데이트됨
              })
              .select()
              .single();

            if (dbError) {
              console.error('Failed to save upload record:', dbError);
            }

            // 업로드 카운트 증가
            await AuthAPI.incrementUploadCount(userId);
          }

          return new Response(JSON.stringify({ 
            success: true,
            imageUrl,
            fileName,
            message: "이미지가 성공적으로 업로드되었습니다."
          }), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Upload error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "이미지 업로드 처리 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/uploads": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          const limit = parseInt(url.searchParams.get('limit') || '20');
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const { supabase } = await import('./services/supabase');
          if (!supabase) {
            return new Response(JSON.stringify({ 
              success: false,
              uploads: [],
              error: "데이터베이스가 구성되지 않았습니다."
            }), {
              headers: { "Content-Type": "application/json" }
            });
          }

          const { data: uploads, error } = await supabase
            .from('user_uploads')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

          if (error) {
            console.error('Failed to fetch uploads:', error);
            return new Response(JSON.stringify({ 
              success: false,
              uploads: [],
              error: "업로드 기록 조회에 실패했습니다."
            }), {
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }

          return new Response(JSON.stringify({ 
            success: true,
            uploads: uploads || []
          }), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Fetch uploads error:', error);
          return new Response(JSON.stringify({
            success: false,
            uploads: [],
            error: "업로드 기록 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/recommendations": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          const uploadId = url.searchParams.get('uploadId');
          const limit = parseInt(url.searchParams.get('limit') || '20');
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const { supabase } = await import('./services/supabase');
          if (!supabase) {
            return new Response(JSON.stringify({ 
              success: false,
              recommendations: [],
              error: "데이터베이스가 구성되지 않았습니다."
            }), {
              headers: { "Content-Type": "application/json" }
            });
          }

          // 추천 기록을 작품 정보와 함께 조회
          let query = supabase
            .from('recommendations')
            .select(`
              *,
              artworks (
                id,
                title,
                artist,
                image_url,
                thumbnail_url,
                description,
                keywords,
                price,
                available
              ),
              user_uploads (
                id,
                image_url,
                analysis_keywords,
                created_at
              )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

          // 특정 업로드에 대한 추천만 조회
          if (uploadId) {
            query = query.eq('upload_id', uploadId);
          }

          const { data: recommendations, error } = await query;

          if (error) {
            console.error('Failed to fetch recommendations:', error);
            return new Response(JSON.stringify({ 
              success: false,
              recommendations: [],
              error: "추천 기록 조회에 실패했습니다."
            }), {
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }

          return new Response(JSON.stringify({ 
            success: true,
            recommendations: recommendations || []
          }), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Fetch recommendations error:', error);
          return new Response(JSON.stringify({
            success: false,
            recommendations: [],
            error: "추천 기록 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/recommendations/click": {
      POST: async (req) => {
        try {
          const { recommendationId, userId } = await req.json();
          
          if (!recommendationId || !userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "추천 ID와 사용자 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const { supabase } = await import('./services/supabase');
          if (!supabase) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "데이터베이스가 구성되지 않았습니다."
            }), {
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }

          const { error } = await supabase
            .from('recommendations')
            .update({
              clicked: true,
              clicked_at: new Date().toISOString()
            })
            .eq('id', recommendationId)
            .eq('user_id', userId);

          if (error) {
            console.error('Failed to update recommendation click:', error);
            return new Response(JSON.stringify({ 
              success: false,
              error: "클릭 기록 업데이트에 실패했습니다."
            }), {
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }

          return new Response(JSON.stringify({ 
            success: true,
            message: "클릭 기록이 저장되었습니다."
          }), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Update recommendation click error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "클릭 기록 업데이트 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    // 고급 개인화 추천 API (V2)
    "/api/v2/recommendations": {
      POST: async (req) => {
        try {
          const request = await req.json();
          const result = await getRecommendationsV2API().getPersonalizedRecommendations(request);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('V2 Recommendations error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "개인화 추천 생성 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/v2/interactions": {
      POST: async (req) => {
        try {
          const { userId, artworkId, interactionType } = await req.json();
          
          if (!userId || !artworkId || !interactionType) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "필수 파라미터가 누락되었습니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await getRecommendationsV2API().recordInteraction(userId, artworkId, interactionType);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Record interaction error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "상호작용 기록 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/v2/recommendations/realtime": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          const currentRecs = url.searchParams.get('currentRecommendations')?.split(',') || [];
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await getRecommendationsV2API().getRealtimeRecommendationUpdates(userId, currentRecs);
          
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Realtime recommendations error:', error);
          return new Response(JSON.stringify({
            updated: false,
            error: "실시간 추천 업데이트 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/v2/analytics/recommendations": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          const period = parseInt(url.searchParams.get('period') || '30');
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await getRecommendationsV2API().getRecommendationAnalytics(userId, period);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Recommendation analytics error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "추천 분석 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    // 소셜 기능 API
    "/api/social/share": {
      POST: async (req) => {
        try {
          const { userId, artworkId, ...shareData } = await req.json();
          
          if (!userId || !artworkId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID와 작품 ID가 필요합니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await getSocialFeaturesService().shareArtwork(userId, artworkId, shareData);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Share artwork error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "작품 공유 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/social/review": {
      POST: async (req) => {
        try {
          const { userId, artworkId, ...reviewData } = await req.json();
          
          if (!userId || !artworkId || !reviewData.rating || !reviewData.title || !reviewData.content) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "필수 정보가 누락되었습니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await getSocialFeaturesService().createReview(userId, artworkId, reviewData);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Create review error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "리뷰 작성 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/social/follow": {
      POST: async (req) => {
        try {
          const { followerId, followingId } = await req.json();
          
          if (!followerId || !followingId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "팔로워 ID와 팔로잉 ID가 필요합니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await getSocialFeaturesService().followUser(followerId, followingId);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Follow user error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "팔로우 처리 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/social/interact": {
      POST: async (req) => {
        try {
          const { userId, targetType, targetId, interactionType, metadata } = await req.json();
          
          if (!userId || !targetType || !targetId || !interactionType) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "필수 파라미터가 누락되었습니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await getSocialFeaturesService().addInteraction(
            userId, targetType, targetId, interactionType, metadata
          );
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Add interaction error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "상호작용 처리 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/social/comment": {
      POST: async (req) => {
        try {
          const { userId, targetType, targetId, content, parentCommentId } = await req.json();
          
          if (!userId || !targetType || !targetId || !content) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "필수 정보가 누락되었습니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await getSocialFeaturesService().addComment(
            userId, targetType, targetId, content, parentCommentId
          );
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Add comment error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "댓글 작성 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/social/feed": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          const limit = parseInt(url.searchParams.get('limit') || '20');
          const offset = parseInt(url.searchParams.get('offset') || '0');
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await getSocialFeaturesService().getPersonalizedFeed(userId, limit, offset);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Get feed error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "피드 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/social/profile/:userId": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const targetUserId = req.params?.userId || url.pathname.split('/').pop();
          const requestingUserId = url.searchParams.get('requestingUserId');
          
          if (!targetUserId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다." 
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await getSocialFeaturesService().getUserSocialProfile(targetUserId, requestingUserId);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Get social profile error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "프로필 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/social/trending": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const period = url.searchParams.get('period') as 'day' | 'week' | 'month' || 'week';
          const limit = parseInt(url.searchParams.get('limit') || '20');

          const result = await getSocialFeaturesService().getTrendingContent(period, limit);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Get trending content error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "트렌딩 콘텐츠 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    // AI 성능 모니터링 API
    "/api/ai/performance": {
      GET: async () => {
        try {
          const metrics = getAIService().getPerformanceMetrics();
          return new Response(JSON.stringify({
            success: true,
            metrics
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Get performance metrics error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "성능 지표 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/ai/optimization/config": {
      PUT: async (req) => {
        try {
          const config = await req.json();
          getAIService().updateOptimizationConfig(config);
          
          return new Response(JSON.stringify({
            success: true,
            message: "최적화 설정이 업데이트되었습니다."
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Update optimization config error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "설정 업데이트 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/ai/cache/clear": {
      POST: async () => {
        try {
          getAIService().clearPerformanceCache();
          
          return new Response(JSON.stringify({
            success: true,
            message: "캐시가 성공적으로 삭제되었습니다."
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Clear cache error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "캐시 삭제 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/subscription/plans": {
      GET: async () => {
        try {
          return new Response(JSON.stringify({
            success: true,
            plans: SUBSCRIPTION_PLANS,
            stripeConfigured: StripeService.isConfigured(),
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error('Get plans error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "요금제 정보 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/subscription/create": {
      POST: async (req) => {
        try {
          const { userId, planId, paymentMethodId } = await req.json();
          
          if (!userId || !planId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID와 요금제가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          if (!StripeService.isConfigured()) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "결제 시스템이 구성되지 않았습니다."
            }), {
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }

          // 사용자 정보 조회
          const { data: user } = await supabase
            ?.from('users')
            .select('email, display_name')
            .eq('id', userId)
            .single() || { data: null };

          if (!user) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자를 찾을 수 없습니다."
            }), {
              status: 404,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await StripeService.createSubscription(
            userId, 
            user.email, 
            planId,
            paymentMethodId
          );

          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Create subscription error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "구독 생성 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/subscription/cancel": {
      POST: async (req) => {
        try {
          const { userId, subscriptionId } = await req.json();
          
          if (!userId || !subscriptionId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID와 구독 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await StripeService.cancelSubscription(userId, subscriptionId);

          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Cancel subscription error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "구독 취소 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/subscription/resume": {
      POST: async (req) => {
        try {
          const { userId, subscriptionId } = await req.json();
          
          if (!userId || !subscriptionId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID와 구독 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await StripeService.resumeSubscription(userId, subscriptionId);

          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Resume subscription error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "구독 재개 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/subscription/status": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await StripeService.getUserSubscription(userId);

          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Get subscription status error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "구독 상태 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/subscription/portal": {
      POST: async (req) => {
        try {
          const { userId, returnUrl } = await req.json();
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await StripeService.createPortalSession(
            userId, 
            returnUrl || `${req.headers.get('origin') || 'http://localhost:3000'}/profile`
          );

          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Create portal session error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "포털 세션 생성 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/webhook/stripe": {
      POST: async (req) => {
        try {
          const body = await req.text();
          const signature = req.headers.get('stripe-signature');
          
          if (!signature) {
            return new Response('Missing stripe-signature header', { status: 400 });
          }

          const result = await StripeService.handleWebhook(body, signature);

          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Stripe webhook error:', error);
          return new Response('Webhook processing failed', { status: 500 });
        }
      }
    },

    // Admin API endpoints
    "/api/admin/stats/users": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 401,
              headers: { "Content-Type": "application/json" }
            });
          }

          const isAdmin = await AdminAPI.isAdmin(userId);
          if (!isAdmin) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "관리자 권한이 필요합니다."
            }), {
              status: 403,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await AdminAPI.getUserStats();
          
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Get user stats error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "사용자 통계 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/admin/stats/usage": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 401,
              headers: { "Content-Type": "application/json" }
            });
          }

          const isAdmin = await AdminAPI.isAdmin(userId);
          if (!isAdmin) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "관리자 권한이 필요합니다."
            }), {
              status: 403,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await AdminAPI.getUsageStats();
          
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Get usage stats error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "사용량 통계 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/admin/activity": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 401,
              headers: { "Content-Type": "application/json" }
            });
          }

          const isAdmin = await AdminAPI.isAdmin(userId);
          if (!isAdmin) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "관리자 권한이 필요합니다."
            }), {
              status: 403,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await AdminAPI.getRecentActivity();
          
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Get recent activity error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "최근 활동 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/admin/artworks": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          const page = parseInt(url.searchParams.get('page') || '1');
          const limit = parseInt(url.searchParams.get('limit') || '20');
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 401,
              headers: { "Content-Type": "application/json" }
            });
          }

          const isAdmin = await AdminAPI.isAdmin(userId);
          if (!isAdmin) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "관리자 권한이 필요합니다."
            }), {
              status: 403,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await AdminAPI.getArtworks(page, limit);
          
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Get artworks error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "작품 목록 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      },

      POST: async (req) => {
        try {
          const { userId, ...artworkData } = await req.json();
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 401,
              headers: { "Content-Type": "application/json" }
            });
          }

          const isAdmin = await AdminAPI.isAdmin(userId);
          if (!isAdmin) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "관리자 권한이 필요합니다."
            }), {
              status: 403,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await AdminAPI.createArtwork({
            ...artworkData,
            admin_user_id: userId
          });
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Create artwork error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "작품 생성 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/admin/artworks/:id": {
      PUT: async (req) => {
        try {
          const url = new URL(req.url);
          const artworkId = url.pathname.split('/').pop();
          const { userId, ...updates } = await req.json();
          
          if (!userId || !artworkId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID와 작품 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const isAdmin = await AdminAPI.isAdmin(userId);
          if (!isAdmin) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "관리자 권한이 필요합니다."
            }), {
              status: 403,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await AdminAPI.updateArtwork(artworkId, updates);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Update artwork error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "작품 수정 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      },

      DELETE: async (req) => {
        try {
          const url = new URL(req.url);
          const artworkId = url.pathname.split('/').pop();
          const userId = url.searchParams.get('userId');
          
          if (!userId || !artworkId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID와 작품 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const isAdmin = await AdminAPI.isAdmin(userId);
          if (!isAdmin) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "관리자 권한이 필요합니다."
            }), {
              status: 403,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await AdminAPI.deleteArtwork(artworkId);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Delete artwork error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "작품 삭제 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    // Analytics API endpoints
    "/api/analytics/user": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          const days = parseInt(url.searchParams.get('days') || '30');
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await AnalyticsService.getUserUsageStats(userId, days);
          
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Get user analytics error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "사용자 분석 데이터 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/analytics/system": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          const days = parseInt(url.searchParams.get('days') || '30');
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 401,
              headers: { "Content-Type": "application/json" }
            });
          }

          const isAdmin = await AdminAPI.isAdmin(userId);
          if (!isAdmin) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "관리자 권한이 필요합니다."
            }), {
              status: 403,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await AnalyticsService.getSystemUsageStats(days);
          
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Get system analytics error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "시스템 분석 데이터 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/analytics/recommendations": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          const adminUserId = url.searchParams.get('adminUserId');
          
          // 관리자가 전체 추천 분석을 보려는 경우
          if (adminUserId) {
            const isAdmin = await AdminAPI.isAdmin(adminUserId);
            if (!isAdmin) {
              return new Response(JSON.stringify({ 
                success: false,
                error: "관리자 권한이 필요합니다."
              }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
              });
            }
          }

          const result = await AnalyticsService.getRecommendationAnalytics(adminUserId ? undefined : userId);
          
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Get recommendation analytics error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "추천 분석 데이터 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    // Purchase Request API endpoints
    "/api/purchase/request": {
      POST: async (req) => {
        try {
          const { artworkId, userId, contactInfo, urgency } = await req.json();
          
          if (!artworkId || !userId || !contactInfo) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "필수 정보가 누락되었습니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          if (!contactInfo.name || !contactInfo.phone) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "연락처 정보가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await PurchaseAPI.createPurchaseRequest(
            artworkId, 
            userId, 
            contactInfo, 
            urgency || 'medium'
          );
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Create purchase request error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "구매 요청 생성 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/purchase/requests": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await PurchaseAPI.getUserPurchaseRequests(userId);
          
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Get purchase requests error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "구매 요청 목록 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/purchase/requests/:id/cancel": {
      POST: async (req) => {
        try {
          const url = new URL(req.url);
          const requestId = url.pathname.split('/')[4]; // /api/purchase/requests/:id/cancel
          const { userId, reason } = await req.json();
          
          if (!requestId || !userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "필수 정보가 누락되었습니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await PurchaseAPI.cancelPurchaseRequest(requestId, userId, reason);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Cancel purchase request error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "구매 요청 취소 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    // Admin Purchase Management endpoints
    "/api/admin/purchase/requests": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          const page = parseInt(url.searchParams.get('page') || '1');
          const limit = parseInt(url.searchParams.get('limit') || '20');
          const status = url.searchParams.get('status') || undefined;
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 401,
              headers: { "Content-Type": "application/json" }
            });
          }

          const isAdmin = await AdminAPI.isAdmin(userId);
          if (!isAdmin) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "관리자 권한이 필요합니다."
            }), {
              status: 403,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await PurchaseAPI.getAllPurchaseRequests(page, limit, status);
          
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Get all purchase requests error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "구매 요청 목록 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/admin/purchase/requests/:id/status": {
      PUT: async (req) => {
        try {
          const url = new URL(req.url);
          const requestId = url.pathname.split('/')[5]; // /api/admin/purchase/requests/:id/status
          const { userId, status, adminNote, finalPrice } = await req.json();
          
          if (!requestId || !userId || !status) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "필수 정보가 누락되었습니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const isAdmin = await AdminAPI.isAdmin(userId);
          if (!isAdmin) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "관리자 권한이 필요합니다."
            }), {
              status: 403,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await PurchaseAPI.updatePurchaseRequestStatus(
            requestId,
            status,
            userId,
            adminNote,
            finalPrice
          );
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Update purchase request status error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "구매 요청 상태 업데이트 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    // Multi-Image Analysis API endpoints
    "/api/multi-image/analyze": {
      POST: async (req) => {
        return await getMultiImageAPI().analyzeMultipleImages(req);
      }
    },

    "/api/multi-image/history": {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const userId = url.searchParams.get('userId');
          const limit = parseInt(url.searchParams.get('limit') || '20');
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          return await getMultiImageAPI().getUserAnalysisHistory(userId, limit);

        } catch (error) {
          console.error('Get multi-image history error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "히스토리 조회 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/multi-image/payment-success": {
      POST: async (req) => {
        try {
          const { sessionId } = await req.json();
          
          if (!sessionId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "세션 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const result = await getMultiImageAPI().handlePaymentSuccess(sessionId);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { "Content-Type": "application/json" }
          });

        } catch (error) {
          console.error('Multi-image payment success error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "결제 처리 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    },

    "/api/search/external": {
      POST: async (req) => {
        return await getMultiImageAPI().searchExternalPlatforms(req);
      }
    }
  },

  // WebSocket 지원
  websocket: {
    open(ws) {
      console.log("WebSocket connection opened");
      ws.send(JSON.stringify({ 
        type: "connection", 
        message: "Connected to AI Art Recommendation service",
        timestamp: Date.now()
      }));
    },

    message(ws, message) {
      console.log("WebSocket message received:", message);
      
      try {
        const data = JSON.parse(message.toString()) as WebSocketData;
        
        // Echo back with timestamp
        ws.send(JSON.stringify({
          type: "echo",
          originalMessage: data.message,
          serverTimestamp: Date.now(),
          clientTimestamp: data.timestamp
        }));
      } catch (error) {
        ws.send(JSON.stringify({
          type: "error",
          message: "Invalid JSON format",
          timestamp: Date.now()
        }));
      }
    },

    close(ws, code, message) {
      console.log("WebSocket connection closed:", code, message);
    }
  },

  error(error) {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

console.log(`🚀 AI Art Recommendation Server running at http://localhost:${server.port}`);
console.log(`📱 WebSocket endpoint: ws://localhost:${server.port}`);
console.log(`🎨 Frontend: http://localhost:${server.port}`);
console.log(`❤️  Health check: http://localhost:${server.port}/api/health`);
console.log(`🔐 Authentication: Login/Signup available`);