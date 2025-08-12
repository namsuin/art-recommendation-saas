import { Response } from '../utils/response';

interface InstagramPost {
  id: string;
  media_url: string;
  caption?: string;
  permalink: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  timestamp: string;
  username?: string;
}

interface InstagramProfile {
  username: string;
  profile_picture_url?: string;
  media_count?: number;
  followers_count?: number;
  biography?: string;
}

export class InstagramIntegrationService {
  private readonly INSTAGRAM_API_BASE = 'https://graph.instagram.com/v18.0';
  
  /**
   * Scrape Instagram profile using web scraping approach
   * Since Instagram API requires authentication, we'll use a web scraping approach
   */
  async fetchInstagramProfile(username: string): Promise<{ profile: InstagramProfile; posts: InstagramPost[] }> {
    try {
      // Clean username (remove @ if present)
      const cleanUsername = username.replace('@', '').replace('/', '');
      
      // For demo purposes, we'll fetch publicly available data
      // In production, you'd need Instagram Basic Display API with proper authentication
      
      // Fetch Instagram page HTML
      const response = await fetch(`https://www.instagram.com/${cleanUsername}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Instagram profile: ${response.status}`);
      }

      const html = await response.text();
      
      // Extract JSON data from the HTML
      const jsonMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
      
      let profileData: InstagramProfile = {
        username: cleanUsername,
        biography: 'Instagram artist'
      };
      
      let posts: InstagramPost[] = [];

      if (jsonMatch && jsonMatch[1]) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);
          
          if (jsonData['@type'] === 'ProfilePage') {
            profileData = {
              username: jsonData.name || cleanUsername,
              profile_picture_url: jsonData.image,
              biography: jsonData.description || 'Instagram artist',
              followers_count: jsonData.interactionStatistic?.userInteractionCount
            };
          }
        } catch (e) {
          console.error('Failed to parse Instagram JSON-LD data:', e);
        }
      }

      // For actual implementation, you would need to:
      // 1. Use Instagram Basic Display API with OAuth
      // 2. Or use a third-party service like RapidAPI
      // 3. Or implement more sophisticated web scraping
      
      // Mock data for demonstration
      posts = await this.getMockInstagramPosts(cleanUsername);

      return { profile: profileData, posts };
    } catch (error) {
      console.error('Instagram fetch error:', error);
      throw error;
    }
  }

  /**
   * Get mock Instagram posts for demonstration
   * In production, replace with actual API calls
   */
  private async getMockInstagramPosts(username: string): Promise<InstagramPost[]> {
    // For the demo, return sample artwork-like posts
    return [
      {
        id: 'ig_1',
        media_url: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=800',
        caption: 'Abstract art piece exploring color and form #art #abstract',
        permalink: `https://www.instagram.com/p/sample1/`,
        media_type: 'IMAGE',
        timestamp: new Date().toISOString(),
        username
      },
      {
        id: 'ig_2',
        media_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800',
        caption: 'Modern sculpture installation #sculpture #modernart',
        permalink: `https://www.instagram.com/p/sample2/`,
        media_type: 'IMAGE',
        timestamp: new Date().toISOString(),
        username
      },
      {
        id: 'ig_3',
        media_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc81?w=800',
        caption: 'Digital art exploration #digitalart #creative',
        permalink: `https://www.instagram.com/p/sample3/`,
        media_type: 'IMAGE',
        timestamp: new Date().toISOString(),
        username
      }
    ];
  }

  /**
   * Import Instagram posts as artworks
   */
  async importAsArtworks(username: string) {
    try {
      const { profile, posts } = await this.fetchInstagramProfile(username);
      
      // Transform Instagram posts to artwork format
      const artworks = posts
        .filter(post => post.media_type === 'IMAGE')
        .map(post => ({
          id: post.id,
          title: this.extractTitleFromCaption(post.caption),
          artist: profile.username,
          artist_bio: profile.biography,
          image_url: post.media_url,
          description: post.caption || '',
          source: 'instagram',
          source_url: post.permalink,
          tags: this.extractHashtags(post.caption),
          created_at: post.timestamp,
          metadata: {
            instagram_id: post.id,
            instagram_username: username,
            followers_count: profile.followers_count
          }
        }));

      return Response.success({
        profile,
        artworks,
        message: `Successfully imported ${artworks.length} artworks from @${username}`
      });
    } catch (error) {
      return Response.error('Failed to import Instagram posts', 500);
    }
  }

  /**
   * Extract title from Instagram caption
   */
  private extractTitleFromCaption(caption?: string): string {
    if (!caption) return 'Untitled';
    
    // Get first line or first 50 characters
    const firstLine = caption.split('\n')[0];
    const title = firstLine.length > 50 
      ? firstLine.substring(0, 47) + '...'
      : firstLine;
    
    // Remove hashtags from title
    return title.replace(/#\w+/g, '').trim() || 'Untitled';
  }

  /**
   * Extract hashtags from caption
   */
  private extractHashtags(caption?: string): string[] {
    if (!caption) return [];
    
    const hashtags = caption.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.replace('#', '').toLowerCase());
  }

  /**
   * Fetch using Instagram Graph API (requires access token)
   */
  async fetchWithGraphAPI(accessToken: string, userId: string) {
    try {
      const response = await fetch(
        `${this.INSTAGRAM_API_BASE}/${userId}/media?fields=id,caption,media_type,media_url,permalink,timestamp&access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch from Instagram API');
      }

      const data = await response.json();
      return Response.success(data);
    } catch (error) {
      return Response.error('Instagram API error', 500);
    }
  }
}

export const instagramService = new InstagramIntegrationService();