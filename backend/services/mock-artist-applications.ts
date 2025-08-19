/**
 * Mock Artist Applications Service
 * Handles artist application management without database dependency
 */

import { serverLogger } from "../../shared/logger";

export interface ArtistApplication {
  id: string;
  user_id: string;
  user_email: string;
  artist_name: string;
  portfolio_url?: string;
  artist_statement: string;
  art_type: string[];
  experience_years: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

class MockArtistApplicationService {
  private applications: Map<string, ArtistApplication> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    const mockApplications: ArtistApplication[] = [
      {
        id: 'app-1',
        user_id: 'user-123',
        user_email: 'artist1@example.com',
        artist_name: '김민수',
        portfolio_url: 'https://portfolio.example.com',
        artist_statement: '추상표현주의를 기반으로 한 현대미술 작가입니다.',
        art_type: ['painting', 'sculpture'],
        experience_years: 5,
        status: 'pending',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'app-2',
        user_id: 'user-456',
        user_email: 'artist2@example.com',
        artist_name: '이지은',
        portfolio_url: 'https://artstation.com/artist2',
        artist_statement: '디지털 아트와 일러스트레이션을 전문으로 합니다.',
        art_type: ['digital', 'illustration'],
        experience_years: 3,
        status: 'pending',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    mockApplications.forEach(app => {
      this.applications.set(app.id, app);
    });

    serverLogger.info(`Initialized ${mockApplications.length} mock artist applications`);
  }

  async createApplication(data: Omit<ArtistApplication, 'id' | 'created_at' | 'status'>): Promise<ArtistApplication> {
    const application: ArtistApplication = {
      ...data,
      id: `app-${Date.now()}`,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    this.applications.set(application.id, application);
    serverLogger.info(`Created artist application: ${application.id}`);
    return application;
  }

  async getApplications(status?: 'pending' | 'approved' | 'rejected'): Promise<ArtistApplication[]> {
    const apps = Array.from(this.applications.values());
    if (status) {
      return apps.filter(app => app.status === status);
    }
    return apps;
  }

  async getApplicationById(id: string): Promise<ArtistApplication | null> {
    return this.applications.get(id) || null;
  }

  async getApplicationByUserId(userId: string): Promise<ArtistApplication | null> {
    const apps = Array.from(this.applications.values());
    return apps.find(app => app.user_id === userId) || null;
  }

  async approveApplication(id: string, reviewedBy: string): Promise<ArtistApplication | null> {
    const application = this.applications.get(id);
    if (!application) return null;

    application.status = 'approved';
    application.reviewed_at = new Date().toISOString();
    application.reviewed_by = reviewedBy;

    serverLogger.info(`Approved artist application: ${id}`);
    return application;
  }

  async rejectApplication(id: string, reviewedBy: string, reason: string): Promise<ArtistApplication | null> {
    const application = this.applications.get(id);
    if (!application) return null;

    application.status = 'rejected';
    application.reviewed_at = new Date().toISOString();
    application.reviewed_by = reviewedBy;
    application.rejection_reason = reason;

    serverLogger.info(`Rejected artist application: ${id}`);
    return application;
  }

  async deleteApplication(id: string): Promise<boolean> {
    const deleted = this.applications.delete(id);
    if (deleted) {
      serverLogger.info(`Deleted artist application: ${id}`);
    }
    return deleted;
  }

  getStats() {
    const apps = Array.from(this.applications.values());
    return {
      total: apps.length,
      pending: apps.filter(a => a.status === 'pending').length,
      approved: apps.filter(a => a.status === 'approved').length,
      rejected: apps.filter(a => a.status === 'rejected').length
    };
  }
}

export const mockArtistApplications = new MockArtistApplicationService();