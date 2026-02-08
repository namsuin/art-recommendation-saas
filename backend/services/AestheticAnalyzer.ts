type VisionAnalysisResult = {
  labels: string[];
  dominantColors?: string[];
  brightness?: number; // 0 ~ 100
};

export type AestheticProfile = {
  moods: string[];
  styles: string[];
  colorTones: string[];
};

export class AestheticAnalyzer {
  static analyze(vision: VisionAnalysisResult): AestheticProfile {
    const moods: Set<string> = new Set();
    const styles: Set<string> = new Set();
    const colorTones: Set<string> = new Set();

    const labels = vision.labels.map(l => l.toLowerCase());

    // 1️⃣ 분위기 (Mood)
    if (labels.some(l => ['portrait', 'face', 'person'].includes(l))) {
      moods.add('introspective');
    }

    if (labels.some(l => ['nature', 'landscape', 'forest', 'sea'].includes(l))) {
      moods.add('calm');
    }

    if (vision.brightness !== undefined) {
      if (vision.brightness < 40) moods.add('moody');
      if (vision.brightness > 70) moods.add('bright');
    }

    // 2️⃣ 스타일 (Style)
    if (labels.some(l => ['abstract', 'minimalism'].includes(l))) {
      styles.add('minimal');
    }

    if (labels.some(l => ['modern', 'contemporary'].includes(l))) {
      styles.add('contemporary');
    }

    if (labels.some(l => ['oil painting', 'watercolor'].includes(l))) {
      styles.add('painterly');
    }

    // 3️⃣ 색감 톤 (Color Tone)
    if (vision.dominantColors) {
      if (vision.dominantColors.some(c => ['gray', 'beige', 'brown'].includes(c))) {
        colorTones.add('muted');
      }

      if (vision.dominantColors.some(c => ['red', 'yellow', 'orange'].includes(c))) {
        colorTones.add('warm');
      }

      if (vision.dominantColors.some(c => ['blue', 'green', 'purple'].includes(c))) {
        colorTones.add('cool');
      }
    }

    return {
      moods: Array.from(moods),
      styles: Array.from(styles),
      colorTones: Array.from(colorTones),
    };
  }
}
