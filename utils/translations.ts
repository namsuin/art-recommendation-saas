// utils/translations.ts

export const tagTranslations: Record<string, string> = {
  // Style tags
  'artistic': '예술적',
  'modern': '현대적',
  'classic': '고전적',
  'minimal': '미니멀',
  'abstract': '추상적',
  'symmetric': '대칭적',
  'balanced': '균형잡힌',
  'structured': '구조적',
  'portrait': '인물사진',
  'photography': '사진',
  'painting': '회화',
  'illustration': '일러스트',
  'sketch': '스케치',
  'watercolor': '수채화',
  'oil painting': '유화',
  'surreal': '초현실적',
  'vintage': '빈티지',
  'urban': '도시적',
  'natural': '자연적',
  'expressive': '표현적',
  
  // Mood tags
  'bright': '밝은',
  'dark': '어두운',
  'vibrant': '생동감있는',
  'calm': '차분한',
  'dramatic': '극적인',
  'colorful': '다채로운',
  'monochromatic': '단색의',
  'warm': '따뜻한',
  'cool': '시원한',
  'energetic': '활기찬',
  'muted': '차분한',
  'peaceful': '평화로운',
  'intense': '강렬한',
};

export const categoryTranslations: Record<string, string> = {
  'portrait': '인물 사진',
  'landscape': '풍경 사진',
  'abstract': '추상 미술',
  'architecture': '건축 사진',
  'still-life': '정물 사진',
  'general': '일반',
};

export const paletteTranslations: Record<string, string> = {
  'warm': '따뜻한 색상',
  'cool': '차가운 색상',
  'vibrant': '선명한 색상',
  'neutral': '중성 색상',
};

export const distributionTranslations: Record<string, string> = {
  'balanced': '균형잡힌 배치',
  'scattered': '분산된 배치',
  'clustered': '집중된 배치',
};

export const weightTranslations: Record<string, string> = {
  'light': '간결함',
  'medium': '적절함',
  'heavy': '풍부함',
};

export const complexityTranslations: Record<string, string> = {
  'low': '간결함',
  'medium': '적절함',
  'high': '풍부함',
};

export const translate = (key: string, dictionary: Record<string, string>): string => {
  return dictionary[key] || key;
};
