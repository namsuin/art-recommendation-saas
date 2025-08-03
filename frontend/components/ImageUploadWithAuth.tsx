import React, { useState } from 'react';

interface User {
  id: string;
  email: string;
}

interface ImageUploadWithAuthProps {
  user: User | null;
  onImageUpload: (file: File, uploadId?: string) => void;
  onAuthRequired: () => void;
}

export const ImageUploadWithAuth: React.FC<ImageUploadWithAuthProps> = ({ 
  user, 
  onImageUpload, 
  onAuthRequired 
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files[0] && files[0].type.startsWith('image/')) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // 로그인하지 않은 경우 바로 분석 진행 (게스트 모드)
    if (!user) {
      onImageUpload(file);
      return;
    }

    // 로그인한 사용자는 먼저 파일을 업로드
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('userId', user.id);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        if (response.status === 429) {
          alert('일일 업로드 제한에 도달했습니다. 내일 다시 시도해주세요.');
          return;
        }
        throw new Error(result.error || '업로드 실패');
      }

      // 업로드 성공시 분석 진행
      onImageUpload(file, result.uploadId);

    } catch (error) {
      console.error('Upload failed:', error);
      alert(error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800">
                <strong>게스트 모드:</strong> 기본 분석만 가능합니다.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                회원가입하면 더 정확한 추천과 히스토리 저장이 가능합니다.
              </p>
            </div>
            <button
              onClick={onAuthRequired}
              className="ml-4 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              로그인
            </button>
          </div>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        <div className="space-y-4">
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600">이미지를 업로드하고 있습니다...</p>
            </>
          ) : (
            <>
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg">이미지를 드래그하거나 클릭하여 업로드</p>
                <p className="text-sm text-gray-500">JPG, PNG 파일 지원 (최대 10MB)</p>
                {user && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ 로그인됨: 업로드 히스토리가 저장됩니다
                  </p>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
                disabled={isUploading}
              />
              <label
                htmlFor="file-input"
                className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg cursor-pointer disabled:opacity-50"
              >
                파일 선택
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
};