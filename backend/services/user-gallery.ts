import { supabase } from './supabase';

interface GalleryItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  image_url: string;
  thumbnail_url?: string;
  analysis_keywords: string[];
  is_public: boolean;
  likes_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
}

interface UserGallery {
  user_id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  is_public: boolean;
  followers_count: number;
  following_count: number;
  artworks_count: number;
  total_likes: number;
  created_at: string;
}

interface GalleryCollection {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  is_public: boolean;
  artworks: GalleryItem[];
  likes_count: number;
  created_at: string;
}

export class UserGalleryService {
  
  /**
   * 사용자 갤러리 프로필 생성/업데이트
   */
  async createOrUpdateGallery(userId: string, galleryData: {
    display_name: string;
    bio?: string;
    avatar_url?: string;
    is_public?: boolean;
  }): Promise<{
    success: boolean;
    gallery?: UserGallery;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      const { data: existingGallery } = await supabase
        .from('user_galleries')
        .select('*')
        .eq('user_id', userId)
        .single();

      const galleryInfo = {
        user_id: userId,
        display_name: galleryData.display_name,
        bio: galleryData.bio || null,
        avatar_url: galleryData.avatar_url || null,
        is_public: galleryData.is_public ?? true,
        updated_at: new Date().toISOString()
      };

      let result;
      if (existingGallery) {
        // 업데이트
        result = await supabase
          .from('user_galleries')
          .update(galleryInfo)
          .eq('user_id', userId)
          .select()
          .single();
      } else {
        // 신규 생성
        result = await supabase
          .from('user_galleries')
          .insert({
            ...galleryInfo,
            followers_count: 0,
            following_count: 0,
            artworks_count: 0,
            total_likes: 0
          })
          .select()
          .single();
      }

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true, gallery: result.data };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '갤러리 생성 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 갤러리에 작품 추가
   */
  async addArtworkToGallery(userId: string, artworkData: {
    title: string;
    description?: string;
    image_url: string;
    thumbnail_url?: string;
    analysis_keywords?: string[];
    is_public?: boolean;
  }): Promise<{
    success: boolean;
    artwork?: GalleryItem;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      // 작품 추가
      const { data: artwork, error: insertError } = await supabase
        .from('gallery_artworks')
        .insert({
          user_id: userId,
          title: artworkData.title,
          description: artworkData.description || null,
          image_url: artworkData.image_url,
          thumbnail_url: artworkData.thumbnail_url || artworkData.image_url,
          analysis_keywords: artworkData.analysis_keywords || [],
          is_public: artworkData.is_public ?? true,
          likes_count: 0,
          views_count: 0
        })
        .select()
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      // 갤러리 작품 수 업데이트
      await this.updateGalleryStats(userId);

      return { success: true, artwork };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '작품 추가 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 사용자 갤러리 조회
   */
  async getUserGallery(userId: string, viewerUserId?: string): Promise<{
    success: boolean;
    gallery?: UserGallery & {
      artworks: GalleryItem[];
      collections: GalleryCollection[];
      isFollowing?: boolean;
    };
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      // 갤러리 기본 정보
      const { data: gallery, error: galleryError } = await supabase
        .from('user_galleries')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (galleryError) {
        return { success: false, error: '갤러리를 찾을 수 없습니다.' };
      }

      // 비공개 갤러리 접근 권한 확인
      if (!gallery.is_public && viewerUserId !== userId) {
        return { success: false, error: '비공개 갤러리입니다.' };
      }

      // 작품 목록 조회
      const artworksQuery = supabase
        .from('gallery_artworks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // 공개 작품만 보기 (본인이 아닌 경우)
      if (viewerUserId !== userId) {
        artworksQuery.eq('is_public', true);
      }

      const { data: artworks, error: artworksError } = await artworksQuery;

      if (artworksError) {
        return { success: false, error: artworksError.message };
      }

      // 컬렉션 조회
      const collectionsQuery = supabase
        .from('gallery_collections')
        .select(`
          *,
          gallery_artworks:collection_artworks(
            artwork:gallery_artworks(*)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (viewerUserId !== userId) {
        collectionsQuery.eq('is_public', true);
      }

      const { data: collections } = await collectionsQuery;

      // 팔로우 상태 확인 (로그인한 사용자가 다른 사용자 갤러리 볼 때)
      let isFollowing = false;
      if (viewerUserId && viewerUserId !== userId) {
        const { data: followData } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', viewerUserId)
          .eq('following_id', userId)
          .single();

        isFollowing = !!followData;
      }

      return {
        success: true,
        gallery: {
          ...gallery,
          artworks: artworks || [],
          collections: collections || [],
          isFollowing
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '갤러리 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 작품에 좋아요 추가/제거
   */
  async toggleArtworkLike(userId: string, artworkId: string): Promise<{
    success: boolean;
    isLiked: boolean;
    likesCount: number;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, isLiked: false, likesCount: 0, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      // 기존 좋아요 확인
      const { data: existingLike } = await supabase
        .from('artwork_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('artwork_id', artworkId)
        .single();

      let isLiked: boolean;
      
      if (existingLike) {
        // 좋아요 제거
        await supabase
          .from('artwork_likes')
          .delete()
          .eq('id', existingLike.id);
        
        // 작품 좋아요 수 감소
        await supabase.rpc('decrement_artwork_likes', { artwork_id: artworkId });
        isLiked = false;
      } else {
        // 좋아요 추가
        await supabase
          .from('artwork_likes')
          .insert({
            user_id: userId,
            artwork_id: artworkId
          });

        // 작품 좋아요 수 증가
        await supabase.rpc('increment_artwork_likes', { artwork_id: artworkId });
        isLiked = true;
      }

      // 현재 좋아요 수 조회
      const { data: artwork } = await supabase
        .from('gallery_artworks')
        .select('likes_count')
        .eq('id', artworkId)
        .single();

      return {
        success: true,
        isLiked,
        likesCount: artwork?.likes_count || 0
      };

    } catch (error) {
      return {
        success: false,
        isLiked: false,
        likesCount: 0,
        error: error instanceof Error ? error.message : '좋아요 처리 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 작품 조회수 증가
   */
  async incrementArtworkViews(artworkId: string): Promise<void> {
    if (!supabase) return;

    try {
      await supabase.rpc('increment_artwork_views', { artwork_id: artworkId });
    } catch (error) {
      logger.error('Failed to increment artwork views:', error);
    }
  }

  /**
   * 인기 작품 조회 (트렌딩)
   */
  async getTrendingArtworks(period: 'day' | 'week' | 'month' = 'week', limit: number = 20): Promise<{
    success: boolean;
    artworks?: GalleryItem[];
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      const periodDays = period === 'day' ? 1 : period === 'week' ? 7 : 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodDays);

      const { data: artworks, error } = await supabase
        .from('gallery_artworks')
        .select(`
          *,
          user_galleries!inner(display_name, avatar_url)
        `)
        .eq('is_public', true)
        .gte('created_at', cutoffDate.toISOString())
        .order('likes_count', { ascending: false })
        .order('views_count', { ascending: false })
        .limit(limit);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, artworks: artworks || [] };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '트렌딩 작품 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 갤러리 통계 업데이트
   */
  private async updateGalleryStats(userId: string): Promise<void> {
    if (!supabase) return;

    try {
      // 작품 수 및 총 좋아요 수 계산
      const { data: stats } = await supabase
        .from('gallery_artworks')
        .select('likes_count')
        .eq('user_id', userId);

      const artworksCount = stats?.length || 0;
      const totalLikes = stats?.reduce((sum, artwork) => sum + artwork.likes_count, 0) || 0;

      // 갤러리 통계 업데이트
      await supabase
        .from('user_galleries')
        .update({
          artworks_count: artworksCount,
          total_likes: totalLikes,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

    } catch (error) {
      logger.error('Failed to update gallery stats:', error);
    }
  }

  /**
   * 컬렉션 생성
   */
  async createCollection(userId: string, collectionData: {
    title: string;
    description?: string;
    cover_image_url?: string;
    is_public?: boolean;
    artwork_ids?: string[];
  }): Promise<{
    success: boolean;
    collection?: GalleryCollection;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      // 컬렉션 생성
      const { data: collection, error: collectionError } = await supabase
        .from('gallery_collections')
        .insert({
          user_id: userId,
          title: collectionData.title,
          description: collectionData.description || null,
          cover_image_url: collectionData.cover_image_url || null,
          is_public: collectionData.is_public ?? true,
          likes_count: 0
        })
        .select()
        .single();

      if (collectionError) {
        return { success: false, error: collectionError.message };
      }

      // 작품들을 컬렉션에 추가
      if (collectionData.artwork_ids && collectionData.artwork_ids.length > 0) {
        const collectionArtworks = collectionData.artwork_ids.map(artworkId => ({
          collection_id: collection.id,
          artwork_id: artworkId
        }));

        await supabase
          .from('collection_artworks')
          .insert(collectionArtworks);
      }

      return { success: true, collection };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '컬렉션 생성 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 공개 갤러리 목록 조회 (탐색)
   */
  async getPublicGalleries(limit: number = 20, offset: number = 0): Promise<{
    success: boolean;
    galleries?: (UserGallery & { recent_artworks: GalleryItem[] })[];
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      const { data: galleries, error } = await supabase
        .from('user_galleries')
        .select(`
          *,
          recent_artworks:gallery_artworks(*)
        `)
        .eq('is_public', true)
        .order('total_likes', { ascending: false })
        .order('artworks_count', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { success: false, error: error.message };
      }

      // 최근 작품 3개만 포함
      const processedGalleries = galleries?.map(gallery => ({
        ...gallery,
        recent_artworks: gallery.recent_artworks
          ?.filter((artwork: any) => artwork.is_public)
          ?.slice(0, 3) || []
      })) || [];

      return { success: true, galleries: processedGalleries };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '갤러리 목록 조회 중 오류가 발생했습니다.'
      };
    }
  }
}