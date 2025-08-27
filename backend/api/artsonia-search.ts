import { ExpandedArtSearchService } from '../services/expanded-art-search';
import { logger } from '../../shared/logger';

export async function handleArtsoniaSearch(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const keywords = url.searchParams.get('keywords')?.split(',').map(k => k.trim()) || [];
    const grade = url.searchParams.get('grade') as 'elementary' | 'middle' | 'high' | undefined;
    const project = url.searchParams.get('project') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (keywords.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: '검색 키워드가 필요합니다.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const searchService = new ExpandedArtSearchService();
    const result = await searchService.searchStudentArt(keywords, grade, project, limit);

    return new Response(JSON.stringify({
      success: result.success,
      data: result,
      usage_guidelines: [
        '🎓 교육 목적으로만 사용',
        '👶 학생 프라이버시 보호 필수',
        '🔒 COPPA/FERPA 준수',
        '📚 연구/분석 용도 제한'
      ]
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    logger.error('Artsonia search API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '학생 작품 검색 실패'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleArtsoniaAvailability(request: Request): Promise<Response> {
  try {
    const searchService = new ExpandedArtSearchService();
    // Mock availability check
    const isAvailable = true;

    return new Response(JSON.stringify({
      available: isAvailable,
      platform: 'Artsonia Student Art Platform',
      api_type: 'Educational Mock Implementation',
      privacy_compliance: ['COPPA', 'FERPA'],
      supported_grades: ['elementary', 'middle', 'high'],
      supported_projects: [
        'Self Portrait', 'Abstract Art', 'Nature Study', 'Animal Drawing',
        'Color Theory', 'Landscape Painting', 'Earth Day', 'Seasons'
      ],
      limitations: [
        'Mock 데이터 사용',
        '교육 목적만 허용',
        '실제 API 연동 시 Artsonia 파트너십 필요'
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Artsonia availability check error:', error);
    return new Response(JSON.stringify({
      available: false,
      error: error instanceof Error ? error.message : '가용성 확인 실패'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}