import { supabase } from '../services/supabase';
import { RoleAuthService } from '../services/role-auth';

export class ArtworkManagementAPI {
  /**
   * 작품 등록 (예술가용)
   */
  static async registerArtwork(req: Request): Promise<Response> {
    try {
      const formData = await req.formData();
      const userId = formData.get('userId') as string;
      
      // 예술가 권한 확인
      const isArtist = await RoleAuthService.isArtist(userId);
      if (!isArtist) {
        return new Response(JSON.stringify({
          success: false,
          error: '예술가 권한이 필요합니다.'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 폼 데이터 추출
      const artworkData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        artist_id: userId,
        category: formData.get('category') as string,
        medium: formData.get('medium') as string,
        style: formData.get('style') as string,
        year_created: parseInt(formData.get('yearCreated') as string) || null,
        width_cm: parseFloat(formData.get('widthCm') as string) || null,
        height_cm: parseFloat(formData.get('heightCm') as string) || null,
        depth_cm: parseFloat(formData.get('depthCm') as string) || null,
        price_krw: parseInt(formData.get('priceKrw') as string) || null,
        is_for_sale: formData.get('isForSale') === 'true',
        keywords: JSON.parse(formData.get('keywords') as string || '[]'),
        tags: JSON.parse(formData.get('tags') as string || '[]'),
        status: formData.get('status') as 'draft' | 'pending' || 'draft',
        image_url: formData.get('imageUrl') as string
      };

      // 작가명 가져오기
      if (supabase) {
        const { data: userData } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', userId)
          .single();
        
        artworkData.artist_name = userData?.display_name || '알 수 없음';
      }

      // 제출 시간 설정
      if (artworkData.status === 'pending') {
        artworkData.submitted_at = new Date().toISOString();
      }

      // 데이터베이스에 저장
      if (!supabase) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Database connection error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const { data, error } = await supabase
        .from('registered_artworks')
        .insert(artworkData)
        .select('*')
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        artwork: data
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Artwork registration error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '작품 등록 실패'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 작품 승인 (관리자용)
   */
  static async approveArtwork(req: Request): Promise<Response> {
    try {
      const { artworkId, adminId } = await req.json();

      // 관리자 권한 확인
      const isAdmin = await RoleAuthService.isAdmin(adminId);
      if (!isAdmin) {
        return new Response(JSON.stringify({
          success: false,
          error: '관리자 권한이 필요합니다.'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!supabase) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Database connection error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 작품 승인
      const { data, error } = await supabase
        .from('registered_artworks')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: adminId
        })
        .eq('id', artworkId)
        .select('*')
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        artwork: data
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Artwork approval error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '작품 승인 실패'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 작품 거부 (관리자용)
   */
  static async rejectArtwork(req: Request): Promise<Response> {
    try {
      const { artworkId, adminId, reason } = await req.json();

      // 관리자 권한 확인
      const isAdmin = await RoleAuthService.isAdmin(adminId);
      if (!isAdmin) {
        return new Response(JSON.stringify({
          success: false,
          error: '관리자 권한이 필요합니다.'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!supabase) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Database connection error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 작품 거부
      const { data, error } = await supabase
        .from('registered_artworks')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: adminId,
          rejection_reason: reason
        })
        .eq('id', artworkId)
        .select('*')
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        artwork: data
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Artwork rejection error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '작품 거부 실패'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 승인된 작품 목록 가져오기 (추천 시스템용)
   */
  static async getApprovedArtworks(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const keywords = url.searchParams.get('keywords')?.split(',') || [];
      const limit = parseInt(url.searchParams.get('limit') || '20');

      if (!supabase) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Database connection error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      let query = supabase
        .from('registered_artworks')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(limit);

      // 키워드 필터링 (키워드가 제공된 경우)
      if (keywords.length > 0) {
        query = query.overlaps('keywords', keywords);
      }

      const { data, error } = await query;

      if (error) throw error;

      // 추천 시스템 형식으로 변환
      const artworks = (data || []).map(artwork => ({
        id: artwork.id,
        title: artwork.title,
        artist: artwork.artist_name,
        artistDisplayName: artwork.artist_name,
        image_url: artwork.image_url,
        thumbnail_url: artwork.image_url,
        source_url: `/artwork/${artwork.id}`,
        keywords: artwork.keywords || [],
        tags: artwork.tags || [],
        category: artwork.category,
        medium: artwork.medium,
        style: artwork.style,
        year: artwork.year_created,
        description: artwork.description,
        platform: 'registered_artworks',
        source: 'Art Recommendation SaaS',
        search_source: 'internal'
      }));

      return new Response(JSON.stringify({
        success: true,
        artworks
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error fetching approved artworks:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '작품 목록 조회 실패'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 예술가의 작품 목록 가져오기
   */
  static async getArtistArtworks(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'userId가 필요합니다.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!supabase) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Database connection error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const { data, error } = await supabase
        .from('registered_artworks')
        .select('*')
        .eq('artist_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        artworks: data || []
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error fetching artist artworks:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '작가 작품 목록 조회 실패'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 작품 통계 가져오기 (관리자용)
   */
  static async getArtworkStats(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const adminId = url.searchParams.get('adminId');

      // 관리자 권한 확인
      if (adminId) {
        const isAdmin = await RoleAuthService.isAdmin(adminId);
        if (!isAdmin) {
          return new Response(JSON.stringify({
            success: false,
            error: '관리자 권한이 필요합니다.'
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      if (!supabase) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Database connection error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 상태별 작품 수 집계
      const { data: statusStats, error: statusError } = await supabase
        .from('registered_artworks')
        .select('status')
        .then(({ data, error }) => {
          if (error) throw error;
          
          const stats = {
            total: data?.length || 0,
            draft: 0,
            pending: 0,
            approved: 0,
            rejected: 0
          };

          data?.forEach(artwork => {
            stats[artwork.status]++;
          });

          return { data: stats, error: null };
        });

      if (statusError) throw statusError;

      // 카테고리별 통계
      const { data: categoryStats, error: categoryError } = await supabase
        .from('registered_artworks')
        .select('category')
        .eq('status', 'approved')
        .then(({ data, error }) => {
          if (error) throw error;
          
          const categories: { [key: string]: number } = {};
          data?.forEach(artwork => {
            if (artwork.category) {
              categories[artwork.category] = (categories[artwork.category] || 0) + 1;
            }
          });

          return { data: categories, error: null };
        });

      if (categoryError) throw categoryError;

      return new Response(JSON.stringify({
        success: true,
        stats: {
          status: statusStats,
          categories: categoryStats
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error fetching artwork stats:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '통계 조회 실패'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}