// Local CLIP service disabled for deployment compatibility
import type { LocalClipResult } from '../../shared/types';

export class LocalClipService {
  private isEnabled: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    console.log('🔄 Local CLIP service disabled for deployment compatibility');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('⚠️ Local CLIP service disabled - using fallback analysis');
    this.isInitialized = true;
    this.isEnabled = false;
  }

  async analyzeImage(imageBuffer: Buffer): Promise<LocalClipResult | null> {
    console.warn('Local CLIP service is disabled - returning null');
    return null;
  }

  async testService(): Promise<boolean> {
    return false;
  }

  isServiceEnabled(): boolean {
    return false;
  }

  extractKeywords(result: LocalClipResult): string[] {
    return [];
  }
}