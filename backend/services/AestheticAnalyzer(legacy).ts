// ai-service/analyzers/aesthetic-analyzer.ts

import type { GoogleVisionResult } from '../../shared/types';

export type AestheticAnalysisResult = {
  aestheticScore: number;        // 0 ~ 100
  styleTags: string[];           // e.g. ['abstract', 'minimal']
  moodTags: string[];            // e.g. ['calm', 'dark']
  complexity: 'low' | 'medium' | 'high';
  isArtLike: boolean;
};

export class AestheticAnalyzer {
  static analyze(vision: GoogleVisionResult): AestheticAnalysisResult {
    const labels = vision.labels ?? [];
    const objects = vision.objects ?? [];

    // -----------------------------
    // 1. 스타일 태그 추출
    // -----------------------------
    const styleTags = new Set<string>();

    labels.forEach(l => {
      const d = l.description.toLowerCase();

      if (d.includes('abstract')) styleTags.add('abstract');
      if (d.includes('minimal')) styleTags.add('minimal');
      if (d.includes('surreal')) styleTags.add('surreal');
      if (d.includes('illustration')) styleTags.add('illustration');
      if (d.includes('painting')) styleTags.add('painting');
      if (d.includes('sketch')) styleTags.add('sketch');
      if (d.includes('photograph')) styleTags.add('photography');
      if (d.includes('modern')) styleTags.add('modern');
      if (d.includes('vintage')) styleTags.add('vintage');
    });

    // -----------------------------
    // 2. 무드 태그 추출
    // -----------------------------
    const moodTags = new Set<string>();

    labels.forEach(l => {
      const d = l.description.toLowerCase();

      if (d.includes('dark')) moodTags.add('dark');
      if (d.includes('bright')) moodTags.add('bright');
      if (d.includes('colorful')) moodTags.add('colorful');
      if (d.includes('monochrome')) moodTags.add('monochrome');
      if (d.includes('calm')) moodTags.add('calm');
      if (d.includes('dramatic')) moodTags.add('dramatic');
    });

    // -----------------------------
    // 3. 복잡도 판단
    // -----------------------------
    const signalCount = labels.length + objects.length;

    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (signalCount > 12) complexity = 'high';
    else if (signalCount > 6) complexity = 'medium';

    // -----------------------------
    // 4. 미적 점수 계산
    // -----------------------------
    let score = 50; // baseline

    // 예술 관련 신호
    if (vision.visionFilter?.isArtRelated) score += 15;

    // 사람 포함 → 예술성 가중치 약간 낮춤
    if (vision.visionFilter?.hasPerson) score -= 5;

    // 스타일/무드 다양성
    score += styleTags.size * 3;
    score += moodTags.size * 2;

    // 복잡도 보정
    if (complexity === 'high') score += 5;
    if (complexity === 'low') score -= 3;

    // 점수 클램프
    score = Math.max(0, Math.min(100, score));

    // -----------------------------
    // 5. 최종 결과
    // -----------------------------
    return {
      aestheticScore: score,
      styleTags: Array.from(styleTags),
      moodTags: Array.from(moodTags),
      complexity,
      isArtLike: score >= 60
    };
  }
}
