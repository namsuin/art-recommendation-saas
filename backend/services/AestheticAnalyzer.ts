import type { GoogleVisionResult } from '../../shared/types';

export type AestheticProfile = {
  moods: string[];
  styles: string[];
  colorTones: string[];
  keywords: string[];
};

export class AestheticAnalyzer {
  analyze(result: GoogleVisionResult): AestheticProfile {
    const moods = new Set<string>();
    const styles = new Set<string>();
    const colorTones = new Set<string>();
    const keywords = new Set<string>();

    /* -------------------------
       1. 색감 → 분위기 / 톤
    -------------------------- */

    const colors = result.colors || [];

    const avgBrightness = this.getAverageBrightness(colors);
    const colorVariance = this.getColorVariance(colors);

    if (avgBrightness < 80) moods.add('dark');
    if (avgBrightness >= 80 && avgBrightness < 160) moods.add('calm');
    if (avgBrightness >= 160) moods.add('bright');

    if (colorVariance < 40) {
      colorTones.add('muted');
      moods.add('minimal');
    } else {
      colorTones.add('vivid');
      moods.add('dynamic');
    }

    /* -------------------------
       2. 라벨 → 미술 스타일
    -------------------------- */

    result.labels.forEach(label => {
      const desc = label.description.toLowerCase();

      if (label.score < 0.3) return;

      keywords.add(desc);

      if (desc.includes('abstract')) styles.add('abstract');
      if (desc.includes('minimal')) styles.add('minimal');
      if (desc.includes('surreal')) styles.add('surreal');
      if (desc.includes('impression')) styles.add('impressionism');
      if (desc.includes('expression')) styles.add('expressionism');
      if (desc.includes('modern')) styles.add('modern');
      if (desc.includes('contemporary')) styles.add('contemporary');

      if (desc.includes('portrait')) styles.add('figurative');
      if (desc.includes('landscape')) styles.add('landscape');
    });

    /* -------------------------
       3. 오브젝트 → 감정 보정
    -------------------------- */

    result.objects.forEach(obj => {
      if (obj.score < 0.4) return;

      const name = obj.name.toLowerCase();
      keywords.add(name);

      if (name.includes('person') || name.includes('face')) {
        moods.add('introspective');
      }

      if (name.includes('flower') || name.includes('plant')) {
        moods.add('soft');
      }

      if (name.includes('building') || name.includes('architecture')) {
        styles.add('structural');
      }
    });

    /* -------------------------
       4. 기본값 보정
    -------------------------- */

    if (styles.size === 0) styles.add('contemporary');
    if (moods.size === 0) moods.add('neutral');

    return {
      moods: Array.from(moods),
      styles: Array.from(styles),
      colorTones: Array.from(colorTones),
      keywords: Array.from(keywords),
    };
  }

  /* =========================
     내부 헬퍼 함수들
  ========================== */

  private getAverageBrightness(colors: any[]): number {
    if (colors.length === 0) return 128;

    const total = colors.reduce((sum, c) => {
      const { red, green, blue } = c.color;
      return sum + (red + green + blue) / 3;
    }, 0);

    return total / colors.length;
  }

  private getColorVariance(colors: any[]): number {
    if (colors.length < 2) return 0;

    const values = colors.map(c => {
      const { red, green, blue } = c.color;
      return (red + green + blue) / 3;
    });

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) /
      values.length;

    return Math.sqrt(variance);
  }
}
