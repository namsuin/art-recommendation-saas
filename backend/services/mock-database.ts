// Mock database service for development when Supabase is not available
import { logger } from '../../shared/logger';
export class MockDatabaseService {
  private users: Map<string, any> = new Map();
  private uploads: Map<string, any> = new Map();
  private artworks: any[] = [];
  private currentUserId: string | null = null;

  constructor() {
    // Initialize with some test users
    this.initializeTestUsers();
    
    // Initialize with some mock artworks
    this.artworks = [
      {
        id: "1",
        title: "모나리자",
        artist: "레오나르도 다 빈치",
        image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/687px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
        thumbnail_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/200px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
        keywords: ["portrait", "renaissance", "classical", "woman", "painting"],
        description: "레오나르도 다빈치의 걸작",
        price: 0,
        available: true,
        link: "https://en.wikipedia.org/wiki/Mona_Lisa",
        created_at: "2024-01-01T00:00:00Z"
      },
      {
        id: "2",
        title: "별이 빛나는 밤",
        artist: "빈센트 반 고흐",
        image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/757px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
        thumbnail_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/200px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
        keywords: ["impressionist", "night", "stars", "landscape", "swirls"],
        description: "반 고흐의 대표작",
        price: 0,
        available: true,
        link: "https://en.wikipedia.org/wiki/The_Starry_Night",
        created_at: "2024-01-02T00:00:00Z"
      },
      {
        id: "3",
        title: "진주 귀걸이를 한 소녀",
        artist: "요하네스 페르메이르",
        image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/687px-1665_Girl_with_a_Pearl_Earring.jpg",
        thumbnail_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/200px-1665_Girl_with_a_Pearl_Earring.jpg",
        keywords: ["baroque", "portrait", "pearl", "mystery", "dutch"],
        description: "네덜란드 바로크 시대의 걸작",
        price: 0,
        available: true,
        link: "https://en.wikipedia.org/wiki/Girl_with_a_Pearl_Earring",
        created_at: "2024-01-03T00:00:00Z"
      },
      {
        id: "4",
        title: "대파도",
        artist: "가츠시카 호쿠사이",
        image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/The_Great_Wave_off_Kanagawa.jpg/1280px-The_Great_Wave_off_Kanagawa.jpg",
        thumbnail_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/The_Great_Wave_off_Kanagawa.jpg/200px-The_Great_Wave_off_Kanagawa.jpg",
        keywords: ["japanese", "wave", "ocean", "ukiyo-e", "woodblock"],
        description: "일본 우키요에의 대표작",
        price: 0,
        available: true,
        link: "https://en.wikipedia.org/wiki/The_Great_Wave_off_Kanagawa",
        created_at: "2024-01-04T00:00:00Z"
      },
      {
        id: "5",
        title: "절규",
        artist: "에드바르드 뭉크",
        image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/473px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg",
        thumbnail_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/200px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg",
        keywords: ["expressionist", "scream", "emotion", "anxiety", "modern"],
        description: "표현주의의 상징적 작품",
        price: 0,
        available: true,
        link: "https://en.wikipedia.org/wiki/The_Scream",
        created_at: "2024-01-05T00:00:00Z"
      }
    ];
  }

  // Initialize test users for demonstration
  private initializeTestUsers() {
    const testUsers = [
      {
        id: "test-user-1",
        email: "john.doe@example.com",
        password: "password123",
        display_name: "John Doe",
        role: "user",
        subscription_tier: "free",
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        last_login: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        total_analyses: 5,
        lifetimeValue: 0
      },
      {
        id: "test-user-2",
        email: "jane.artist@example.com",
        password: "password123",
        display_name: "Jane Smith",
        role: "artist",
        subscription_tier: "premium",
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_login: new Date().toISOString(),
        total_analyses: 25,
        lifetimeValue: 99,
        artist_name: "Jane Smith Art Studio",
        artist_bio: "Contemporary digital artist specializing in abstract expressionism",
        specialties: ["디지털 아트 (Digital Art)", "일러스트레이션 (Illustration)", "혼합 매체 (Mixed Media)"],
        portfolioUrl: "https://janesmith.art",
        website: "https://janesmithstudio.com",
        socialMedia: {
          instagram: "@janesmithart",
          twitter: null
        },
        experience: "개인전 5회, 그룹전 20회 이상 참여. 서울대학교 미술대학 졸업. Adobe Creative Challenge 2023 수상."
      },
      {
        id: "test-user-3",
        email: "bob.wilson@example.com",
        password: "password123",
        display_name: "Bob Wilson",
        role: "user",
        subscription_tier: "standard",
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        last_login: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        total_analyses: 12,
        lifetimeValue: 29
      },
      {
        id: "admin-user",
        email: "admin@artrecommend.com",
        password: "admin123",
        display_name: "System Admin",
        role: "admin",
        subscription_tier: "admin",
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        last_login: new Date().toISOString(),
        total_analyses: 0,
        lifetimeValue: 0
      }
    ];

    testUsers.forEach(user => {
      this.users.set(user.id, user);
    });

    logger.info(`Initialized ${testUsers.length} test users in mock database`);
  }

  // Auth methods
  async signUp(email: string, password: string, displayName?: string, role?: string, artistInfo?: any) {
    // Check if user already exists
    for (const user of this.users.values()) {
      if (user.email === email) {
        return {
          success: false,
          error: "이미 존재하는 이메일입니다."
        };
      }
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const user = {
      id: userId,
      email,
      password, // In production, this should be hashed
      display_name: displayName || email.split('@')[0],
      role: role || 'user',
      subscription_tier: 'free',
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      total_analyses: 0,
      lifetimeValue: 0,
      upload_count: 0,
      last_upload_date: null,
      // Add artist info if provided
      ...(artistInfo && {
        artist_name: artistInfo.artist_name || null,
        artist_bio: artistInfo.artist_bio || null,
        specialties: artistInfo.specialties || [],
        portfolioUrl: artistInfo.portfolioUrl || null,
        website: artistInfo.website || null,
        socialMedia: artistInfo.socialMedia || { instagram: null, twitter: null },
        experience: artistInfo.experience || null
      })
    };

    this.users.set(userId, user);
    this.currentUserId = userId;

    logger.info(`New user registered: ${email} as ${role}`, artistInfo ? { artistFields: Object.keys(artistInfo) } : {});

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      message: "회원가입이 완료되었습니다."
    };
  }

  async signIn(email: string, password: string) {
    // Find user by email
    const user = Array.from(this.users.values()).find(u => u.email === email);
    
    if (user) {
      this.currentUserId = user.id;
      return {
        success: true,
        user,
        message: "로그인이 성공적으로 완료되었습니다."
      };
    }
    
    return {
      success: false,
      error: "이메일 또는 비밀번호가 올바르지 않습니다."
    };
  }

  async signOut() {
    this.currentUserId = null;
    return {
      success: true,
      message: "로그아웃되었습니다."
    };
  }

  async getCurrentUser() {
    if (!this.currentUserId) {
      return { success: false, error: "로그인이 필요합니다." };
    }
    
    const user = this.users.get(this.currentUserId);
    if (!user) {
      return { success: false, error: "사용자 정보를 찾을 수 없습니다." };
    }
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      profile: {
        id: user.id,
        email: user.email,
        display_name: user.display_name || user.email.split('@')[0],
        avatar_url: user.avatar_url || null,
        subscription_tier: user.subscription_tier || 'free',
        upload_count_today: user.upload_count || 0,
        role: user.role || 'user',
        artist_name: user.artist_name || null,
        artist_bio: user.artist_bio || null,
        artist_portfolio_url: user.artist_portfolio_url || null,
        artist_instagram: user.artist_instagram || null
      }
    };
  }

  async updateProfile(userId: string, updates: any) {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: "사용자를 찾을 수 없습니다." };
    }
    
    Object.assign(user, updates);
    this.users.set(userId, user);
    
    return {
      success: true,
      user
    };
  }

  // Get all users for admin dashboard
  async getAllUsers() {
    const allUsers = Array.from(this.users.values()).map(user => ({
      id: user.id,
      email: user.email,
      displayName: user.display_name || user.email.split('@')[0],
      display_name: user.display_name || user.email.split('@')[0],
      role: user.role || 'user',
      subscription_tier: user.subscription_tier || 'free',
      created_at: user.created_at || new Date().toISOString(),
      last_login: user.last_login || new Date().toISOString(),
      total_analyses: user.total_analyses || 0,
      lifetimeValue: user.lifetimeValue || 0,
      artist_name: user.artist_name || null,
      artist_bio: user.artist_bio || null,
      specialties: user.specialties || [],
      portfolioUrl: user.portfolioUrl || null,
      website: user.website || null,
      socialMedia: user.socialMedia || { instagram: null, twitter: null },
      experience: user.experience || null
    }));
    
    return allUsers;
  }

  // Update user by admin
  async updateUserByAdmin(userId: string, updates: any) {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: "사용자를 찾을 수 없습니다." };
    }
    
    // Update allowed fields
    const allowedFields = [
      'display_name', 'role', 'subscription_tier', 
      'artist_name', 'artist_bio', 'total_analyses', 'lifetimeValue',
      'specialties', 'portfolioUrl', 'website', 'socialMedia', 'experience'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        user[field] = updates[field];
      }
    });
    
    this.users.set(userId, user);
    logger.info(`Admin updated user ${userId}:`, updates);
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name || user.email.split('@')[0],
        display_name: user.display_name || user.email.split('@')[0],
        role: user.role || 'user',
        subscription_tier: user.subscription_tier || 'free',
        created_at: user.created_at || new Date().toISOString(),
        last_login: user.last_login || new Date().toISOString(),
        total_analyses: user.total_analyses || 0,
        lifetimeValue: user.lifetimeValue || 0,
        artist_name: user.artist_name || null,
        artist_bio: user.artist_bio || null,
        specialties: user.specialties || [],
        portfolioUrl: user.portfolioUrl || null,
        website: user.website || null,
        socialMedia: user.socialMedia || { instagram: null, twitter: null },
        experience: user.experience || null
      }
    };
  }

  // Upload limit methods
  async checkUploadLimit(userId: string) {
    const user = this.users.get(userId);
    if (!user) {
      return {
        canUpload: true,
        remainingUploads: 10,
        resetTime: null
      };
    }

    const today = new Date().toDateString();
    const lastUploadDate = user.last_upload_date;
    const todayUploads = lastUploadDate === today ? user.upload_count : 0;
    const remainingUploads = Math.max(0, 10 - todayUploads);

    return {
      canUpload: remainingUploads > 0,
      remainingUploads,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  async incrementUploadCount(userId: string) {
    const user = this.users.get(userId);
    if (!user) return;

    const today = new Date().toDateString();
    if (user.last_upload_date !== today) {
      user.upload_count = 1;
      user.last_upload_date = today;
    } else {
      user.upload_count += 1;
    }
    
    this.users.set(userId, user);
  }

  // Image upload method
  async uploadImage(file: any, userId: string) {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const imageUrl = `https://via.placeholder.com/400x400?text=Uploaded+Image`;
    
    const uploadRecord = {
      id: uploadId,
      user_id: userId,
      image_url: imageUrl,
      analysis_keywords: [],
      created_at: new Date().toISOString()
    };
    
    this.uploads.set(uploadId, uploadRecord);
    
    return {
      success: true,
      imageUrl,
      uploadId,
      message: "이미지가 성공적으로 업로드되었습니다."
    };
  }

  // Get artworks
  async getArtworks() {
    return {
      success: true,
      artworks: this.artworks
    };
  }

  // Get recommendations (simple keyword matching)
  async getRecommendations(keywords: string[] = []) {
    logger.info('🎯 Mock DB getting recommendations for keywords:', keywords);
    
    if (keywords.length === 0) {
      // Return random artworks if no keywords
      const shuffled = [...this.artworks].sort(() => 0.5 - Math.random());
      const recommendations = shuffled.slice(0, 3).map(artwork => ({
        artwork,
        similarity: Math.random() * 0.3 + 0.7, // 70-100% similarity
        reasons: ["AI 분석 결과", "색상 유사성", "스타일 매치"],
        matchingKeywords: ["artwork", "creative"]
      }));
      logger.info('📊 Returning random recommendations:', recommendations.length);
      return recommendations;
    }

    // Simple keyword matching with broader matching
    const matches = this.artworks
      .map(artwork => {
        const matchingKeywords = artwork.keywords.filter(k => 
          keywords.some(keyword => 
            k.toLowerCase().includes(keyword.toLowerCase()) ||
            keyword.toLowerCase().includes(k.toLowerCase()) ||
            // More flexible matching for common art terms
            (keyword.toLowerCase().includes('art') && k.toLowerCase().includes('art')) ||
            (keyword.toLowerCase().includes('paint') && k.toLowerCase().includes('paint')) ||
            (keyword.toLowerCase().includes('visual') && k.toLowerCase().includes('visual'))
          )
        );
        
        // Even if no exact keyword matches, give some similarity for art-related content
        let similarity = matchingKeywords.length / Math.max(artwork.keywords.length, keywords.length);
        if (similarity === 0 && keywords.some(k => k.toLowerCase().includes('art'))) {
          similarity = 0.3; // Basic art similarity
        }
        
        return {
          artwork,
          similarity,
          matchingKeywords,
          reasons: matchingKeywords.length > 0 ? 
            [`${matchingKeywords.join(', ')} 키워드 매치`] : 
            ["시각적 유사성", "아트워크 추천"]
        };
      })
      .filter(match => match.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    logger.info('📊 Keyword matches found:', matches.length);
    
    // Always return at least some recommendations
    if (matches.length === 0) {
      logger.info('🔄 No matches found, using fallback recommendations');
      return this.getRecommendations(); // Fallback to random
    }
    
    return matches;
  }

  // Save recommendations
  async saveRecommendations(userId: string, uploadId: string, recommendations: any[]) {
    // Mock implementation - just return success
    return { success: true };
  }

  // Get user uploads
  async getUserUploads(userId: string, limit: number = 20) {
    const userUploads = Array.from(this.uploads.values())
      .filter(upload => upload.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    return {
      success: true,
      uploads: userUploads
    };
  }

  // Update user role (for artist upgrade)
  async updateUserRole(userId: string, email: string, role: string, artistData?: any) {
    // 먼저 ID로 사용자 찾기
    let user = this.users.get(userId);
    
    if (!user) {
      // ID로 찾을 수 없으면 이메일로 검색
      for (const [id, userData] of this.users.entries()) {
        if (userData.email === email) {
          user = userData;
          userId = id;
          break;
        }
      }
    }
    
    if (!user) {
      logger.info(`📝 Mock: Creating new user for role update - ${email}`);
      // 사용자가 없으면 새로 생성
      user = {
        id: userId,
        email: email,
        role: 'user',
        display_name: email.split('@')[0],
        subscription_tier: 'free',
        upload_count: 0,
        last_upload_date: null,
        created_at: new Date().toISOString()
      };
    }
    
    // 역할 업데이트
    user.role = role;
    if (artistData) {
      user.artist_name = artistData.artist_name;
      user.artist_bio = artistData.artist_bio;
      user.artist_portfolio_url = artistData.artist_portfolio_url;
      user.artist_instagram = artistData.artist_instagram;
    }
    user.updated_at = new Date().toISOString();
    
    this.users.set(userId, user);
    
    logger.info(`✅ Mock: User role updated to ${role} for ${email}`);
    
    return {
      data: [user],
      error: null
    };
  }

  // Test connection
  async testConnection() {
    return true;
  }
}

export const mockDB = new MockDatabaseService();