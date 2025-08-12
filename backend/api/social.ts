// Week 6: 소셜 기능 API 엔드포인트
// 사용자 프로필, 팔로우, 좋아요, 북마크, 커뮤니티 관련 API

import { SocialFeaturesV2Service } from '../services/social-features-v2';

export class SocialAPI {
  private socialService: SocialFeaturesV2Service;

  constructor() {
    this.socialService = new SocialFeaturesV2Service();
  }

  // ================== 프로필 관리 ==================
  
  async getUserProfile(userId: string): Promise<any> {
    try {
      const profile = await this.socialService.getUserProfile(userId);
      return {
        success: true,
        profile
      };
    } catch (error) {
      logger.error('Get user profile error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user profile'
      };
    }
  }

  async updateUserProfile(userId: string, updates: any): Promise<any> {
    try {
      const profile = await this.socialService.updateUserProfile(userId, updates);
      return {
        success: true,
        profile
      };
    } catch (error) {
      logger.error('Update user profile error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user profile'
      };
    }
  }

  async searchUsers(query: string, limit: number = 20): Promise<any> {
    try {
      const users = await this.socialService.searchUsers(query, limit);
      return {
        success: true,
        users
      };
    } catch (error) {
      logger.error('Search users error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search users'
      };
    }
  }

  // ================== 팔로우 시스템 ==================
  
  async followUser(followerId: string, followingId: string): Promise<any> {
    try {
      const success = await this.socialService.followUser(followerId, followingId);
      return {
        success,
        message: success ? 'User followed successfully' : 'Failed to follow user'
      };
    } catch (error) {
      logger.error('Follow user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to follow user'
      };
    }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<any> {
    try {
      const success = await this.socialService.unfollowUser(followerId, followingId);
      return {
        success,
        message: success ? 'User unfollowed successfully' : 'Failed to unfollow user'
      };
    } catch (error) {
      logger.error('Unfollow user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unfollow user'
      };
    }
  }

  async getFollowStatus(followerId: string, followingId: string): Promise<any> {
    try {
      const isFollowing = await this.socialService.isFollowing(followerId, followingId);
      return {
        success: true,
        isFollowing
      };
    } catch (error) {
      logger.error('Get follow status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get follow status'
      };
    }
  }

  async getFollowers(userId: string, limit: number = 50): Promise<any> {
    try {
      const followers = await this.socialService.getFollowers(userId, limit);
      return {
        success: true,
        followers
      };
    } catch (error) {
      logger.error('Get followers error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get followers'
      };
    }
  }

  async getFollowing(userId: string, limit: number = 50): Promise<any> {
    try {
      const following = await this.socialService.getFollowing(userId, limit);
      return {
        success: true,
        following
      };
    } catch (error) {
      logger.error('Get following error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get following'
      };
    }
  }

  // ================== 좋아요 시스템 ==================
  
  async likeArtwork(userId: string, artwork: any): Promise<any> {
    try {
      const success = await this.socialService.likeArtwork(userId, artwork);
      return {
        success,
        message: success ? 'Artwork liked successfully' : 'Failed to like artwork'
      };
    } catch (error) {
      logger.error('Like artwork error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to like artwork'
      };
    }
  }

  async unlikeArtwork(userId: string, artworkId: string, sourcePlatform: string = 'local'): Promise<any> {
    try {
      const success = await this.socialService.unlikeArtwork(userId, artworkId, sourcePlatform);
      return {
        success,
        message: success ? 'Artwork unliked successfully' : 'Failed to unlike artwork'
      };
    } catch (error) {
      logger.error('Unlike artwork error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlike artwork'
      };
    }
  }

  async getArtworkLikeStatus(userId: string, artworkId: string, sourcePlatform: string = 'local'): Promise<any> {
    try {
      const isLiked = await this.socialService.isArtworkLiked(userId, artworkId, sourcePlatform);
      return {
        success: true,
        isLiked
      };
    } catch (error) {
      logger.error('Get artwork like status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get artwork like status'
      };
    }
  }

  async getUserLikedArtworks(userId: string, limit: number = 50): Promise<any> {
    try {
      const likedArtworks = await this.socialService.getUserLikedArtworks(userId, limit);
      return {
        success: true,
        likedArtworks
      };
    } catch (error) {
      logger.error('Get user liked artworks error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user liked artworks'
      };
    }
  }

  // ================== 북마크 시스템 ==================
  
  async createBookmarkCollection(userId: string, collection: any): Promise<any> {
    try {
      const newCollection = await this.socialService.createBookmarkCollection(userId, collection);
      return {
        success: true,
        collection: newCollection
      };
    } catch (error) {
      logger.error('Create bookmark collection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create bookmark collection'
      };
    }
  }

  async getUserBookmarkCollections(userId: string): Promise<any> {
    try {
      const collections = await this.socialService.getUserBookmarkCollections(userId);
      return {
        success: true,
        collections
      };
    } catch (error) {
      logger.error('Get user bookmark collections error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bookmark collections'
      };
    }
  }

  async addToBookmarkCollection(collectionId: string, artwork: any): Promise<any> {
    try {
      const success = await this.socialService.addToBookmarkCollection(collectionId, artwork);
      return {
        success,
        message: success ? 'Artwork added to collection successfully' : 'Failed to add artwork to collection'
      };
    } catch (error) {
      logger.error('Add to bookmark collection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add to bookmark collection'
      };
    }
  }

  async getBookmarkCollectionItems(collectionId: string): Promise<any> {
    try {
      const items = await this.socialService.getBookmarkCollectionItems(collectionId);
      return {
        success: true,
        items
      };
    } catch (error) {
      logger.error('Get bookmark collection items error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bookmark collection items'
      };
    }
  }

  // ================== 커뮤니티 포스트 ==================
  
  async createPost(userId: string, post: any): Promise<any> {
    try {
      const newPost = await this.socialService.createPost(userId, post);
      return {
        success: true,
        post: newPost
      };
    } catch (error) {
      logger.error('Create post error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post'
      };
    }
  }

  async getFeedPosts(userId?: string, limit: number = 20): Promise<any> {
    try {
      const posts = await this.socialService.getFeedPosts(userId, limit);
      return {
        success: true,
        posts
      };
    } catch (error) {
      logger.error('Get feed posts error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get feed posts'
      };
    }
  }

  async likePost(userId: string, postId: string): Promise<any> {
    try {
      const success = await this.socialService.likePost(userId, postId);
      return {
        success,
        message: success ? 'Post liked successfully' : 'Failed to like post'
      };
    } catch (error) {
      logger.error('Like post error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to like post'
      };
    }
  }

  async unlikePost(userId: string, postId: string): Promise<any> {
    try {
      const success = await this.socialService.unlikePost(userId, postId);
      return {
        success,
        message: success ? 'Post unliked successfully' : 'Failed to unlike post'
      };
    } catch (error) {
      logger.error('Unlike post error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlike post'
      };
    }
  }

  async getPostLikeStatus(userId: string, postId: string): Promise<any> {
    try {
      const isLiked = await this.socialService.isPostLiked(userId, postId);
      return {
        success: true,
        isLiked
      };
    } catch (error) {
      logger.error('Get post like status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get post like status'
      };
    }
  }

  // ================== 댓글 시스템 ==================
  
  async createComment(userId: string, comment: any): Promise<any> {
    try {
      const newComment = await this.socialService.createComment(userId, comment);
      return {
        success: true,
        comment: newComment
      };
    } catch (error) {
      logger.error('Create comment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create comment'
      };
    }
  }

  async getPostComments(postId: string): Promise<any> {
    try {
      const comments = await this.socialService.getPostComments(postId);
      return {
        success: true,
        comments
      };
    } catch (error) {
      logger.error('Get post comments error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get post comments'
      };
    }
  }

  // ================== 알림 시스템 ==================
  
  async getUserNotifications(userId: string, limit: number = 50): Promise<any> {
    try {
      const notifications = await this.socialService.getUserNotifications(userId, limit);
      const unreadCount = await this.socialService.getUnreadNotificationsCount(userId);
      
      return {
        success: true,
        notifications,
        unreadCount
      };
    } catch (error) {
      logger.error('Get user notifications error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notifications'
      };
    }
  }

  async markNotificationAsRead(userId: string, notificationId: string): Promise<any> {
    try {
      const success = await this.socialService.markNotificationAsRead(userId, notificationId);
      return {
        success,
        message: success ? 'Notification marked as read' : 'Failed to mark notification as read'
      };
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark notification as read'
      };
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<any> {
    try {
      const success = await this.socialService.markAllNotificationsAsRead(userId);
      return {
        success,
        message: success ? 'All notifications marked as read' : 'Failed to mark all notifications as read'
      };
    } catch (error) {
      logger.error('Mark all notifications as read error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark all notifications as read'
      };
    }
  }

  async getUnreadNotificationsCount(userId: string): Promise<any> {
    try {
      const count = await this.socialService.getUnreadNotificationsCount(userId);
      return {
        success: true,
        count
      };
    } catch (error) {
      logger.error('Get unread notifications count error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get unread notifications count'
      };
    }
  }
}