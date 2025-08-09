import { testSupabaseConnection, supabase } from "../services/supabase";
import { AIAnalysisService } from "../services/ai-analysis";
import { AuthAPI } from "../api/auth";
import { AnalyticsService } from "../services/analytics";
import { serveIndexHTML, serveStaticFile } from "./static";

export interface RouteHandler {
  (req: Request): Promise<Response>;
}

// AI 서비스 인스턴스 (지연 초기화)
let aiService: AIAnalysisService | null = null;

function getAIService(): AIAnalysisService {
  if (!aiService) {
    console.log('🔧 Creating new AI Analysis Service...');
    aiService = new AIAnalysisService();
    console.log('🎯 AI Analysis Service created successfully');
  }
  return aiService;
}

// 핵심 서비스 라우트 핸들러들
export const coreRoutes = new Map<string, RouteHandler>();

// 루트 경로 - HTML 서빙
coreRoutes.set("GET:/", async (req: Request) => {
  return serveIndexHTML();
});

// 정적 파일 서빙
coreRoutes.set("GET:/app.tsx", async (req: Request) => {
  return serveStaticFile('app.tsx');
});

// Health check
coreRoutes.set("GET:/api/health", async (req: Request) => {
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
});

// AI 테스트
coreRoutes.set("GET:/api/ai/test", async (req: Request) => {
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
});

// 이미지 분석
coreRoutes.set("POST:/api/analyze", async (req: Request) => {
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

    // 파일 검증
    if (!imageFile.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: "Invalid file type. Please upload an image." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (imageFile.size > 10 * 1024 * 1024) { // 10MB 제한
      return new Response(JSON.stringify({ error: "File too large. Maximum size is 10MB." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 업로드 제한 확인
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

    // AI 분석 수행
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const result = await getAIService().analyzeImageAndRecommend(
      imageBuffer,
      userId || undefined,
      tasteGroupId || undefined,
      10 // 제한
    );

    // 결과 저장 (사용자가 로그인한 경우)
    if (userId && uploadId) {
      const { supabase } = await import('../services/supabase');
      if (supabase) {
        // 분석 결과 업데이트
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

        // 추천 결과 저장
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

        // 사용량 기록
        await AuthAPI.incrementUploadCount(userId);
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
});

// 작품 목록 조회
coreRoutes.set("GET:/api/artworks", async (req: Request) => {
  try {
    const { data: artworks, error } = await supabase
      .from('artworks')
      .select('*')
      .eq('available', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Database error:', error);
      // 데이터베이스 오류 시 목 데이터 반환
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
});

// 정적 파일 패턴 매칭을 위한 헬퍼 함수
export function handleStaticFiles(pathname: string): Promise<Response> | null {
  if (pathname.startsWith("/components/")) {
    const filePath = pathname.substring(1);
    return serveStaticFile(filePath);
  }
  
  if (pathname.startsWith("/hooks/")) {
    const filePath = pathname.substring(1);
    return serveStaticFile(filePath);
  }
  
  if (pathname.startsWith("/styles/")) {
    const filePath = pathname.substring(1);
    return serveStaticFile(filePath);
  }
  
  if (pathname.startsWith("/dist/")) {
    const filePath = pathname.substring(1);
    return serveStaticFile(filePath);
  }
  
  return null;
}