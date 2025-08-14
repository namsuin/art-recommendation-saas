import { serverLogger } from '../../shared/logger';
import { AIAnalysisService } from '../services/ai-analysis';

export interface RouteHandler {
  (req: Request, corsHeaders: Record<string, string>): Promise<Response>;
}

export class AIAnalysisRoutes {
  private aiService: AIAnalysisService | null = null;

  private getAIService(): AIAnalysisService {
    if (!this.aiService) {
      this.aiService = new AIAnalysisService();
    }
    return this.aiService;
  }

  async handleAnalyzeDebug(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    return new Response(JSON.stringify({
      message: "AI Analysis endpoint is active",
      method: "POST required",
      expected_body: "FormData with 'image' file",
      timestamp: new Date().toISOString()
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  async handleAnalyze(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      if (process.env.NODE_ENV === "development") serverLogger.info('🔍 AI Analysis request received');
      
      const formData = await req.formData();
      const imageFile = formData.get("image") as File | null;

      if (!imageFile) {
        serverLogger.error('No image file provided');
        return new Response(JSON.stringify({
          error: "No image file provided",
          success: false
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      if (process.env.NODE_ENV === "development") serverLogger.info(`Image received: ${imageFile.name}, size: ${imageFile.size} bytes`);

      const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
      const analysis = await this.getAIService().analyzeImage(imageBuffer);

      if (process.env.NODE_ENV === "development") serverLogger.info('✅ Analysis completed:', analysis);

      // Get artwork recommendations based on analysis keywords
      const { artworkRegistry } = await import('../services/artwork-registry');
      const recommendations = await artworkRegistry.getMatchingArtworks(analysis.keywords, 6);

      return new Response(JSON.stringify({
        success: true,
        analysis,
        recommendations
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });

    } catch (error) {
      serverLogger.error('AI Analysis error:', error);
      return new Response(JSON.stringify({
        error: "Image analysis failed",
        details: error instanceof Error ? error.message : String(error),
        success: false
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }

  async handleMultiImageAnalyze(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      if (process.env.NODE_ENV === "development") serverLogger.info('🔍 Multi-image analysis request received');
      
      const formData = await req.formData();
      const files: File[] = [];
      
      // Extract all image files from FormData
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('image') && value instanceof File) {
          files.push(value);
        }
      }

      if (files.length === 0) {
        return new Response(JSON.stringify({
          error: "No image files provided",
          success: false
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      if (process.env.NODE_ENV === "development") {
        serverLogger.info(`Processing ${files.length} images for multi-image analysis`);
      }

      // Analyze each image
      const analyses = [];
      for (const file of files) {
        const imageBuffer = Buffer.from(await file.arrayBuffer());
        const analysis = await this.getAIService().analyzeImage(imageBuffer);
        analyses.push({
          filename: file.name,
          analysis
        });
      }

      // Find common keywords across all analyses
      const allKeywords = analyses.flatMap(a => a.analysis.keywords);
      const keywordCounts = {};
      
      for (const keyword of allKeywords) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }

      // Get common keywords (appearing in at least 2 images or if only 1 image, use all)
      const threshold = Math.max(1, Math.ceil(analyses.length / 2));
      const commonKeywords = Object.entries(keywordCounts)
        .filter(([, count]) => count >= threshold)
        .map(([keyword]) => keyword)
        .slice(0, 8); // Limit to top 8 keywords

      if (process.env.NODE_ENV === "development") {
        serverLogger.info('Common keywords found:', commonKeywords);
      }

      // Get artwork recommendations based on common keywords
      const { artworkRegistry } = await import('../services/artwork-registry');
      const recommendations = await artworkRegistry.getMatchingArtworks(commonKeywords, 8);

      return new Response(JSON.stringify({
        success: true,
        analyses,
        commonKeywords,
        recommendations
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });

    } catch (error) {
      serverLogger.error('Multi-image analysis error:', error);
      return new Response(JSON.stringify({
        error: "Multi-image analysis failed",
        details: error instanceof Error ? error.message : String(error),
        success: false
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }

  async handleArtworkRecommendations(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
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
      
      const { artworkRegistry } = await import('../services/artwork-registry');
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
}