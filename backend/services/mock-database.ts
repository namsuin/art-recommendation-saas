/**
 * Mock Database Service
 * In-memory database replacement for development
 */

import { serverLogger } from "../../shared/logger";

export interface User {
  id: string;
  email: string;
  password?: string;
  role: 'user' | 'artist' | 'admin';
  name?: string;
  created_at: string;
  updated_at: string;
}

export interface Artwork {
  id: string;
  artist_id: string;
  title: string;
  description?: string;
  image_url: string;
  price?: number;
  tags?: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

class MockDatabase {
  private users: Map<string, User> = new Map();
  private artworks: Map<string, Artwork> = new Map();
  private sessions: Map<string, { userId: string; expiresAt: Date }> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Mock users
    const mockUsers: User[] = [
      {
        id: 'admin-1',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        name: 'Admin User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'artist-1',
        email: 'artist@example.com',
        password: 'artist123',
        role: 'artist',
        name: 'Test Artist',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-1',
        email: 'user@example.com',
        password: 'user123',
        role: 'user',
        name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    mockUsers.forEach(user => {
      this.users.set(user.id, user);
    });

    // Mock artworks
    const mockArtworks: Artwork[] = [
      {
        id: 'art-1',
        artist_id: 'artist-1',
        title: 'Abstract Composition #1',
        description: 'A vibrant abstract painting',
        image_url: 'https://picsum.photos/400/600?random=1',
        price: 1500,
        tags: ['abstract', 'colorful', 'modern'],
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'art-2',
        artist_id: 'artist-1',
        title: 'Urban Landscape',
        description: 'City skyline at sunset',
        image_url: 'https://picsum.photos/400/600?random=2',
        price: 2000,
        tags: ['landscape', 'urban', 'sunset'],
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    mockArtworks.forEach(artwork => {
      this.artworks.set(artwork.id, artwork);
    });

    serverLogger.info(`Initialized mock database with ${mockUsers.length} users and ${mockArtworks.length} artworks`);
  }

  // User methods
  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = Array.from(this.users.values());
    return users.find(u => u.email === email) || null;
  }

  async updateUserRole(userId: string, role: 'user' | 'artist' | 'admin'): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    
    user.role = role;
    user.updated_at = new Date().toISOString();
    return user;
  }

  // Artwork methods
  async createArtwork(artwork: Omit<Artwork, 'id' | 'created_at' | 'updated_at'>): Promise<Artwork> {
    const newArtwork: Artwork = {
      ...artwork,
      id: `art-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.artworks.set(newArtwork.id, newArtwork);
    return newArtwork;
  }

  async getArtworks(filter?: { status?: string; artist_id?: string }): Promise<Artwork[]> {
    let artworks = Array.from(this.artworks.values());
    
    if (filter?.status) {
      artworks = artworks.filter(a => a.status === filter.status);
    }
    if (filter?.artist_id) {
      artworks = artworks.filter(a => a.artist_id === filter.artist_id);
    }
    
    return artworks;
  }

  async updateArtworkStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<Artwork | null> {
    const artwork = this.artworks.get(id);
    if (!artwork) return null;
    
    artwork.status = status;
    artwork.updated_at = new Date().toISOString();
    return artwork;
  }

  // Session methods
  async createSession(userId: string): Promise<string> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    this.sessions.set(sessionId, { userId, expiresAt });
    return sessionId;
  }

  async getSession(sessionId: string): Promise<{ userId: string } | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    return { userId: session.userId };
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  // Stats methods
  getStats() {
    return {
      users: {
        total: this.users.size,
        byRole: {
          admin: Array.from(this.users.values()).filter(u => u.role === 'admin').length,
          artist: Array.from(this.users.values()).filter(u => u.role === 'artist').length,
          user: Array.from(this.users.values()).filter(u => u.role === 'user').length
        }
      },
      artworks: {
        total: this.artworks.size,
        byStatus: {
          pending: Array.from(this.artworks.values()).filter(a => a.status === 'pending').length,
          approved: Array.from(this.artworks.values()).filter(a => a.status === 'approved').length,
          rejected: Array.from(this.artworks.values()).filter(a => a.status === 'rejected').length
        }
      },
      sessions: this.sessions.size
    };
  }
}

export const mockDB = new MockDatabase();