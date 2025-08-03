import { supabase } from './supabase';

interface FollowRelation {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  followers_count: number;
  following_count: number;
  artworks_count: number;
  total_likes: number;
}

export class UserFollowService {

  /**
   * 사용자 팔로우
   */
  async followUser(followerId: string, followingId: string): Promise<{
    success: boolean;
    isFollowing: boolean;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, isFollowing: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    if (followerId === followingId) {
      return { success: false, isFollowing: false, error: '자기 자신을 팔로우할 수 없습니다.' };
    }

    try {
      // 기존 팔로우 관계 확인
      const { data: existingFollow } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single();

      if (existingFollow) {
        // 이미 팔로우 중인 경우 언팔로우
        await supabase
          .from('user_follows')
          .delete()
          .eq('id', existingFollow.id);

        // 팔로워/팔로잉 수 업데이트
        await this.updateFollowCounts(followerId, followingId, 'unfollow');

        return { success: true, isFollowing: false };
      } else {
        // 새로운 팔로우 관계 생성
        const { error: insertError } = await supabase
          .from('user_follows')
          .insert({
            follower_id: followerId,
            following_id: followingId
          });

        if (insertError) {
          return { success: false, isFollowing: false, error: insertError.message };
        }

        // 팔로워/팔로잉 수 업데이트
        await this.updateFollowCounts(followerId, followingId, 'follow');

        return { success: true, isFollowing: true };
      }

    } catch (error) {
      return {
        success: false,
        isFollowing: false,
        error: error instanceof Error ? error.message : '팔로우 처리 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 팔로워 목록 조회
   */
  async getFollowers(userId: string, limit: number = 20, offset: number = 0): Promise<{
    success: boolean;
    followers?: (UserProfile & { followed_at: string })[];
    total?: number;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      const { data: followers, error, count } = await supabase
        .from('user_follows')
        .select(`
          id,
          created_at,
          follower:user_galleries!user_follows_follower_id_fkey(*)
        `, { count: 'exact' })
        .eq('following_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { success: false, error: error.message };
      }

      const processedFollowers = followers?.map(follow => ({
        ...follow.follower,
        followed_at: follow.created_at
      })) || [];

      return {
        success: true,
        followers: processedFollowers,
        total: count || 0
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '팔로워 목록 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 팔로잉 목록 조회
   */
  async getFollowing(userId: string, limit: number = 20, offset: number = 0): Promise<{
    success: boolean;
    following?: (UserProfile & { followed_at: string })[];
    total?: number;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      const { data: following, error, count } = await supabase
        .from('user_follows')
        .select(`
          id,
          created_at,
          following:user_galleries!user_follows_following_id_fkey(*)
        `, { count: 'exact' })
        .eq('follower_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { success: false, error: error.message };
      }

      const processedFollowing = following?.map(follow => ({
        ...follow.following,
        followed_at: follow.created_at
      })) || [];

      return {
        success: true,
        following: processedFollowing,
        total: count || 0
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '팔로잉 목록 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 팔로우 상태 확인
   */
  async getFollowStatus(followerId: string, followingId: string): Promise<{
    success: boolean;
    isFollowing: boolean;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, isFollowing: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      const { data: followRelation } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single();

      return {
        success: true,
        isFollowing: !!followRelation
      };

    } catch (error) {
      return {
        success: false,
        isFollowing: false,
        error: error instanceof Error ? error.message : '팔로우 상태 확인 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 추천 사용자 목록 (팔로우할 만한 사용자들)
   */
  async getSuggestedUsers(userId: string, limit: number = 10): Promise<{
    success: boolean;
    suggestions?: UserProfile[];
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      // 이미 팔로우 중인 사용자 ID 조회
      const { data: followingIds } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

      const excludeIds = [userId, ...(followingIds?.map(f => f.following_id) || [])];

      // 인기 갤러리 사용자들 추천 (작품 수와 좋아요 수 기준)
      const { data: suggestions, error } = await supabase
        .from('user_galleries')
        .select('*')
        .eq('is_public', true)
        .not('user_id', 'in', `(${excludeIds.join(',')})`)
        .order('total_likes', { ascending: false })
        .order('artworks_count', { ascending: false })
        .limit(limit);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, suggestions: suggestions || [] };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '추천 사용자 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 상호 팔로우 관계 확인
   */
  async getMutualFollows(userId1: string, userId2: string): Promise<{
    success: boolean;
    user1FollowsUser2: boolean;
    user2FollowsUser1: boolean;
    isMutual: boolean;
    error?: string;
  }> {
    if (!supabase) {
      return { 
        success: false, 
        user1FollowsUser2: false, 
        user2FollowsUser1: false, 
        isMutual: false,
        error: '데이터베이스가 구성되지 않았습니다.' 
      };
    }

    try {
      const [follow1, follow2] = await Promise.all([
        supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', userId1)
          .eq('following_id', userId2)
          .single(),
        supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', userId2)
          .eq('following_id', userId1)
          .single()
      ]);

      const user1FollowsUser2 = !!follow1.data;
      const user2FollowsUser1 = !!follow2.data;
      const isMutual = user1FollowsUser2 && user2FollowsUser1;

      return {
        success: true,
        user1FollowsUser2,
        user2FollowsUser1,
        isMutual
      };

    } catch (error) {
      return {
        success: false,
        user1FollowsUser2: false,
        user2FollowsUser1: false,
        isMutual: false,
        error: error instanceof Error ? error.message : '상호 팔로우 확인 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 팔로우/팔로잉 수 업데이트
   */
  private async updateFollowCounts(followerId: string, followingId: string, action: 'follow' | 'unfollow'): Promise<void> {
    if (!supabase) return;

    try {
      const increment = action === 'follow' ? 1 : -1;

      // 팔로워 카운트 업데이트 (following_id의 followers_count 증가/감소)
      await supabase.rpc('update_follower_count', {
        user_id: followingId,
        increment_value: increment
      });

      // 팔로잉 카운트 업데이트 (follower_id의 following_count 증가/감소)
      await supabase.rpc('update_following_count', {
        user_id: followerId,
        increment_value: increment
      });

    } catch (error) {
      console.error('Failed to update follow counts:', error);
    }
  }

  /**
   * 사용자 활동 피드 (팔로우하는 사용자들의 최근 활동)
   */
  async getFollowingActivityFeed(userId: string, limit: number = 20, offset: number = 0): Promise<{
    success: boolean;
    activities?: any[];
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      // 팔로우하는 사용자들의 ID 조회
      const { data: followingIds } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (!followingIds || followingIds.length === 0) {
        return { success: true, activities: [] };
      }

      const followingUserIds = followingIds.map(f => f.following_id);

      // 팔로우하는 사용자들의 최근 작품 활동 조회
      const { data: activities, error } = await supabase
        .from('gallery_artworks')
        .select(`
          *,
          user_galleries!inner(display_name, avatar_url)
        `)
        .in('user_id', followingUserIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, activities: activities || [] };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '피드 조회 중 오류가 발생했습니다.'
      };
    }
  }
}