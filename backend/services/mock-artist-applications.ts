// Mock Artist Applications Storage
interface ArtistApplication {
  id: string;
  user_id: string;
  email: string;
  artist_name: string;
  bio: string;
  portfolio_url?: string;
  instagram_url?: string;
  experience: string;
  specialties: string[];
  statement: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
}

class MockArtistApplications {
  private applications: Map<string, ArtistApplication> = new Map();
  
  constructor() {
    // 샘플 데이터 추가
    const sampleApp: ArtistApplication = {
      id: 'sample-app-1',
      user_id: 'sample-user-1',
      email: 'artist@example.com',
      artist_name: '김예술',
      bio: '현대미술을 전공하고 10년간 작품 활동을 해왔습니다. 주로 추상화와 설치미술을 다룹니다.',
      portfolio_url: 'https://portfolio.example.com',
      instagram_url: '@kimartist',
      experience: 'professional',
      specialties: ['회화', '설치미술', '디지털아트'],
      statement: '예술을 통해 사회와 소통하고 새로운 시각을 제시하고자 합니다.',
      status: 'pending',
      applied_at: new Date(Date.now() - 86400000).toISOString() // 1일 전
    };
    
    this.applications.set(sampleApp.id, sampleApp);
  }
  
  async create(data: Omit<ArtistApplication, 'id' | 'applied_at'>) {
    const id = `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const application: ArtistApplication = {
      ...data,
      id,
      applied_at: new Date().toISOString()
    };
    
    this.applications.set(id, application);
    
    console.log('📝 Mock: Artist application created:', {
      id,
      artist_name: application.artist_name,
      email: application.email
    });
    
    return { data: [application], error: null };
  }
  
  async getAll() {
    const apps = Array.from(this.applications.values())
      .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime());
    
    return { data: apps, error: null };
  }
  
  async getByUserId(userId: string) {
    const apps = Array.from(this.applications.values())
      .filter(app => app.user_id === userId);
    
    return { data: apps, error: null };
  }
  
  async updateStatus(applicationId: string, status: 'approved' | 'rejected', reviewNotes?: string) {
    const app = this.applications.get(applicationId);
    
    if (!app) {
      return { data: null, error: { message: 'Application not found' } };
    }
    
    app.status = status;
    app.reviewed_at = new Date().toISOString();
    app.review_notes = reviewNotes;
    
    console.log(`✅ Mock: Application ${status}:`, applicationId);
    
    return { data: app, error: null };
  }
}

export const mockArtistApplications = new MockArtistApplications();