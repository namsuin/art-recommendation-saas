import { logger } from '../../shared/logger';
import { supabase } from './supabase';

interface Comment {
  id: string;
  user_id: string;
  target_type: 'artwork' | 'collection' | 'review';
  target_id: string;
  content: string;
  parent_comment_id?: string;
  likes_count: number;
  replies_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user_profile?: {
    display_name: string;
    avatar_url?: string;
  };
  replies?: Comment[];
  is_liked?: boolean; // 현재 사용자가 좋아요했는지
}

export class CommentSystemService {

  /**
   * 댓글 작성
   */
  async createComment(userId: string, commentData: {
    target_type: 'artwork' | 'collection' | 'review';
    target_id: string;
    content: string;
    parent_comment_id?: string;
  }): Promise<{
    success: boolean;
    comment?: Comment;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    // 내용 유효성 검사
    if (!commentData.content || commentData.content.trim().length < 1) {
      return { success: false, error: '댓글 내용을 입력해주세요.' };
    }

    if (commentData.content.length > 1000) {
      return { success: false, error: '댓글은 1000자를 초과할 수 없습니다.' };
    }

    try {
      // 대상 존재 확인
      const targetExists = await this.verifyTargetExists(commentData.target_type, commentData.target_id);
      if (!targetExists) {
        return { success: false, error: '댓글을 작성할 대상을 찾을 수 없습니다.' };
      }

      // 부모 댓글 존재 확인 (답글인 경우)
      if (commentData.parent_comment_id) {
        const { data: parentComment } = await supabase
          .from('comments')
          .select('id, target_type, target_id')
          .eq('id', commentData.parent_comment_id)
          .eq('is_deleted', false)
          .single();

        if (!parentComment) {
          return { success: false, error: '부모 댓글을 찾을 수 없습니다.' };
        }

        // 같은 대상에 대한 댓글인지 확인
        if (parentComment.target_type !== commentData.target_type || 
            parentComment.target_id !== commentData.target_id) {
          return { success: false, error: '잘못된 답글입니다.' };
        }
      }

      // 댓글 생성
      const { data: comment, error: insertError } = await supabase
        .from('comments')
        .insert({
          user_id: userId,
          target_type: commentData.target_type,
          target_id: commentData.target_id,
          content: commentData.content.trim(),
          parent_comment_id: commentData.parent_comment_id || null,
          likes_count: 0,
          replies_count: 0,
          is_deleted: false
        })
        .select(`
          *,
          user_profile:user_galleries(display_name, avatar_url)
        `)
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      return { success: true, comment };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '댓글 작성 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 댓글 목록 조회
   */
  async getComments(targetType: 'artwork' | 'collection' | 'review', targetId: string, options: {
    userId?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'newest' | 'oldest' | 'most_liked';
    includeReplies?: boolean;
  } = {}): Promise<{
    success: boolean;
    comments?: Comment[];
    total?: number;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    const { limit = 20, offset = 0, sortBy = 'newest', includeReplies = true, userId } = options;

    try {
      // 최상위 댓글만 조회 (parent_comment_id가 null인 것들)
      let query = supabase
        .from('comments')
        .select(`
          *,
          user_profile:user_galleries(display_name, avatar_url)
        `, { count: 'exact' })
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .eq('is_deleted', false)
        .is('parent_comment_id', null);

      // 정렬 적용
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'most_liked':
          query = query.order('likes_count', { ascending: false })
                      .order('created_at', { ascending: false });
          break;
      }

      const { data: comments, error, count } = await query
        .range(offset, offset + limit - 1);

      if (error) {
        return { success: false, error: error.message };
      }

      let processedComments = comments || [];

      // 답글 포함해서 조회
      if (includeReplies && processedComments.length > 0) {
        const commentIds = processedComments.map(c => c.id);
        
        const { data: replies } = await supabase
          .from('comments')
          .select(`
            *,
            user_profile:user_galleries(display_name, avatar_url)
          `)
          .in('parent_comment_id', commentIds)
          .eq('is_deleted', false)
          .order('created_at', { ascending: true });

        // 답글을 각 댓글에 연결
        processedComments = processedComments.map(comment => ({
          ...comment,
          replies: replies?.filter(reply => reply.parent_comment_id === comment.id) || []
        }));
      }

      // 현재 사용자의 좋아요 상태 확인
      if (userId && processedComments.length > 0) {
        const allCommentIds = [
          ...processedComments.map(c => c.id),
          ...processedComments.flatMap(c => c.replies?.map(r => r.id) || [])
        ];

        const { data: likedComments } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', userId)
          .in('comment_id', allCommentIds);

        const likedCommentIds = new Set(likedComments?.map(l => l.comment_id) || []);

        // 좋아요 상태 표시
        processedComments = processedComments.map(comment => ({
          ...comment,
          is_liked: likedCommentIds.has(comment.id),
          replies: comment.replies?.map(reply => ({
            ...reply,
            is_liked: likedCommentIds.has(reply.id)
          }))
        }));
      }

      return {
        success: true,
        comments: processedComments,
        total: count || 0
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '댓글 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 댓글 좋아요/좋아요 취소
   */
  async toggleCommentLike(userId: string, commentId: string): Promise<{
    success: boolean;
    isLiked: boolean;
    likesCount: number;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, isLiked: false, likesCount: 0, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      // 댓글 존재 확인
      const { data: comment } = await supabase
        .from('comments')
        .select('id, likes_count')
        .eq('id', commentId)
        .eq('is_deleted', false)
        .single();

      if (!comment) {
        return { success: false, isLiked: false, likesCount: 0, error: '댓글을 찾을 수 없습니다.' };
      }

      // 기존 좋아요 확인
      const { data: existingLike } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('comment_id', commentId)
        .single();

      let isLiked: boolean;

      if (existingLike) {
        // 좋아요 취소
        await supabase
          .from('comment_likes')
          .delete()
          .eq('id', existingLike.id);
        isLiked = false;
      } else {
        // 좋아요 추가
        await supabase
          .from('comment_likes')
          .insert({
            user_id: userId,
            comment_id: commentId
          });
        isLiked = true;
      }

      // 업데이트된 좋아요 수 조회
      const { data: updatedComment } = await supabase
        .from('comments')
        .select('likes_count')
        .eq('id', commentId)
        .single();

      return {
        success: true,
        isLiked,
        likesCount: updatedComment?.likes_count || 0
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
   * 댓글 수정
   */
  async updateComment(userId: string, commentId: string, content: string): Promise<{
    success: boolean;
    comment?: Comment;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    // 내용 유효성 검사
    if (!content || content.trim().length < 1) {
      return { success: false, error: '댓글 내용을 입력해주세요.' };
    }

    if (content.length > 1000) {
      return { success: false, error: '댓글은 1000자를 초과할 수 없습니다.' };
    }

    try {
      // 댓글 소유권 확인
      const { data: existingComment } = await supabase
        .from('comments')
        .select('user_id, is_deleted')
        .eq('id', commentId)
        .single();

      if (!existingComment || existingComment.is_deleted) {
        return { success: false, error: '댓글을 찾을 수 없습니다.' };
      }

      if (existingComment.user_id !== userId) {
        return { success: false, error: '댓글을 수정할 권한이 없습니다.' };
      }

      // 댓글 수정
      const { data: updatedComment, error: updateError } = await supabase
        .from('comments')
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .select(`
          *,
          user_profile:user_galleries(display_name, avatar_url)
        `)
        .single();

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true, comment: updatedComment };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '댓글 수정 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 댓글 삭제 (소프트 삭제)
   */
  async deleteComment(userId: string, commentId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      // 댓글 소유권 확인
      const { data: existingComment } = await supabase
        .from('comments')
        .select('user_id, is_deleted, replies_count')
        .eq('id', commentId)
        .single();

      if (!existingComment || existingComment.is_deleted) {
        return { success: false, error: '댓글을 찾을 수 없습니다.' };
      }

      if (existingComment.user_id !== userId) {
        return { success: false, error: '댓글을 삭제할 권한이 없습니다.' };
      }

      // 답글이 있는 경우 내용만 삭제하고 구조는 유지
      if (existingComment.replies_count > 0) {
        await supabase
          .from('comments')
          .update({
            content: '[삭제된 댓글입니다]',
            is_deleted: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', commentId);
      } else {
        // 답글이 없는 경우 완전 삭제
        await supabase
          .from('comments')
          .delete()
          .eq('id', commentId);
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '댓글 삭제 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 사용자가 작성한 댓글 목록
   */
  async getUserComments(userId: string, limit: number = 20, offset: number = 0): Promise<{
    success: boolean;
    comments?: (Comment & { target_info: any })[];
    total?: number;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      const { data: comments, error, count } = await supabase
        .from('comments')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { success: false, error: error.message };
      }

      // 대상 정보 조회
      const commentsWithTargetInfo = await Promise.all(
        (comments || []).map(async (comment) => {
          let targetInfo = null;
          
          try {
            switch (comment.target_type) {
              case 'artwork':
                const { data: artwork } = await supabase
                  .from('gallery_artworks')
                  .select('title, thumbnail_url')
                  .eq('id', comment.target_id)
                  .single();
                targetInfo = artwork;
                break;
              case 'collection':
                const { data: collection } = await supabase
                  .from('gallery_collections')
                  .select('title, cover_image_url')
                  .eq('id', comment.target_id)
                  .single();
                targetInfo = collection;
                break;
              case 'review':
                const { data: review } = await supabase
                  .from('artwork_reviews')
                  .select('title')
                  .eq('id', comment.target_id)
                  .single();
                targetInfo = review;
                break;
            }
          } catch (err) {
            logger.error('Failed to fetch target info:', err);
          }

          return {
            ...comment,
            target_info: targetInfo
          };
        })
      );

      return {
        success: true,
        comments: commentsWithTargetInfo,
        total: count || 0
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '사용자 댓글 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 댓글 통계 조회
   */
  async getCommentStats(targetType: 'artwork' | 'collection' | 'review', targetId: string): Promise<{
    success: boolean;
    stats?: {
      total_comments: number;
      total_replies: number;
      recent_activity: string | null;
    };
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      const { data: stats } = await supabase
        .from('comments')
        .select('parent_comment_id, created_at')
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      const totalComments = stats?.filter(c => !c.parent_comment_id).length || 0;
      const totalReplies = stats?.filter(c => c.parent_comment_id).length || 0;
      const recentActivity = stats && stats.length > 0 ? stats[0].created_at : null;

      return {
        success: true,
        stats: {
          total_comments: totalComments,
          total_replies: totalReplies,
          recent_activity: recentActivity
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '댓글 통계 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 대상 존재 확인
   */
  private async verifyTargetExists(targetType: 'artwork' | 'collection' | 'review', targetId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      let exists = false;

      switch (targetType) {
        case 'artwork':
          const { data: artwork } = await supabase
            .from('gallery_artworks')
            .select('id')
            .eq('id', targetId)
            .single();
          exists = !!artwork;
          break;
        case 'collection':
          const { data: collection } = await supabase
            .from('gallery_collections')
            .select('id')
            .eq('id', targetId)
            .single();
          exists = !!collection;
          break;
        case 'review':
          const { data: review } = await supabase
            .from('artwork_reviews')
            .select('id')
            .eq('id', targetId)
            .single();
          exists = !!review;
          break;
      }

      return exists;
    } catch (error) {
      return false;
    }
  }
}