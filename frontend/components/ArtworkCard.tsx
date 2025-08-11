import React from 'react';
import { Artwork, getArtworkImageUrl, getArtworkSourceUrl } from '../utils/artworkUtils';

interface ArtworkCardProps {
  artwork: Artwork;
  index: number;
  keyPrefix: string;
  onClick?: (artwork: Artwork) => void;
  className?: string;
}

export const ArtworkCard: React.FC<ArtworkCardProps> = ({ 
  artwork, 
  index, 
  keyPrefix,
  onClick,
  className = "w-full h-32 object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
}) => {
  const imageUrl = getArtworkImageUrl(artwork);
  const sourceUrl = getArtworkSourceUrl(artwork);
  
  if (!imageUrl) {
    return null; // 이미지가 없으면 렌더링하지 않음
  }
  
  const handleClick = () => {
    if (onClick) {
      onClick(artwork);
    } else if (sourceUrl !== '#') {
      window.open(sourceUrl, '_blank', 'noopener,noreferrer');
    }
  };
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    
    if (!target.dataset.retried) {
      // 첫 번째 재시도: 다른 이미지 URL 사용
      target.dataset.retried = 'true';
      const fallbackUrl = artwork.thumbnail_url || artwork.primaryImageSmall;
      if (fallbackUrl && fallbackUrl !== target.src) {
        target.src = fallbackUrl;
        return;
      }
    }
    
    // 재시도도 실패하면 이미지 숨김
    target.style.display = 'none';
  };
  
  return (
    <div 
      key={`${keyPrefix}-${index}`} 
      className="relative group cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative overflow-hidden rounded-lg">
        <img
          src={imageUrl}
          alt={artwork.title || '작품'}
          className={className}
          onError={handleImageError}
          onLoad={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.opacity = '1';
          }}
          style={{ opacity: '0', transition: 'opacity 0.3s' }}
        />
      </div>
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-200 rounded-lg">
        <div className="absolute bottom-2 left-2 right-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <p className="text-xs font-medium truncate">{artwork.title}</p>
          {artwork.artist && (
            <p className="text-xs opacity-80 truncate">{artwork.artist}</p>
          )}
        </div>
      </div>
    </div>
  );
};