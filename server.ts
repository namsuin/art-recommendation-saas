#!/usr/bin/env bun
/**
 * Art Recommendation SaaS - Simplified Server
 * AI 생성기 제거 버전
 */

console.log("🎨 Starting Art Recommendation SaaS Server...");

// Environment validation
import { printEnvironmentStatus, validateEnvironment } from "./backend/utils/env-validator";

printEnvironmentStatus();
const envValidation = validateEnvironment();

if (!envValidation.isValid) {
  console.error('\n❌ Critical environment configuration errors!');
  console.error('Please check your .env file and fix the errors above.');
  process.exit(1);
}

// Core services
import { testSupabaseConnection } from "./backend/services/supabase";
import { AIAnalysisService } from "./backend/services/ai-analysis";
import { AuthAPI } from "./backend/api/auth";
import { ArtworkManagementAPI } from "./backend/api/artwork-management";
import { RoleAuthService } from "./backend/services/role-auth";

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
    
    // Console logging for development
    console.log(`[${new Date().toISOString()}] ${method} ${url.pathname}`);
    
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
      
      // ======================
      // AUTH ENDPOINTS
      // ======================
      const authAPI = new AuthAPI();
      const authEndpoints = ['/api/auth/signup', '/api/auth/login', '/api/auth/logout', '/api/auth/check'];
      
      if (authEndpoints.includes(url.pathname)) {
        const result = await authAPI.handleRequest(req);
        
        // Add CORS headers to auth responses
        result.headers.append("Access-Control-Allow-Origin", "*");
        result.headers.append("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        result.headers.append("Access-Control-Allow-Headers", "Content-Type, Authorization");
        
        return result;
      }
      
      // ======================
      // AI ANALYSIS ENDPOINTS
      // ======================
      if (url.pathname === "/api/analyze" && method === "POST") {
        const formData = await req.formData();
        const imageFile = formData.get("image") as File | null;
        const userId = formData.get("userId") as string | null;
        
        if (!imageFile) {
          return new Response(JSON.stringify({
            success: false,
            error: "이미지 파일이 필요합니다."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        const result = await getAIService().analyzeImageAndRecommend(
          imageBuffer,
          userId || undefined,
          imageFile.name
        );
        
        return new Response(JSON.stringify({
          success: true,
          ...result
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
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
        
        console.log(`🔍 Analyzing ${imageFiles.length} images for user: ${userId || 'guest'}`);
        
        // Analyze each image
        const individualAnalyses = [];
        let totalProcessingTime = 0;
        
        for (let i = 0; i < imageFiles.length; i++) {
          const imageFile = imageFiles[i];
          console.log(`📸 Processing image ${i + 1}/${imageFiles.length}: ${imageFile.name}`);
          
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
            console.error(`Failed to analyze ${imageFile.name}:`, error);
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
        
        // Get most common elements
        const commonKeywords = Array.from(keywordCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([keyword]) => keyword);
        
        const commonColors = Array.from(colorCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([color]) => color);
        
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
            console.error('Failed to get recommendations:', error);
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
          recommendations: recommendations
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } catch (error) {
          console.error('Multi-image analysis error:', error);
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
          console.log("Analyze page not found");
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
          console.log("Frontend index.html not found");
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
      const publicPaths = ['/auth', '/profile', '/social', '/payment', '/artist-register', '/signup', '/admin-access'];
      // 관리자 전용 페이지 (숨겨진 경로)
      const adminPaths = ['/system/admin-panel'];
      // 일반 사용자 접근 가능한 페이지들
      if (publicPaths.includes(url.pathname)) {
        try {
          const htmlPath = Bun.resolveSync(`./frontend${url.pathname}.html`, process.cwd());
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
          console.log(`Page ${url.pathname} not found`);
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
            // 토큰이 없으면 관리자 접근 페이지로 리디렉션
            return new Response(null, {
              status: 302,
              headers: { 
                'Location': '/admin-access',
                ...corsHeaders 
              }
            });
          }

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

          // 관리자 대시보드 파일 서빙 (admin-dashboard.html을 system/admin-panel로 매핑)
          const adminHtmlPath = Bun.resolveSync('./frontend/admin-dashboard.html', process.cwd());
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
          console.error('Admin page access error:', error);
          return new Response(JSON.stringify({
            error: 'Server Error',
            message: '관리자 페이지 접근 중 오류가 발생했습니다.'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }
      
      // 404 for unknown routes
      return new Response("Not Found", {
        status: 404,
        headers: { 'Content-Type': 'text/plain', ...corsHeaders }
      });
      
    } catch (error) {
      console.error('Server error:', error);
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

// 토큰에서 사용자 역할을 가져오는 헬퍼 함수
async function getUserRoleFromToken(token: string): Promise<string | null> {
  try {
    // 실제 구현에서는 Supabase JWT 검증 또는 세션 확인
    // 현재는 간단한 토큰 기반 역할 확인
    if (token === 'admin-token-2025') {
      return 'admin';
    }
    
    // 실제로는 supabase.auth.getUser(token)으로 사용자 정보 확인
    // const { data: { user }, error } = await supabase.auth.getUser(token);
    // if (!error && user) {
    //   const { data: profile } = await supabase
    //     .from('users')
    //     .select('role')
    //     .eq('id', user.id)
    //     .single();
    //   return profile?.role || 'user';
    // }
    
    return null;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

console.log(`
🎉 Art Recommendation SaaS Server Started!
🌐 URL: http://localhost:${server.port}
❤️  Health: http://localhost:${server.port}/api/health
🔧 Status: Simplified version without AI generators
📋 Features: AI Analysis, Authentication, Static Serving
⚡ Performance: Optimized and lightweight
`);