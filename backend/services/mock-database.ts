// Mock database service for development when Supabase is not available
export class MockDatabaseService {
  private users: Map<string, any> = new Map();
  private uploads: Map<string, any> = new Map();
  private artworks: any[] = [];
  private currentUserId: string | null = null;

  constructor() {
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
        created_at: "2024-01-05T00:00:00Z"
      }
    ];
  }

  // Auth methods
  async signUp(email: string, password: string, displayName?: string) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const user = {
      id: userId,
      email,
      display_name: displayName || email.split('@')[0],
      created_at: new Date().toISOString(),
      upload_count: 0,
      last_upload_date: null
    };
    
    this.users.set(userId, user);
    this.currentUserId = userId;
    
    return {
      success: true,
      user,
      message: "회원가입이 성공적으로 완료되었습니다."
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
    return {
      success: true,
      user
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
    if (keywords.length === 0) {
      // Return random artworks if no keywords
      const shuffled = [...this.artworks].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 3).map(artwork => ({
        artwork,
        similarity: Math.random() * 0.3 + 0.7, // 70-100% similarity
        reasons: ["AI 분석 결과", "색상 유사성", "스타일 매치"]
      }));
    }

    // Simple keyword matching
    const matches = this.artworks
      .map(artwork => {
        const matchingKeywords = artwork.keywords.filter(k => 
          keywords.some(keyword => 
            k.toLowerCase().includes(keyword.toLowerCase()) ||
            keyword.toLowerCase().includes(k.toLowerCase())
          )
        );
        
        const similarity = matchingKeywords.length / Math.max(artwork.keywords.length, keywords.length);
        
        return {
          artwork,
          similarity,
          matchingKeywords,
          reasons: matchingKeywords.length > 0 ? 
            [`${matchingKeywords.join(', ')} 키워드 매치`] : 
            ["스타일 유사성"]
        };
      })
      .filter(match => match.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    return matches.length > 0 ? matches : this.getRecommendations(); // Fallback to random
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

  // Test connection
  async testConnection() {
    return true;
  }
}

export const mockDB = new MockDatabaseService();