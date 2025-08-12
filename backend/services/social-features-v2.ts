// Week 6: 소셜 기능 서비스 V2
// 사용자 프로필, 팔로우, 좋아요, 북마크, 커뮤니티 기능

import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  bio?: string;
  profile_image_url?: string;
  website_url?: string;
  location?: string;
  is_public: boolean;
  followers_count: number;
  following_count: number;
  likes_count: number;
  artworks_count: number;
  joined_at: string;
  created_at: string;
}

export interface FollowRelation {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  follower?: UserProfile;
  following?: UserProfile;
}

export interface ArtworkLike {
  id: string;
  user_id: string;
  artwork_id: string;
  artwork_title: string;
  artwork_artist: string;
  artwork_image_url: string;
  source_platform: string;
  external_artwork_id?: string;
  created_at: string;
}

export interface BookmarkCollection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  items_count?: number;
}

export interface BookmarkItem {
  id: string;
  collection_id: string;
  artwork_id: string;
  artwork_title: string;
  artwork_artist: string;
  artwork_image_url: string;
  source_platform: string;
  external_artwork_id?: string;
  notes?: string;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  artwork_id?: string;
  source_platform?: string;
  external_artwork_id?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
  is_liked?: boolean;
}

export interface PostComment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  parent_comment_id?: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
  is_liked?: boolean;
  replies?: PostComment[];
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'follow' | 'like' | 'comment' | 'mention';
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

export class SocialFeaturesV2Service {
  
  // 실제 사용자 정보를 가져오는 헬퍼 함수
  private async getRealUserInfo(userId: string): Promise<UserProfile | null> {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error || !data) return null;
      
      return {
        id: data.id,
        email: data.email || `user${userId}@unknown.com`,
        display_name: data.display_name || data.raw_user_meta_data?.display_name,
        bio: data.bio,
        profile_image_url: data.profile_image_url,
        website_url: data.website_url,
        location: data.location,
        is_public: data.is_public ?? true,
        followers_count: data.followers_count || 0,
        following_count: data.following_count || 0,
        likes_count: data.likes_count || 0,
        artworks_count: data.artworks_count || 0,
        joined_at: data.joined_at || data.created_at,
        created_at: data.created_at
      };
    } catch (error) {
      logger.error('Failed to get real user info:', error);
      return null;
    }
  }
  
  // Mock 데이터 (데이터베이스가 없을 때 사용)
  private static mockPosts: CommunityPost[] = [
    {
      id: '1',
      user_id: 'user1',
      content: '새로운 아트 작품을 발견했어요! 정말 아름다운 색감이네요.',
      image_url: 'https://via.placeholder.com/600x400?text=Art+Discovery',
      artwork_id: 'artwork1',
      source_platform: 'met',
      likes_count: 12,
      comments_count: 3,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      user: {
        id: 'user1',
        email: 'artist@example.com',
        display_name: '아트 러버',
        bio: '예술을 사랑하는 사람',
        profile_image_url: 'https://via.placeholder.com/150?text=👨‍🎨',
        is_public: true,
        followers_count: 150,
        following_count: 80,
        likes_count: 200,
        artworks_count: 50,
        joined_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: '2',
      user_id: 'user2',
      content: '오늘 갤러리에서 본 작품들이 너무 인상적이었어요. 특히 인상파 작품들의 색채가 놀라웠습니다.',
      likes_count: 8,
      comments_count: 1,
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      user: {
        id: 'user2',
        email: 'curator@example.com',
        display_name: '갤러리 큐레이터',
        bio: '현대미술 큐레이터입니다',
        profile_image_url: 'https://via.placeholder.com/150?text=👩‍🎨',
        is_public: true,
        followers_count: 89,
        following_count: 120,
        likes_count: 180,
        artworks_count: 25,
        joined_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: '3',
      user_id: 'user3',
      content: 'AI 기술로 생성한 아트 작품을 분석해보고 있어요. 정말 흥미로운 결과들이 나오고 있습니다!',
      image_url: 'https://via.placeholder.com/600x400?text=AI+Art+Analysis',
      likes_count: 25,
      comments_count: 7,
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      user: {
        id: 'user3',
        email: 'researcher@example.com',
        display_name: 'AI 아트 연구자',
        bio: 'AI와 예술의 융합을 연구합니다',
        profile_image_url: 'https://via.placeholder.com/150?text=🤖',
        is_public: true,
        followers_count: 340,
        following_count: 95,
        likes_count: 450,
        artworks_count: 75,
        joined_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
];

  private static mockUsers: UserProfile[] = [
    {
      id: 'user1',
      email: 'artist@example.com',
      display_name: '아트 러버',
      bio: '예술을 사랑하는 사람',
      profile_image_url: 'https://via.placeholder.com/150?text=👨‍🎨',
      is_public: true,
      followers_count: 150,
      following_count: 80,
      likes_count: 200,
      artworks_count: 50,
      joined_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'user2',
      email: 'curator@example.com',
      display_name: '갤러리 큐레이터',
      bio: '현대미술 큐레이터입니다',
      profile_image_url: 'https://via.placeholder.com/150?text=👩‍🎨',
      is_public: true,
      followers_count: 89,
      following_count: 120,
      likes_count: 180,
      artworks_count: 25,
      joined_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'user3',
      email: 'researcher@example.com',
      display_name: 'AI 아트 연구자',
      bio: 'AI와 예술의 융합을 연구합니다',
      profile_image_url: 'https://via.placeholder.com/150?text=🤖',
      is_public: true,
      followers_count: 340,
      following_count: 95,
      likes_count: 450,
      artworks_count: 75,
      joined_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    }
];

  // Mock 데이터 - 좋아요 시스템
  private static mockPostLikes: { [postId: string]: string[] } = {
    '1': ['user2', 'user3'], // 포스트 1에 user2, user3가 좋아요
    '2': ['user1'], // 포스트 2에 user1이 좋아요
    '3': ['user1', 'user2', 'user3'] // 포스트 3에 모든 사용자가 좋아요
  };

  // Mock 데이터 - 댓글 시스템
  private static mockComments: PostComment[] = [
    {
      id: 'comment1',
      user_id: 'user2',
      post_id: '1',
      content: '정말 아름다운 작품이네요! 색감이 특히 인상적입니다.',
      likes_count: 2,
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      user: {
        id: 'user2',
        email: 'curator@example.com',
        display_name: '갤러리 큐레이터',
        is_public: true,
        followers_count: 89,
        following_count: 120,
        likes_count: 180,
        artworks_count: 25,
        joined_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: 'comment2',
      user_id: 'user3',
      post_id: '1',
      content: 'AI 분석 결과도 궁금하네요. 어떤 스타일로 분류되었을까요?',
      likes_count: 1,
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      user: {
        id: 'user3',
        email: 'researcher@example.com',
        display_name: 'AI 아트 연구자',
        is_public: true,
        followers_count: 340,
        following_count: 95,
        likes_count: 450,
        artworks_count: 75,
        joined_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: 'comment3',
      user_id: 'user1',
      post_id: '2',
      content: '인상파 작품들은 언제 봐도 감동적이에요. 특히 빛의 표현이 놀라워요.',
      likes_count: 0,
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      user: {
        id: 'user1',
        email: 'artist@example.com',
        display_name: '아트 러버',
        is_public: true,
        followers_count: 150,
        following_count: 80,
        likes_count: 200,
        artworks_count: 50,
        joined_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
  ];

  // ================== 사용자 프로필 관리 ==================
  
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Failed to get user profile:', error);
      return null;
    }

    return data;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update user profile:', error);
      return null;
    }

    return data;
  }

  async searchUsers(query: string, limit: number = 20): Promise<UserProfile[]> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to search users:', error);
      return [];
    }

    return data || [];
  }

  // ================== 팔로우 시스템 ==================
  
  async followUser(followerId: string, followingId: string): Promise<boolean> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    const { error } = await supabase
      .from('user_follows')
      .insert([{
        follower_id: followerId,
        following_id: followingId
      }]);

    if (error) {
      logger.error('Failed to follow user:', error);
      return false;
    }

    // 알림 생성
    await this.createNotification(followingId, {
      type: 'follow',
      title: '새로운 팔로워',
      message: '새로운 사용자가 당신을 팔로우했습니다.',
      data: { follower_id: followerId }
    });

    return true;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      logger.error('Failed to unfollow user:', error);
      return false;
    }

    return true;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    if (!supabase) {
      return false;
    }

    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    return !error && !!data;
  }

  async getFollowers(userId: string, limit: number = 50): Promise<FollowRelation[]> {
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        *,
        follower:users!follower_id(*)
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to get followers:', error);
      return [];
    }

    return data || [];
  }

  async getFollowing(userId: string, limit: number = 50): Promise<FollowRelation[]> {
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        *,
        following:users!following_id(*)
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to get following:', error);
      return [];
    }

    return data || [];
  }

  // ================== 좋아요 시스템 ==================
  
  async likeArtwork(userId: string, artwork: {
    id: string;
    title: string;
    artist: string;
    image_url: string;
    source_platform?: string;
    external_artwork_id?: string;
  }): Promise<boolean> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase
      .from('artwork_likes')
      .insert([{
        user_id: userId,
        artwork_id: artwork.id,
        artwork_title: artwork.title,
        artwork_artist: artwork.artist,
        artwork_image_url: artwork.image_url,
        source_platform: artwork.source_platform || 'local',
        external_artwork_id: artwork.external_artwork_id
      }]);

    if (error) {
      logger.error('Failed to like artwork:', error);
      return false;
    }

    return true;
  }

  async unlikeArtwork(userId: string, artworkId: string, sourcePlatform: string = 'local'): Promise<boolean> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase
      .from('artwork_likes')
      .delete()
      .eq('user_id', userId)
      .eq('artwork_id', artworkId)
      .eq('source_platform', sourcePlatform);

    if (error) {
      logger.error('Failed to unlike artwork:', error);
      return false;
    }

    return true;
  }

  async isArtworkLiked(userId: string, artworkId: string, sourcePlatform: string = 'local'): Promise<boolean> {
    if (!supabase) {
      return false;
    }

    const { data, error } = await supabase
      .from('artwork_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('artwork_id', artworkId)
      .eq('source_platform', sourcePlatform)
      .single();

    return !error && !!data;
  }

  async getUserLikedArtworks(userId: string, limit: number = 50): Promise<ArtworkLike[]> {
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('artwork_likes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to get liked artworks:', error);
      return [];
    }

    return data || [];
  }

  // ================== 북마크 시스템 ==================
  
  async createBookmarkCollection(userId: string, collection: {
    name: string;
    description?: string;
    is_public?: boolean;
  }): Promise<BookmarkCollection | null> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('bookmark_collections')
      .insert([{
        user_id: userId,
        name: collection.name,
        description: collection.description,
        is_public: collection.is_public || false
      }])
      .select()
      .single();

    if (error) {
      logger.error('Failed to create bookmark collection:', error);
      return null;
    }

    return data;
  }

  async getUserBookmarkCollections(userId: string): Promise<BookmarkCollection[]> {
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('bookmark_collections')
      .select(`
        *,
        items_count:bookmark_items(count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to get bookmark collections:', error);
      return [];
    }

    return data || [];
  }

  async addToBookmarkCollection(collectionId: string, artwork: {
    id: string;
    title: string;
    artist: string;
    image_url: string;
    source_platform?: string;
    external_artwork_id?: string;
    notes?: string;
  }): Promise<boolean> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase
      .from('bookmark_items')
      .insert([{
        collection_id: collectionId,
        artwork_id: artwork.id,
        artwork_title: artwork.title,
        artwork_artist: artwork.artist,
        artwork_image_url: artwork.image_url,
        source_platform: artwork.source_platform || 'local',
        external_artwork_id: artwork.external_artwork_id,
        notes: artwork.notes
      }]);

    if (error) {
      logger.error('Failed to add bookmark item:', error);
      return false;
    }

    return true;
  }

  async getBookmarkCollectionItems(collectionId: string): Promise<BookmarkItem[]> {
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('bookmark_items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to get bookmark items:', error);
      return [];
    }

    return data || [];
  }

  // ================== 커뮤니티 포스트 ==================
  
  async createPost(userId: string, post: {
    content: string;
    image_url?: string;
    artwork_id?: string;
    source_platform?: string;
    external_artwork_id?: string;
  }): Promise<CommunityPost | null> {
    if (!supabase) {
      // Mock 데이터에 추가
      const newPost: CommunityPost = {
        id: Date.now().toString(),
        user_id: userId,
        content: post.content,
        image_url: post.image_url,
        artwork_id: post.artwork_id,
        source_platform: post.source_platform,
        external_artwork_id: post.external_artwork_id,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: SocialFeaturesV2Service.mockUsers.find(u => u.id === userId) || SocialFeaturesV2Service.mockUsers[0]
      };
      SocialFeaturesV2Service.mockPosts.unshift(newPost);
      return newPost;
    }

    const { data, error } = await supabase
      .from('community_posts')
      .insert([{
        user_id: userId,
        content: post.content,
        image_url: post.image_url,
        artwork_id: post.artwork_id,
        source_platform: post.source_platform,
        external_artwork_id: post.external_artwork_id
      }])
      .select(`
        *,
        user:users(*)
      `)
      .single();

    if (error) {
      logger.error('Failed to create post:', error);
      // 데이터베이스 오류 시 Mock 데이터에 추가
      const newPost: CommunityPost = {
        id: Date.now().toString(),
        user_id: userId,
        content: post.content,
        image_url: post.image_url,
        artwork_id: post.artwork_id,
        source_platform: post.source_platform,
        external_artwork_id: post.external_artwork_id,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: SocialFeaturesV2Service.mockUsers.find(u => u.id === userId) || await this.getRealUserInfo(userId) || {
          id: userId,
          email: `user${userId}@unknown.com`,
          is_public: true,
          followers_count: 0,
          following_count: 0,
          likes_count: 0,
          artworks_count: 0,
          joined_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      };
      SocialFeaturesV2Service.mockPosts.unshift(newPost);
      return newPost;
    }

    return data;
  }

  async getFeedPosts(userId?: string, limit: number = 20): Promise<CommunityPost[]> {
    if (!supabase) {
      // Mock 데이터 반환 - 좋아요 상태 포함
      const posts = SocialFeaturesV2Service.mockPosts.slice(0, limit);
      if (userId) {
        // 각 포스트에 대해 사용자의 좋아요 상태 확인
        for (const post of posts) {
          const isLiked = await this.isPostLiked(userId, post.id);
          (post as any).is_liked = isLiked;
        }
      }
      return posts;
    }

    let query = supabase
      .from('community_posts')
      .select(`
        *,
        user:users(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get feed posts:', error);
      // 데이터베이스 오류 시 Mock 데이터 반환 - 좋아요 상태 포함
      const posts = SocialFeaturesV2Service.mockPosts.slice(0, limit);
      if (userId) {
        // 각 포스트에 대해 사용자의 좋아요 상태 확인
        for (const post of posts) {
          const isLiked = await this.isPostLiked(userId, post.id);
          (post as any).is_liked = isLiked;
        }
      }
      return posts;
    }

    // 사용자별 좋아요 상태 확인
    if (userId && data) {
      for (const post of data) {
        const isLiked = await this.isPostLiked(userId, post.id);
        post.is_liked = isLiked;
      }
    }

    return data || [];
  }

  async likePost(userId: string, postId: string): Promise<boolean> {
    if (!supabase) {
      // Mock 데이터에 좋아요 추가
      if (!SocialFeaturesV2Service.mockPostLikes[postId]) {
        SocialFeaturesV2Service.mockPostLikes[postId] = [];
      }
      if (!SocialFeaturesV2Service.mockPostLikes[postId].includes(userId)) {
        SocialFeaturesV2Service.mockPostLikes[postId].push(userId);
        // 포스트의 좋아요 수 업데이트
        const post = SocialFeaturesV2Service.mockPosts.find(p => p.id === postId);
        if (post) {
          post.likes_count = SocialFeaturesV2Service.mockPostLikes[postId].length;
        }
      }
      return true;
    }

    const { error } = await supabase
      .from('post_likes')
      .insert([{
        user_id: userId,
        post_id: postId
      }]);

    if (error) {
      logger.error('Failed to like post:', error);
      // 데이터베이스 오류 시 Mock 데이터에 추가
      if (!SocialFeaturesV2Service.mockPostLikes[postId]) {
        SocialFeaturesV2Service.mockPostLikes[postId] = [];
      }
      if (!SocialFeaturesV2Service.mockPostLikes[postId].includes(userId)) {
        SocialFeaturesV2Service.mockPostLikes[postId].push(userId);
        const post = SocialFeaturesV2Service.mockPosts.find(p => p.id === postId);
        if (post) {
          post.likes_count = SocialFeaturesV2Service.mockPostLikes[postId].length;
        }
      }
      return true;
    }

    // 포스트 작성자에게 알림
    const post = await this.getPost(postId);
    if (post && post.user_id !== userId) {
      await this.createNotification(post.user_id, {
        type: 'like',
        title: '포스트 좋아요',
        message: '누군가 당신의 포스트를 좋아합니다.',
        data: { post_id: postId, user_id: userId }
      });
    }

    return true;
  }

  async unlikePost(userId: string, postId: string): Promise<boolean> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);

    if (error) {
      logger.error('Failed to unlike post:', error);
      return false;
    }

    return true;
  }

  async isPostLiked(userId: string, postId: string): Promise<boolean> {
    if (!supabase) {
      // Mock 데이터에서 좋아요 상태 확인
      return SocialFeaturesV2Service.mockPostLikes[postId]?.includes(userId) || false;
    }

    const { data, error } = await supabase
      .from('post_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    if (error) {
      // 데이터베이스 오류 시 Mock 데이터에서 확인
      return SocialFeaturesV2Service.mockPostLikes[postId]?.includes(userId) || false;
    }

    return !error && !!data;
  }

  async getPost(postId: string): Promise<CommunityPost | null> {
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        user:users(*)
      `)
      .eq('id', postId)
      .single();

    if (error) {
      logger.error('Failed to get post:', error);
      return null;
    }

    return data;
  }

  // ================== 댓글 시스템 ==================
  
  async createComment(userId: string, comment: {
    post_id: string;
    content: string;
    parent_comment_id?: string;
  }): Promise<PostComment | null> {
    if (!supabase) {
      // Mock 데이터에 댓글 추가
      const newComment: PostComment = {
        id: Date.now().toString(),
        user_id: userId,
        post_id: comment.post_id,
        content: comment.content,
        parent_comment_id: comment.parent_comment_id,
        likes_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: SocialFeaturesV2Service.mockUsers.find(u => u.id === userId) || await this.getRealUserInfo(userId) || {
          id: userId,
          email: `user${userId}@unknown.com`,
          is_public: true,
          followers_count: 0,
          following_count: 0,
          likes_count: 0,
          artworks_count: 0,
          joined_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      };
      SocialFeaturesV2Service.mockComments.push(newComment);
      
      // 포스트의 댓글 수 업데이트
      const post = SocialFeaturesV2Service.mockPosts.find(p => p.id === comment.post_id);
      if (post) {
        post.comments_count++;
      }
      
      return newComment;
    }

    const { data, error } = await supabase
      .from('post_comments')
      .insert([{
        user_id: userId,
        post_id: comment.post_id,
        content: comment.content,
        parent_comment_id: comment.parent_comment_id
      }])
      .select(`
        *,
        user:users(*)
      `)
      .single();

    if (error) {
      logger.error('Failed to create comment:', error);
      // 데이터베이스 오류 시 Mock 데이터에 추가
      const newComment: PostComment = {
        id: Date.now().toString(),
        user_id: userId,
        post_id: comment.post_id,
        content: comment.content,
        parent_comment_id: comment.parent_comment_id,
        likes_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: SocialFeaturesV2Service.mockUsers.find(u => u.id === userId) || await this.getRealUserInfo(userId) || {
          id: userId,
          email: `user${userId}@unknown.com`,
          is_public: true,
          followers_count: 0,
          following_count: 0,
          likes_count: 0,
          artworks_count: 0,
          joined_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      };
      SocialFeaturesV2Service.mockComments.push(newComment);
      
      // 포스트의 댓글 수 업데이트
      const post = SocialFeaturesV2Service.mockPosts.find(p => p.id === comment.post_id);
      if (post) {
        post.comments_count++;
      }
      
      return newComment;
    }

    // 포스트 작성자에게 알림
    const post = await this.getPost(comment.post_id);
    if (post && post.user_id !== userId) {
      await this.createNotification(post.user_id, {
        type: 'comment',
        title: '새 댓글',
        message: '누군가 당신의 포스트에 댓글을 달았습니다.',
        data: { post_id: comment.post_id, comment_id: data.id, user_id: userId }
      });
    }

    return data;
  }

  async getPostComments(postId: string): Promise<PostComment[]> {
    if (!supabase) {
      // Mock 데이터에서 댓글 반환
      return SocialFeaturesV2Service.mockComments
        .filter(comment => comment.post_id === postId && !comment.parent_comment_id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        *,
        user:users(*)
      `)
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to get post comments:', error);
      // 데이터베이스 오류 시 Mock 데이터 반환
      return SocialFeaturesV2Service.mockComments
        .filter(comment => comment.post_id === postId && !comment.parent_comment_id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    // 대댓글 로드
    if (data) {
      for (const comment of data) {
        comment.replies = await this.getCommentReplies(comment.id);
      }
    }

    return data || [];
  }

  async getCommentReplies(commentId: string): Promise<PostComment[]> {
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        *,
        user:users(*)
      `)
      .eq('parent_comment_id', commentId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to get comment replies:', error);
      return [];
    }

    return data || [];
  }

  // ================== 알림 시스템 ==================
  
  async createNotification(userId: string, notification: {
    type: 'follow' | 'like' | 'comment' | 'mention';
    title: string;
    message: string;
    data?: any;
  }): Promise<boolean> {
    if (!supabase) {
      return false;
    }

    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data
      }]);

    if (error) {
      logger.error('Failed to create notification:', error);
      return false;
    }

    return true;
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to get notifications:', error);
      return [];
    }

    return data || [];
  }

  async markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
    if (!supabase) {
      return false;
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to mark notification as read:', error);
      return false;
    }

    return true;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    if (!supabase) {
      return false;
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      logger.error('Failed to mark all notifications as read:', error);
      return false;
    }

    return true;
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    if (!supabase) {
      return 0;
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      logger.error('Failed to get unread notifications count:', error);
      return 0;
    }

    return count || 0;
  }
}