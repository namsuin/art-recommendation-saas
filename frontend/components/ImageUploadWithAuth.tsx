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
    // 로그인 여부에 관계없이 바로 분석 진행
    // 서버에서 사용자 정보가 있으면 자동으로 업로드 기록을 저장함
    onImageUpload(file);
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
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        <div className="space-y-4">
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
                ✓ 로그인됨: 분석 결과가 저장됩니다
              </p>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg cursor-pointer"
          >
            파일 선택
          </label>
        </div>
      </div>
    </div>
  );
};