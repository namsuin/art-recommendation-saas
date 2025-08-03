import { testSupabaseConnection, supabase } from "./services/supabase";
import { AIAnalysisService } from "./services/ai-analysis";
import { AuthAPI } from "./api/auth";
import { MultiImageAPI } from "./api/multi-image";
import { AdminDashboardService } from "./services/admin-dashboard";
import { UserBehaviorAnalyticsService } from "./services/user-behavior-analytics";
import { ABTestFramework } from "./services/ab-test-framework";
import { performanceMonitor } from "./services/performance-monitor";
import { BusinessMetricsService } from "./services/business-metrics";
import { AIArtGeneratorService } from "./services/ai-art-generator";
import { AdvancedRecommendationService } from "./services/advanced-recommendation";
import { AICuratorChatbotService } from "./services/ai-curator-chatbot";
import { printEnvironmentStatus, validateEnvironment } from "./utils/env-validator";
import { serveIndexHTML } from "./routes/static";

// Initialize services
let aiService: AIAnalysisService | null = null;
let multiImageAPI: MultiImageAPI | null = null;
let adminDashboard: AdminDashboardService | null = null;
let behaviorAnalytics: UserBehaviorAnalyticsService | null = null;
let abTestFramework: ABTestFramework | null = null;
let businessMetrics: BusinessMetricsService | null = null;
let aiArtGenerator: AIArtGeneratorService | null = null;
let advancedRecommendation: AdvancedRecommendationService | null = null;
let aiCuratorChatbot: AICuratorChatbotService | null = null;

function getAIService(): AIAnalysisService {
  if (!aiService) {
    aiService = new AIAnalysisService();
  }
  return aiService;
}

function getMultiImageAPI(): MultiImageAPI {
  if (!multiImageAPI) {
    multiImageAPI = new MultiImageAPI();
  }
  return multiImageAPI;
}

function getAdminDashboard(): AdminDashboardService {
  if (!adminDashboard) {
    adminDashboard = new AdminDashboardService();
  }
  return adminDashboard;
}

function getBehaviorAnalytics(): UserBehaviorAnalyticsService {
  if (!behaviorAnalytics) {
    behaviorAnalytics = new UserBehaviorAnalyticsService();
  }
  return behaviorAnalytics;
}

function getABTestFramework(): ABTestFramework {
  if (!abTestFramework) {
    abTestFramework = new ABTestFramework();
  }
  return abTestFramework;
}

function getBusinessMetrics(): BusinessMetricsService {
  if (!businessMetrics) {
    businessMetrics = new BusinessMetricsService();
  }
  return businessMetrics;
}

function getAIArtGenerator(): AIArtGeneratorService {
  if (!aiArtGenerator) {
    aiArtGenerator = new AIArtGeneratorService();
  }
  return aiArtGenerator;
}

function getAdvancedRecommendation(): AdvancedRecommendationService {
  if (!advancedRecommendation) {
    advancedRecommendation = new AdvancedRecommendationService();
  }
  return advancedRecommendation;
}

function getAICuratorChatbot(): AICuratorChatbotService {
  if (!aiCuratorChatbot) {
    aiCuratorChatbot = new AICuratorChatbotService();
  }
  return aiCuratorChatbot;
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
  port: parseInt(process.env.PORT || '3001'),
  
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;
    
    // Add CORS headers
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 200, headers });
    }
    
    try {
      // Root path - serve frontend HTML
      if (url.pathname === "/" && method === "GET") {
        const response = await serveIndexHTML();
        // Add CORS headers to HTML response
        for (const [key, value] of headers.entries()) {
          response.headers.set(key, value);
        }
        return response;
      }
      
      // Admin dashboard path
      if (url.pathname === "/admin" && method === "GET") {
        try {
          const adminHtmlPath = Bun.resolveSync('./frontend/admin-dashboard.html', process.cwd());
          const adminHtml = await Bun.file(adminHtmlPath).text();
          
          const response = new Response(adminHtml, {
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'no-cache',
              ...Object.fromEntries(headers.entries())
            }
          });
          return response;
        } catch (error) {
          console.error('Failed to serve admin dashboard:', error);
          return new Response('Admin dashboard not found', { 
            status: 404,
            headers: Object.fromEntries(headers.entries())
          });
        }
      }
      
      // Test API page
      if (url.pathname === "/test-api" && method === "GET") {
        try {
          const testHtmlPath = Bun.resolveSync('./test-api.html', process.cwd());
          const testHtml = await Bun.file(testHtmlPath).text();
          
          const response = new Response(testHtml, {
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'no-cache',
              ...Object.fromEntries(headers.entries())
            }
          });
          return response;
        } catch (error) {
          console.error('Failed to serve test page:', error);
          return new Response('Test page not found', { 
            status: 404,
            headers: Object.fromEntries(headers.entries())
          });
        }
      }
      
      // Social page
      if (url.pathname === "/social" && method === "GET") {
        try {
          const socialHtmlPath = Bun.resolveSync('./frontend/social.html', process.cwd());
          const socialHtml = await Bun.file(socialHtmlPath).text();
          
          const response = new Response(socialHtml, {
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'no-cache',
              ...Object.fromEntries(headers.entries())
            }
          });
          return response;
        } catch (error) {
          console.error('Failed to serve social page:', error);
          return new Response('Social page not found', { 
            status: 404,
            headers: Object.fromEntries(headers.entries())
          });
        }
      }
      
      // Test social page
      if (url.pathname === "/test-social" && method === "GET") {
        try {
          const testSocialHtmlPath = Bun.resolveSync('./test-social.html', process.cwd());
          const testSocialHtml = await Bun.file(testSocialHtmlPath).text();
          
          const response = new Response(testSocialHtml, {
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'no-cache',
              ...Object.fromEntries(headers.entries())
            }
          });
          return response;
        } catch (error) {
          console.error('Failed to serve test social page:', error);
          return new Response('Test social page not found', { 
            status: 404,
            headers: Object.fromEntries(headers.entries())
          });
        }
      }
      
      // Health check
      if (url.pathname === "/api/health" && method === "GET") {
        const supabaseHealthy = await testSupabaseConnection();
        let aiStatus = null;
        
        try {
          aiStatus = await getAIService().getServiceStatus();
        } catch (aiError) {
          console.warn("AI service status check failed:", aiError);
          aiStatus = { error: "AI service initialization failed" };
        }
        
        const response = new Response(JSON.stringify({ 
          status: "healthy", 
          timestamp: Date.now(),
          services: {
            supabase: supabaseHealthy ? "connected" : "disconnected",
            ai_services: aiStatus
          }
        }), {
          headers: { 
            "Content-Type": "application/json",
            ...Object.fromEntries(headers.entries())
          }
        });
        return response;
      }
      
      // Auth endpoints
      if (url.pathname === "/api/auth/signup" && method === "POST") {
        const { email, password, displayName } = await req.json();
        
        if (!email || !password) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "이메일과 비밀번호가 필요합니다." 
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await AuthAPI.signUp(email, password, displayName);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/auth/signin" && method === "POST") {
        const { email, password } = await req.json();
        
        if (!email || !password) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "이메일과 비밀번호가 필요합니다." 
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await AuthAPI.signIn(email, password);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/auth/signout" && method === "POST") {
        const result = await AuthAPI.signOut();
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/auth/user" && method === "GET") {
        try {
          // 요청에서 Authorization 헤더나 쿠키에서 세션 토큰 추출
          const authorization = req.headers.get('authorization');
          const cookie = req.headers.get('cookie');
          
          console.log('🔍 Auth 요청 확인:');
          console.log('  - Authorization 헤더:', authorization ? 'present' : 'none');
          console.log('  - Cookie:', cookie ? 'present' : 'none');
          
          let accessToken = null;
          
          // Authorization 헤더에서 토큰 추출
          if (authorization && authorization.startsWith('Bearer ')) {
            accessToken = authorization.slice(7);
          }
          
          // 쿠키에서 토큰 추출 (Supabase 기본 쿠키명 확인)
          if (!accessToken && cookie) {
            const cookies = cookie.split(';').reduce((acc, cookie) => {
              const [key, value] = cookie.trim().split('=');
              acc[key] = value;
              return acc;
            }, {} as Record<string, string>);
            
            // 일반적인 Supabase 세션 쿠키명들
            accessToken = cookies['sb-access-token'] || 
                         cookies['supabase.auth.token'] ||
                         cookies['sb-lzvfmnnshjrjugsrmswu-auth-token'];
          }
          
          if (!accessToken) {
            return new Response(JSON.stringify({
              success: false,
              error: '로그인이 필요합니다.'
            }), {
              status: 401,
              headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
            });
          }
          
          // 토큰으로 사용자 정보 조회
          const { supabaseAdmin } = await import('./services/supabase');
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
          
          if (error || !user) {
            console.log('❌ 토큰 검증 실패:', error);
            return new Response(JSON.stringify({
              success: false,
              error: '로그인이 필요합니다.'
            }), {
              status: 401,
              headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
            });
          }
          
          console.log('✅ 사용자 인증 성공:', user.email);
          
          return new Response(JSON.stringify({
            success: true,
            user: user
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
          
        } catch (error) {
          console.error('Auth user error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: '인증 확인 중 오류가 발생했습니다.'
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }
      }
      
      if (url.pathname === "/api/auth/upload-limit" && method === "GET") {
        const userId = url.searchParams.get('userId');
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            canUpload: false, 
            remainingUploads: 0,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await AuthAPI.checkUploadLimit(userId);
        
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // Multi-image analysis
      if (url.pathname === "/api/multi-image/analyze" && method === "POST") {
        try {
          const response = await getMultiImageAPI().analyzeMultipleImages(req);
          // Add CORS headers
          for (const [key, value] of headers.entries()) {
            response.headers.set(key, value);
          }
          return response;
        } catch (error) {
          console.error('Multi-image analysis error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: '다중 이미지 분석 중 오류가 발생했습니다.',
            details: error instanceof Error ? error.message : 'Unknown error'
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }
      }
      
      // Image analysis endpoint
      if (url.pathname === "/api/analyze" && method === "POST") {
        const formData = await req.formData();
        const imageFile = formData.get("image") as File;
        const userId = formData.get("userId") as string | null;
        
        if (!imageFile) {
          return new Response(JSON.stringify({ error: "No image provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        // Validate file type and size
        if (!imageFile.type.startsWith('image/')) {
          return new Response(JSON.stringify({ error: "Invalid file type. Please upload an image." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        if (imageFile.size > 10 * 1024 * 1024) { // 10MB limit
          return new Response(JSON.stringify({ error: "File too large. Maximum size is 10MB." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        console.log(`🔍 Analyzing image: ${imageFile.name} (${imageFile.size} bytes)`);

        // Convert file to buffer for AI analysis
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

        // Perform AI analysis and get recommendations
        const result = await getAIService().analyzeImageAndRecommend(
          imageBuffer,
          userId || undefined,
          undefined,
          10 // limit
        );

        return new Response(JSON.stringify({
          success: true,
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
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // Admin Dashboard endpoints
      if (url.pathname === "/api/admin/dashboard/stats" && method === "GET") {
        const userId = url.searchParams.get('userId');
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 인증이 필요합니다."
          }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        // 간단한 관리자 체크 (실제로는 더 엄격한 인증 필요)
        if (!userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getAdminDashboard().getDashboardStats();
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/admin/dashboard/users" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getAdminDashboard().getActiveUsers(limit);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/admin/dashboard/revenue" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const days = parseInt(url.searchParams.get('days') || '30');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getAdminDashboard().getRevenueMetrics(days);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // User Behavior Analytics endpoints
      if (url.pathname === "/api/analytics/user-journey" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const targetUserId = url.searchParams.get('targetUserId');
        const timeframe = parseInt(url.searchParams.get('timeframe') || '30');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getBehaviorAnalytics().analyzeUserJourney(targetUserId, timeframe);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/analytics/user-segments" && method === "GET") {
        const userId = url.searchParams.get('userId');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getBehaviorAnalytics().segmentUsers();
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/analytics/behavior-patterns" && method === "GET") {
        const userId = url.searchParams.get('userId');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getBehaviorAnalytics().analyzeBehaviorPatterns();
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/analytics/image-insights" && method === "GET") {
        const userId = url.searchParams.get('userId');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getBehaviorAnalytics().getImageAnalysisInsights();
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/analytics/recommendation-effectiveness" && method === "GET") {
        const userId = url.searchParams.get('userId');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getBehaviorAnalytics().analyzeRecommendationEffectiveness();
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // A/B Test Framework endpoints
      if (url.pathname === "/api/experiments" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const status = url.searchParams.get('status');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getABTestFramework().getExperiments(status, limit);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/experiments" && method === "POST") {
        const userId = url.searchParams.get('userId');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const experimentData = await req.json();
        const result = await getABTestFramework().createExperiment(experimentData);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 201 : 400,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname.startsWith("/api/experiments/") && url.pathname.endsWith("/results") && method === "GET") {
        const userId = url.searchParams.get('userId');
        const experimentId = url.pathname.split('/')[3];
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getABTestFramework().analyzeExperimentResults(experimentId);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname.startsWith("/api/experiments/") && url.pathname.endsWith("/status") && method === "PUT") {
        const userId = url.searchParams.get('userId');
        const experimentId = url.pathname.split('/')[3];
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { status: newStatus } = await req.json();
        const result = await getABTestFramework().updateExperimentStatus(experimentId, newStatus);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/experiments/assign" && method === "POST") {
        const { userId, experimentId, sessionData } = await req.json();
        
        if (!userId || !experimentId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID와 실험 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getABTestFramework().assignUserToExperiment(userId, experimentId, sessionData);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/experiments/convert" && method === "POST") {
        const { userId, experimentId, conversionValue, metadata } = await req.json();
        
        if (!userId || !experimentId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID와 실험 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getABTestFramework().recordConversion(userId, experimentId, conversionValue, metadata);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // Performance Monitoring endpoints
      if (url.pathname === "/api/performance/system-health" && method === "GET") {
        const userId = url.searchParams.get('userId');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await performanceMonitor.getSystemHealth();
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/performance/alerts" && method === "GET") {
        const userId = url.searchParams.get('userId');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await performanceMonitor.getActiveAlerts();
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/performance/recommendations" && method === "GET") {
        const userId = url.searchParams.get('userId');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await performanceMonitor.getOptimizationRecommendations();
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/performance/report" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const days = parseInt(url.searchParams.get('days') || '7');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await performanceMonitor.generatePerformanceReport(days);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/performance/metrics" && method === "POST") {
        const metricsData = await req.json();
        const result = await performanceMonitor.recordMetrics(metricsData);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // Business Metrics endpoints
      if (url.pathname === "/api/business/kpi" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getBusinessMetrics().getKPIMetrics(startDate, endDate);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/business/revenue-analysis" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const period = url.searchParams.get('period') as 'month' | 'quarter' | 'year' || 'month';
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getBusinessMetrics().getRevenueAnalysis(period);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/business/user-behavior" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const period = url.searchParams.get('period') || '30d';
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getBusinessMetrics().getUserBehaviorMetrics(period);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/business/goals" && method === "GET") {
        const userId = url.searchParams.get('userId');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getBusinessMetrics().getBusinessGoals();
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/business/alerts" && method === "GET") {
        const userId = url.searchParams.get('userId');
        
        if (!userId || !userId.includes('admin')) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "관리자 권한이 필요합니다."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getBusinessMetrics().getBusinessAlerts();
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // AI Art Generation endpoints
      if (url.pathname === "/api/ai-art/styles" && method === "GET") {
        const category = url.searchParams.get('category');
        const premiumUser = url.searchParams.get('premium') === 'true';
        
        const result = await getAIArtGenerator().getAvailableStyles(category, premiumUser);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/ai-art/style-transfer" && method === "POST") {
        const requestData = await req.json();
        const result = await getAIArtGenerator().performStyleTransfer(requestData);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/ai-art/text-to-image" && method === "POST") {
        const requestData = await req.json();
        const result = await getAIArtGenerator().generateFromText(requestData);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/ai-art/image-variations" && method === "POST") {
        const requestData = await req.json();
        const result = await getAIArtGenerator().generateImageVariations(requestData);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/ai-art/history" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const type = url.searchParams.get('type') as any;
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getAIArtGenerator().getUserGenerationHistory(userId, limit, type);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/ai-art/popular" && method === "GET") {
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const category = url.searchParams.get('category');
        
        const result = await getAIArtGenerator().getPopularGenerations(limit, category);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // Advanced Recommendation endpoints
      if (url.pathname === "/api/recommendations/personalized" && method === "POST") {
        const requestData = await req.json();
        const result = await getAdvancedRecommendation().generatePersonalizedRecommendations(requestData);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/recommendations/interaction" && method === "POST") {
        const interactionData = await req.json();
        const result = await getAdvancedRecommendation().recordInteraction(interactionData);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/recommendations/preferences" && method === "GET") {
        const userId = url.searchParams.get('userId');
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getAdvancedRecommendation().analyzeUserPreferences(userId);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/recommendations/cluster" && method === "GET") {
        const userId = url.searchParams.get('userId');
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getAdvancedRecommendation().getUserCluster(userId);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/recommendations/analytics" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const period = url.searchParams.get('period') || '30d';
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getAdvancedRecommendation().getRecommendationAnalytics(userId, period);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // AI Curator Chatbot endpoints
      if (url.pathname === "/api/ai-curator/chat" && method === "POST") {
        const requestData = await req.json();
        const { message, userId, context } = requestData;
        
        if (!message || typeof message !== 'string') {
          return new Response(JSON.stringify({ 
            success: false,
            error: "메시지가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getAICuratorChatbot().processChat({ message, userId, context });
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/ai-curator/history" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const result = await getAICuratorChatbot().getChatHistory(userId, limit);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // ================== 소셜 기능 API ==================
      
      // 프로필 관리
      if (url.pathname.startsWith("/api/social/profile/") && method === "GET") {
        const userId = url.pathname.split('/').pop();
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.getUserProfile(userId);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/social/profile/update" && method === "PUT") {
        const body = await req.json();
        const { userId, ...updates } = body;
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.updateUserProfile(userId, updates);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/social/users/search" && method === "GET") {
        const query = url.searchParams.get('q') || '';
        const limit = parseInt(url.searchParams.get('limit') || '20');
        
        if (!query) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "검색어가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.searchUsers(query, limit);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // 팔로우 시스템
      if (url.pathname === "/api/social/follow" && method === "POST") {
        const body = await req.json();
        const { followerId, followingId } = body;
        
        if (!followerId || !followingId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "팔로워 ID와 팔로잉 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.followUser(followerId, followingId);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/social/unfollow" && method === "POST") {
        const body = await req.json();
        const { followerId, followingId } = body;
        
        if (!followerId || !followingId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "팔로워 ID와 팔로잉 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.unfollowUser(followerId, followingId);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/social/follow-status" && method === "GET") {
        const followerId = url.searchParams.get('followerId');
        const followingId = url.searchParams.get('followingId');
        
        if (!followerId || !followingId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "팔로워 ID와 팔로잉 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.getFollowStatus(followerId, followingId);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname.startsWith("/api/social/followers/") && method === "GET") {
        const userId = url.pathname.split('/').pop();
        const limit = parseInt(url.searchParams.get('limit') || '50');
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.getFollowers(userId, limit);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname.startsWith("/api/social/following/") && method === "GET") {
        const userId = url.pathname.split('/').pop();
        const limit = parseInt(url.searchParams.get('limit') || '50');
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.getFollowing(userId, limit);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // 좋아요 시스템
      if (url.pathname === "/api/social/artwork/like" && method === "POST") {
        const body = await req.json();
        const { userId, artwork } = body;
        
        if (!userId || !artwork) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID와 작품 정보가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.likeArtwork(userId, artwork);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/social/artwork/unlike" && method === "POST") {
        const body = await req.json();
        const { userId, artworkId, sourcePlatform } = body;
        
        if (!userId || !artworkId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID와 작품 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.unlikeArtwork(userId, artworkId, sourcePlatform);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/social/artwork/like-status" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const artworkId = url.searchParams.get('artworkId');
        const sourcePlatform = url.searchParams.get('sourcePlatform') || 'local';
        
        if (!userId || !artworkId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID와 작품 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.getArtworkLikeStatus(userId, artworkId, sourcePlatform);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname.startsWith("/api/social/liked-artworks/") && method === "GET") {
        const userId = url.pathname.split('/').pop();
        const limit = parseInt(url.searchParams.get('limit') || '50');
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.getUserLikedArtworks(userId, limit);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // 커뮤니티 피드
      if (url.pathname === "/api/social/feed" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const limit = parseInt(url.searchParams.get('limit') || '20');

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.getFeedPosts(userId || undefined, limit);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/social/post/create" && method === "POST") {
        try {
          const text = await req.text();
          console.log('Request body text:', text);
          
          // JSON 파싱 시도
          let body;
          try {
            body = JSON.parse(text);
          } catch (parseError) {
            console.error('Initial JSON parse failed:', parseError);
            // 특수문자 이스케이프 문제 해결 시도
            const cleanedText = text
              .replace(/\\!/g, '!')  // \! -> !
              .replace(/\\'/g, "'")  // \' -> '
              .replace(/\\"/g, '"')  // \" -> " (이미 올바른 경우 제외)
              .replace(/\\\\/g, '\\'); // \\\\ -> \\
            
            try {
              body = JSON.parse(cleanedText);
              console.log('JSON parsing succeeded after cleaning');
            } catch (secondError) {
              console.error('JSON parsing failed even after cleaning:', secondError);
              return new Response(JSON.stringify({ 
                success: false,
                error: "잘못된 JSON 형식입니다."
              }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
              });
            }
          }

          const { userId, ...post } = body;
        
          if (!userId || !post.content) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID와 포스트 내용이 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
            });
          }

          const { SocialAPI } = await import('./api/social');
          const socialAPI = new SocialAPI();
          const result = await socialAPI.createPost(userId, post);
          
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 500,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        } catch (error) {
          console.error('Post create error:', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: "포스트 생성 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }
      }
      
      if (url.pathname === "/api/social/post/like" && method === "POST") {
        const body = await req.json();
        const { userId, postId } = body;
        
        if (!userId || !postId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID와 포스트 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.likePost(userId, postId);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/social/post/unlike" && method === "POST") {
        const body = await req.json();
        const { userId, postId } = body;
        
        if (!userId || !postId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID와 포스트 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.unlikePost(userId, postId);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // 댓글 시스템
      if (url.pathname === "/api/social/comment/create" && method === "POST") {
        const body = await req.json();
        const { userId, ...comment } = body;
        
        if (!userId || !comment.post_id || !comment.content) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID, 포스트 ID, 댓글 내용이 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.createComment(userId, comment);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname.startsWith("/api/social/comments/") && method === "GET") {
        const postId = url.pathname.split('/').pop();
        
        if (!postId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "포스트 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.getPostComments(postId);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // 알림 시스템
      if (url.pathname.startsWith("/api/social/notifications/") && method === "GET") {
        const userId = url.pathname.split('/').pop();
        const limit = parseInt(url.searchParams.get('limit') || '50');
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.getUserNotifications(userId, limit);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/social/notification/read" && method === "POST") {
        const body = await req.json();
        const { userId, notificationId } = body;
        
        if (!userId || !notificationId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID와 알림 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.markNotificationAsRead(userId, notificationId);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/social/notifications/read-all" && method === "POST") {
        const body = await req.json();
        const { userId } = body;
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.markAllNotificationsAsRead(userId);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      // User Profile endpoints
      if (url.pathname === "/api/profile/liked-artworks" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        const { SocialAPI } = await import('./api/social');
        const socialAPI = new SocialAPI();
        const result = await socialAPI.getUserLikedArtworks(userId, limit);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
        });
      }
      
      if (url.pathname === "/api/profile/upload-history" && method === "GET") {
        const userId = url.searchParams.get('userId');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        try {
          // Mock upload history for now since we don't store full upload data
          const mockHistory = [
            {
              id: '1',
              upload_date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
              keywords: ['landscape', 'nature', 'green'],
              recommendations_count: 5,
              style: 'impressionism'
            },
            {
              id: '2', 
              upload_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
              keywords: ['portrait', 'classical', 'oil painting'],
              recommendations_count: 8,
              style: 'renaissance'
            },
            {
              id: '3',
              upload_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), 
              keywords: ['abstract', 'modern', 'colorful'],
              recommendations_count: 6,
              style: 'abstract'
            }
          ];
          
          return new Response(JSON.stringify({
            success: true,
            history: mockHistory.slice(0, limit)
          }), {
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "업로드 히스토리를 가져오는데 실패했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }
      }
      
      if (url.pathname === "/api/profile/stats" && method === "GET") {
        const userId = url.searchParams.get('userId');
        
        if (!userId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "사용자 ID가 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }

        try {
          // Get liked artworks count
          const { SocialAPI } = await import('./api/social');
          const socialAPI = new SocialAPI();
          const likedResult = await socialAPI.getUserLikedArtworks(userId, 1000);
          
          const stats = {
            total_uploads: 3, // Mock value
            total_likes: likedResult.success ? likedResult.likedArtworks.length : 0,
            favorite_styles: ['impressionism', 'renaissance', 'abstract'],
            most_liked_keywords: ['landscape', 'portrait', 'nature', 'classical'],
            member_since: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
          };
          
          return new Response(JSON.stringify({
            success: true,
            stats
          }), {
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: "프로필 통계를 가져오는데 실패했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }
      }
      
      if (url.pathname === "/api/profile/update" && method === "POST") {
        console.log('🚀 프로필 업데이트 API 호출됨!');
        try {
          const formData = await req.formData();
          const userId = formData.get("userId") as string;
          const nickname = formData.get("nickname") as string;
          const displayName = formData.get("displayName") as string;
          const profileImageFile = formData.get("profileImage") as File;
          
          console.log('🔧 FormData 추출 결과:');
          console.log('  - userId:', userId);
          console.log('  - nickname:', nickname);
          console.log('  - displayName:', displayName);
          console.log('  - profileImageFile size:', profileImageFile?.size || 0);
          
          if (!userId) {
            return new Response(JSON.stringify({ 
              success: false,
              error: "사용자 ID가 필요합니다."
            }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
            });
          }

          let profileImageUrl = null;
          
          // Handle profile image upload
          if (profileImageFile && profileImageFile.size > 0) {
            if (!profileImageFile.type.startsWith('image/')) {
              return new Response(JSON.stringify({
                success: false,
                error: "프로필 이미지는 이미지 파일이어야 합니다."
              }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
              });
            }

            if (profileImageFile.size > 5 * 1024 * 1024) { // 5MB limit
              return new Response(JSON.stringify({
                success: false,
                error: "프로필 이미지는 5MB 이하여야 합니다."
              }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
              });
            }

            // Convert to base64 for now (in production, upload to cloud storage)
            const imageBuffer = await profileImageFile.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');
            profileImageUrl = `data:${profileImageFile.type};base64,${base64Image}`;
          }

          // Update user profile using Supabase admin
          try {
            const { supabaseAdmin } = await import('./services/supabase');
            console.log('🔧 Profile update - supabaseAdmin available:', !!supabaseAdmin);
            console.log('🔧 Profile update - userId:', userId);
            console.log('🔧 Profile update - nickname:', nickname);
            console.log('🔧 Profile update - displayName:', displayName);
            
            if (supabaseAdmin) {
              // Merge existing metadata with new data
              console.log('🔍 Fetching existing user data...');
              const existingUserData = await supabaseAdmin.auth.admin.getUserById(userId);
              console.log('🔍 Existing user data:', JSON.stringify(existingUserData.data?.user, null, 2));
              
              // user_metadata를 사용 (raw_user_meta_data는 읽기 전용)
              const existingMetadata = existingUserData.data?.user?.user_metadata || {};
              console.log('🔍 Existing user_metadata:', JSON.stringify(existingMetadata, null, 2));
              
              // 직접 업데이트 방식 사용 (필요한 기본 값들 포함)
              const newMetadata: any = {
                email: existingMetadata.email || existingUserData.data?.user?.email,
                email_verified: existingMetadata.email_verified || false,
                phone_verified: existingMetadata.phone_verified || false,
                sub: existingMetadata.sub || userId,
              };
              
              // 새로운 값들을 명시적으로 설정 (제공된 경우에만)
              console.log('🔍 조건 체크:');
              console.log('  - displayName 조건:', displayName !== undefined && displayName !== null && displayName.trim() !== '');
              console.log('  - nickname 조건:', nickname !== undefined && nickname !== null && nickname.trim() !== '');
              
              if (displayName !== undefined && displayName !== null && displayName.trim() !== '') {
                console.log('✅ displayName 업데이트:', displayName);
                newMetadata.display_name = displayName;
              } else {
                console.log('❌ displayName 유지:', existingMetadata.display_name);
                newMetadata.display_name = existingMetadata.display_name;
              }
              
              if (nickname !== undefined && nickname !== null && nickname.trim() !== '') {
                console.log('✅ nickname 업데이트:', nickname);
                newMetadata.nickname = nickname;
              } else {
                console.log('❌ nickname 유지:', existingMetadata.nickname);
                newMetadata.nickname = existingMetadata.nickname;
              }
              
              // 기존 timestamp 보존
              if (existingMetadata.test_timestamp) {
                newMetadata.test_timestamp = existingMetadata.test_timestamp;
              }
              
              // 프로필 이미지가 제공된 경우만 업데이트
              if (profileImageUrl) {
                newMetadata.profile_image_url = profileImageUrl;
              } else if (existingMetadata.profile_image_url) {
                newMetadata.profile_image_url = existingMetadata.profile_image_url;
              }
              
              const updateData: any = {
                user_metadata: newMetadata
              };

              console.log('⚡ Updating user profile with data:', JSON.stringify(updateData, null, 2));
              
              const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);
              
              if (error) {
                console.error('Failed to update user profile:', error);
                return new Response(JSON.stringify({
                  success: false,
                  error: `프로필 업데이트에 실패했습니다: ${error.message}`
                }), {
                  status: 500,
                  headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
                });
              }
              
              console.log('✅ Profile updated successfully!');
              console.log('📊 Updated user_metadata:', JSON.stringify(data.user?.user_metadata, null, 2));
              
              // 업데이트 후 재확인
              const { data: verifyData } = await supabaseAdmin.auth.admin.getUserById(userId);
              console.log('🔍 Verification - user_metadata:', JSON.stringify(verifyData.user?.user_metadata, null, 2));
            } else {
              console.warn('Supabase admin not available, profile update skipped');
            }
          } catch (updateError) {
            console.error('Profile update error:', updateError);
            return new Response(JSON.stringify({
              success: false,
              error: `프로필 업데이트 중 오류 발생: ${updateError.message}`
            }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            message: "프로필이 성공적으로 업데이트되었습니다.",
            profileImageUrl
          }), {
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        } catch (error) {
          console.error('Profile update error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: "프로필 업데이트 중 오류가 발생했습니다."
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
          });
        }
      }
      
      // Serve frontend files
      if (url.pathname === "/" || url.pathname === "/index.html") {
        return serveIndexHTML();
      }
      
      // Serve static files (HTML, CSS, JS, TS, TSX)
      if (url.pathname.endsWith('.html') || url.pathname.endsWith('.css') || 
          url.pathname.endsWith('.tsx') || url.pathname.endsWith('.ts') || 
          url.pathname.endsWith('.jsx') || url.pathname.endsWith('.js')) {
        try {
          const filePath = Bun.resolveSync('./frontend' + url.pathname, process.cwd());
          const file = Bun.file(filePath);
          
          if (await file.exists()) {
            const contentType = url.pathname.endsWith('.html') ? 'text/html' :
                              url.pathname.endsWith('.css') ? 'text/css' :
                              'application/javascript';
            
            return new Response(file, {
              headers: {
                'Content-Type': contentType,
                ...Object.fromEntries(headers.entries())
              }
            });
          }
        } catch (error) {
          console.error('Failed to serve file:', url.pathname, error);
        }
      }
      
      if (url.pathname === "/social" || url.pathname === "/social.html") {
        try {
          const socialHTML = await Bun.file("frontend/social.html").text();
          return new Response(socialHTML, {
            headers: { "Content-Type": "text/html", ...Object.fromEntries(headers.entries()) }
          });
        } catch (error) {
          console.error("Failed to serve social.html:", error);
          return new Response("Frontend file not found", { 
            status: 404,
            headers: Object.fromEntries(headers.entries())
          });
        }
      }
      
      if (url.pathname === "/profile" || url.pathname === "/profile.html") {
        try {
          const profileHTML = await Bun.file("frontend/profile.html").text();
          return new Response(profileHTML, {
            headers: { "Content-Type": "text/html", ...Object.fromEntries(headers.entries()) }
          });
        } catch (error) {
          console.error("Failed to serve profile.html:", error);
          return new Response("Frontend file not found", { 
            status: 404,
            headers: Object.fromEntries(headers.entries())
          });
        }
      }
      
      // 404 for all other routes
      return new Response("Not Found", { 
        status: 404,
        headers: Object.fromEntries(headers.entries())
      });
      
    } catch (error) {
      console.error("Server error:", error);
      return new Response(JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json", ...Object.fromEntries(headers.entries()) }
      });
    }
  },

  error(error) {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

console.log(`🚀 AI Art Recommendation Server running at http://localhost:${server.port}`);
console.log(`🎨 Frontend: http://localhost:${server.port}`);
console.log(`❤️  Health check: http://localhost:${server.port}/api/health`);
console.log(`🔐 Authentication: Login/Signup available`);