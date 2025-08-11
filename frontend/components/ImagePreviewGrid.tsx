import React from 'react';
import { X } from 'lucide-react';

interface ImagePreview {
  id: string;
  file: File;
  preview: string;
}

interface ImagePreviewGridProps {
  images: ImagePreview[];
  onRemoveImage: (id: string) => void;
  disabled?: boolean;
}

export const ImagePreviewGrid: React.FC<ImagePreviewGridProps> = ({
  images,
  onRemoveImage,
  disabled = false
}) => {
  if (images.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">
          선택된 이미지 ({images.length}개)
        </h3>
        {images.length > 3 && (
          <span className="text-sm text-gray-600">
            공통 키워드 분석 가능
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {images.map((image) => (
          <div key={image.id} className="relative group">
            <img
              src={image.preview}
              alt={image.file.name}
              className="w-full h-24 object-cover rounded-lg"
            />
            <button
              onClick={() => onRemoveImage(image.id)}
              disabled={disabled}
              className={`
                absolute top-1 right-1 p-1 rounded-full transition-opacity
                ${disabled 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-500 hover:bg-red-600 cursor-pointer'
                }
                text-white opacity-0 group-hover:opacity-100
              `}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};