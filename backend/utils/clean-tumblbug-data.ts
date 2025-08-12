import { supabase } from '../services/supabase';

/**
 * 데이터베이스에서 텀블벅 관련 데이터를 정리하는 유틸리티
 * 사용자 요청에 따라 텀블벅 데이터 완전 제거
 */
export class TumblbugDataCleaner {
  
  /**
   * 텀블벅 관련 데이터 검색 및 확인
   */
  async findTumblbugData(): Promise<{
    found: boolean;
    count: number;
    data: any[];
    error?: string;
  }> {
    try {
      if (!supabase) {
        return { found: false, count: 0, data: [] };
      }

      // artworks 테이블에서 텀블벅 관련 데이터 검색
      const { data: artworks, error } = await supabase
        .from('artworks')
        .select('*')
        .or('source.eq.텀블벅,source_url.like.%tumblbug.com%,title.like.%텀블벅%,artist.like.%텀블벅%');

      if (error) {
        logger.error('텀블벅 데이터 검색 오류:', error);
        return {
          found: false,
          count: 0,
          data: [],
          error: error.message
        };
      }

      return {
        found: artworks && artworks.length > 0,
        count: artworks?.length || 0,
        data: artworks || []
      };

    } catch (error) {
      logger.error('텀블벅 데이터 검색 실패:', error);
      return {
        found: false,
        count: 0,
        data: [],
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 텀블벅 관련 데이터 비활성화 (삭제하지 않고 available = false로 설정)
   */
  async deactivateTumblbugData(): Promise<{
    success: boolean;
    deactivatedCount: number;
    error?: string;
  }> {
    try {
      if (!supabase) {
        return { success: false, deactivatedCount: 0 };
      }

      // 텀블벅 관련 데이터를 available = false로 설정
      const { data, error } = await supabase
        .from('artworks')
        .update({ 
          available: false
        })
        .or('source.eq.텀블벅,source_url.like.%tumblbug.com%,title.like.%텀블벅%,artist.like.%텀블벅%')
        .select('id');

      if (error) {
        logger.error('텀블벅 데이터 비활성화 오류:', error);
        return {
          success: false,
          deactivatedCount: 0,
          error: error.message
        };
      }

      const deactivatedCount = data?.length || 0;
      logger.info(`📝 ${deactivatedCount}개의 텀블벅 관련 데이터를 비활성화했습니다.`);

      return {
        success: true,
        deactivatedCount
      };

    } catch (error) {
      logger.error('텀블벅 데이터 비활성화 실패:', error);
      return {
        success: false,
        deactivatedCount: 0,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 분석 결과에서 텀블벅 데이터 정리
   */
  async cleanAnalysisResults(): Promise<{
    success: boolean;
    cleanedCount: number;
    error?: string;
  }> {
    try {
      if (!supabase) {
        return { success: false, cleanedCount: 0 };
      }

      // multi_image_analysis_results 테이블에서 텀블벅 관련 추천 정리
      const { data: analysisResults, error: fetchError } = await supabase
        .from('multi_image_analysis_results')
        .select('id, recommendations');

      if (fetchError) {
        logger.error('분석 결과 조회 오류:', fetchError);
        return {
          success: false,
          cleanedCount: 0,
          error: fetchError.message
        };
      }

      let cleanedCount = 0;

      if (analysisResults) {
        for (const result of analysisResults) {
          if (result.recommendations) {
            let modified = false;
            const cleanedRecommendations = { ...result.recommendations };

            // internal 추천에서 텀블벅 제거
            if (cleanedRecommendations.internal) {
              const originalLength = cleanedRecommendations.internal.length;
              cleanedRecommendations.internal = cleanedRecommendations.internal.filter((artwork: any) => {
                const isTumblbug = artwork.platform === 'tumblbug' || 
                                  artwork.source === '텀블벅' || 
                                  (artwork.source_url && artwork.source_url.includes('tumblbug.com'));
                return !isTumblbug;
              });
              if (cleanedRecommendations.internal.length !== originalLength) {
                modified = true;
              }
            }

            // external 추천에서 텀블벅 제거
            if (cleanedRecommendations.external) {
              const originalLength = cleanedRecommendations.external.length;
              cleanedRecommendations.external = cleanedRecommendations.external.filter((artwork: any) => {
                const isTumblbug = artwork.platform === 'tumblbug' || 
                                  artwork.source === '텀블벅' || 
                                  (artwork.source_url && artwork.source_url.includes('tumblbug.com'));
                return !isTumblbug;
              });
              if (cleanedRecommendations.external.length !== originalLength) {
                modified = true;
              }
            }

            // 수정된 경우 업데이트
            if (modified) {
              const { error: updateError } = await supabase
                .from('multi_image_analysis_results')
                .update({ recommendations: cleanedRecommendations })
                .eq('id', result.id);

              if (!updateError) {
                cleanedCount++;
              }
            }
          }
        }
      }

      logger.info(`🧹 ${cleanedCount}개의 분석 결과에서 텀블벅 데이터를 정리했습니다.`);

      return {
        success: true,
        cleanedCount
      };

    } catch (error) {
      logger.error('분석 결과 정리 실패:', error);
      return {
        success: false,
        cleanedCount: 0,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 전체 텀블벅 데이터 정리 실행
   */
  async cleanAllTumblbugData(): Promise<{
    success: boolean;
    summary: {
      artworksDeactivated: number;
      analysisResultsCleaned: number;
    };
    error?: string;
  }> {
    try {
      logger.info('🧹 텀블벅 데이터 정리를 시작합니다...');

      // 1. 아트워크 데이터 비활성화
      const artworkResult = await this.deactivateTumblbugData();
      
      // 2. 분석 결과 정리
      const analysisResult = await this.cleanAnalysisResults();

      if (!artworkResult.success || !analysisResult.success) {
        return {
          success: false,
          summary: {
            artworksDeactivated: artworkResult.deactivatedCount,
            analysisResultsCleaned: analysisResult.cleanedCount
          },
          error: artworkResult.error || analysisResult.error
        };
      }

      logger.info('✅ 텀블벅 데이터 정리가 완료되었습니다.');
      
      return {
        success: true,
        summary: {
          artworksDeactivated: artworkResult.deactivatedCount,
          analysisResultsCleaned: analysisResult.cleanedCount
        }
      };

    } catch (error) {
      logger.error('텀블벅 데이터 정리 실패:', error);
      return {
        success: false,
        summary: {
          artworksDeactivated: 0,
          analysisResultsCleaned: 0
        },
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }
}