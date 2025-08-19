/**
 * Centralized Artwork Filtering Utilities
 * 작품 필터링 로직 중앙화
 */

export interface Artwork {
  platform?: string;
  source?: string;
  search_source?: string;
  source_url?: string;
  project_type?: string;
  university?: string;
  category?: string;
  title?: string;
  student_work?: boolean;
  [key: string]: any;
}

/**
 * Check if artwork is from Tumblbug platform
 */
export function isTumblbugArtwork(artwork: Artwork): boolean {
  if (!artwork) return false;
  
  return (
    artwork.platform === 'tumblbug' ||
    artwork.source === '텀블벅' ||
    artwork.search_source === '텀블벅' ||
    (artwork.source_url && artwork.source_url.includes('tumblbug.com')) ||
    artwork.project_type === '크라우드펀딩'
  );
}

/**
 * Check if artwork is from Grafolio platform
 */
export function isGrafolioArtwork(artwork: Artwork): boolean {
  if (!artwork) return false;
  
  return (
    artwork.platform === 'grafolio' ||
    artwork.source === '그라폴리오' ||
    artwork.search_source === '그라폴리오' ||
    (artwork.source_url && artwork.source_url.includes('grafolio.naver.com'))
  );
}

/**
 * Check if artwork is from Korean University
 */
export function isKoreanUniversityArtwork(artwork: Artwork): boolean {
  if (!artwork) return false;
  
  return (
    artwork.platform === 'university' ||
    artwork.source === '대학 졸업전시' ||
    artwork.category === 'student_work' ||
    artwork.search_source === 'graduation' ||
    (artwork.university && (
      artwork.university.includes('대학') ||
      artwork.university.includes('대학교') ||
      artwork.university.includes('University')
    )) ||
    (artwork.source_url && (
      artwork.source_url.includes('.ac.kr') ||
      artwork.source_url.includes('univ.') ||
      artwork.source_url.includes('university') ||
      artwork.source_url.includes('college') ||
      artwork.source_url.includes('graduation')
    )) ||
    (artwork.source && (
      artwork.source.includes('졸업전시') ||
      artwork.source.includes('졸업작품') ||
      artwork.source.includes('대학') ||
      artwork.source.includes('University') ||
      artwork.source.includes('College')
    )) ||
    (artwork.title && (
      artwork.title.includes('졸업작품') ||
      artwork.title.includes('졸업전시')
    ))
  );
}

/**
 * Check if artwork is student work
 */
export function isStudentWork(artwork: Artwork): boolean {
  if (!artwork) return false;
  
  return (
    artwork.student_work === true ||
    artwork.platform === 'academy_art_university' ||
    artwork.search_source === 'student_exhibition' ||
    isKoreanUniversityArtwork(artwork)
  );
}

/**
 * Filter artworks by platform
 */
export function filterArtworksByPlatform(
  artworks: Artwork[],
  options: {
    excludeTumblbug?: boolean;
    excludeGrafolio?: boolean;
    excludeUniversity?: boolean;
    excludeStudentWork?: boolean;
  } = {}
): Artwork[] {
  return artworks.filter(artwork => {
    const work = artwork.artwork || artwork;
    
    if (options.excludeTumblbug && isTumblbugArtwork(work)) return false;
    if (options.excludeGrafolio && isGrafolioArtwork(work)) return false;
    if (options.excludeUniversity && isKoreanUniversityArtwork(work)) return false;
    if (options.excludeStudentWork && isStudentWork(work)) return false;
    
    return true;
  });
}

/**
 * Group artworks by platform
 */
export function groupArtworksByPlatform(artworks: Artwork[]): Record<string, Artwork[]> {
  const groups: Record<string, Artwork[]> = {
    tumblbug: [],
    grafolio: [],
    university: [],
    student: [],
    other: []
  };
  
  artworks.forEach(artwork => {
    const work = artwork.artwork || artwork;
    
    if (isTumblbugArtwork(work)) {
      groups.tumblbug.push(artwork);
    } else if (isGrafolioArtwork(work)) {
      groups.grafolio.push(artwork);
    } else if (isKoreanUniversityArtwork(work)) {
      groups.university.push(artwork);
    } else if (isStudentWork(work)) {
      groups.student.push(artwork);
    } else {
      groups.other.push(artwork);
    }
  });
  
  return groups;
}