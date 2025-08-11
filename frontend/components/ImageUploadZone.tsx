import React from 'react';
import { Upload, AlertCircle } from 'lucide-react';

interface ImageUploadZoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  maxImages: number;
  currentImageCount: number;
  disabled?: boolean;
  error?: string | null;
}

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
  onDrop,
  maxImages,
  currentImageCount,
  disabled = false,
  error
}) => {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onDrop(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    onDrop(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const remainingSlots = maxImages - currentImageCount;

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${disabled 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
            : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className={`
            p-4 rounded-full
            ${disabled ? 'bg-gray-200' : 'bg-blue-100'}
          `}>
            <Upload className={`
              h-8 w-8
              ${disabled ? 'text-gray-400' : 'text-blue-600'}
            `} />
          </div>
          
          <div className="space-y-2">
            <h3 className={`
              text-lg font-medium
              ${disabled ? 'text-gray-500' : 'text-gray-900'}
            `}>
              이미지를 여기에 드래그하거나 클릭하여 업로드
            </h3>
            
            <p className={`
              text-sm
              ${disabled ? 'text-gray-400' : 'text-gray-500'}
            `}>
              JPG, PNG 파일만 지원 (최대 {maxImages}개)
            </p>
            
            {remainingSlots > 0 && (
              <p className="text-xs text-blue-600">
                {remainingSlots}개 더 추가 가능
              </p>
            )}
          </div>

          <label className={`
            inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md
            ${disabled 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
            }
          `}>
            파일 선택
            <input
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={disabled}
            />
          </label>
        </div>
      </div>
    </div>
  );
};