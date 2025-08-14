import { logger } from '../../shared/logger';
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
    const samplePending: ArtistApplication = {
      id: 'sample-app-pending',
      user_id: 'sample-user-1',
      email: 'artist.pending@example.com',
      artist_name: '김대기',
      bio: '현대미술을 전공하고 10년간 작품 활동을 해왔습니다. 주로 추상화와 설치미술을 다룹니다.',
      portfolio_url: 'https://portfolio.example.com',
      instagram_url: '@kimartist',
      experience: 'professional',
      specialties: ['회화', '설치미술', '디지털아트'],
      statement: '예술을 통해 사회와 소통하고 새로운 시각을 제시하고자 합니다.',
      status: 'pending',
      applied_at: new Date(Date.now() - 86400000).toISOString() // 1일 전
    };

    const sampleApproved: ArtistApplication = {
      id: 'sample-app-approved',
      user_id: 'sample-user-2',
      email: 'artist.approved@example.com',
      artist_name: '박승인',
      bio: '서양화를 전공한 전문 작가로, 다양한 개인전과 단체전에 참여한 경험이 있습니다.',
      portfolio_url: 'https://approvedartist.portfolio.com',
      instagram_url: '@parkapproved',
      experience: 'professional',
      specialties: ['회화', '조각', '설치미술'],
      statement: '예술을 통한 감정의 표현과 사회적 메시지 전달을 중요하게 생각합니다.',
      status: 'approved',
      applied_at: new Date(Date.now() - 172800000).toISOString(), // 2일 전
      reviewed_at: new Date(Date.now() - 86400000).toISOString(), // 1일 전
      review_notes: '우수한 작품 포트폴리오와 전문성을 갖춘 작가입니다.'
    };

    const sampleRejected: ArtistApplication = {
      id: 'sample-app-rejected',
      user_id: 'sample-user-3',
      email: 'artist.rejected@example.com',
      artist_name: '이거부',
      bio: '신진 작가로 활동하며 새로운 스타일의 작품을 시도하고 있습니다.',
      portfolio_url: 'https://newartist.portfolio.com',
      instagram_url: '@leerejected',
      experience: 'intermediate',
      specialties: ['디지털아트', '혼합매체'],
      statement: '전통과 현대를 아우르는 새로운 예술 표현을 추구합니다.',
      status: 'rejected',
      applied_at: new Date(Date.now() - 259200000).toISOString(), // 3일 전
      reviewed_at: new Date(Date.now() - 172800000).toISOString(), // 2일 전
      review_notes: '포트폴리오가 아직 부족하여 거부합니다. 더 많은 작품 준비 후 재신청 바랍니다.'
    };
    
    // 추가 테스트 신청 생성
    const additionalPending: ArtistApplication = {
      id: 'sample-app-pending2',
      user_id: 'sample-user-4',
      email: 'artist.test@example.com',
      artist_name: '최테스트',
      bio: '신진 작가로 활동하고 있으며 테스트용 신청서입니다.',
      portfolio_url: 'https://testartist.portfolio.com',
      instagram_url: '@testartist',
      experience: 'beginner',
      specialties: ['디지털아트', '일러스트'],
      statement: '테스트를 통해 시스템을 확인하고자 합니다.',
      status: 'pending',
      applied_at: new Date(Date.now() - 43200000).toISOString() // 12시간 전
    };

    this.applications.set(samplePending.id, samplePending);
    this.applications.set(sampleApproved.id, sampleApproved);
    this.applications.set(sampleRejected.id, sampleRejected);
    this.applications.set(additionalPending.id, additionalPending);
  }
  
  async create(data: Omit<ArtistApplication, 'id' | 'applied_at'>) {
    const id = `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const application: ArtistApplication = {
      ...data,
      id,
      applied_at: new Date().toISOString()
    };
    
    this.applications.set(id, application);
    
    logger.info('📝 Mock: Artist application created:', {
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
    
    logger.info(`✅ Mock: Application ${status}:`, applicationId);
    
    return { data: app, error: null };
  }

  async update(applicationId: string, data: Partial<Pick<ArtistApplication, 'artist_name' | 'bio' | 'statement' | 'portfolio_url' | 'instagram_url' | 'experience' | 'specialties'>>) {
    const app = this.applications.get(applicationId);
    
    if (!app) {
      return { data: null, error: { message: 'Application not found' } };
    }
    
    // 업데이트 가능한 필드만 수정
    Object.keys(data).forEach(key => {
      if (data[key as keyof typeof data] !== undefined && data[key as keyof typeof data] !== null) {
        (app as any)[key] = data[key as keyof typeof data];
      }
    });
    
    logger.info('📝 Mock: Artist application updated:', {
      id: applicationId,
      artist_name: app.artist_name,
      updates: Object.keys(data)
    });
    
    return { data: app, error: null };
  }

  async delete(applicationId: string) {
    const app = this.applications.get(applicationId);
    
    if (!app) {
      return { error: { message: 'Application not found' } };
    }
    
    this.applications.delete(applicationId);
    
    logger.info('🗑️ Mock: Artist application deleted:', applicationId);
    
    return { error: null };
  }
}

export const mockArtistApplications = new MockArtistApplications();