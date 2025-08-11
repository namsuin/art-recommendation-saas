import React from 'react';
import { getColorStyle } from '../utils/artworkUtils';

interface ColorTagProps {
  color: string;
  variant?: 'common' | 'frequent';
  className?: string;
}

export const ColorTag: React.FC<ColorTagProps> = ({ 
  color, 
  variant = 'frequent',
  className = '' 
}) => {
  const { backgroundColor, textColor, borderColor } = getColorStyle(color);
  
  const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
  const variantClasses = variant === 'common' 
    ? "font-bold border-2" 
    : "border";
  
  const finalBorderColor = variant === 'common' && backgroundColor === '#f9fafb' 
    ? '#10b981' 
    : borderColor;
  
  return (
    <span
      className={`${baseClasses} ${variantClasses} ${className}`}
      style={{ 
        backgroundColor,
        color: textColor,
        borderColor: finalBorderColor
      }}
    >
      {color}
    </span>
  );
};