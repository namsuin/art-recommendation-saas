import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { t } = useLanguage();

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
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-purple-700">
                {t('guestMode')}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {t('guestModeDesc')}
              </p>
            </div>
            <button
              onClick={onAuthRequired}
              className="ml-4 btn-gradient px-4 py-2 text-sm"
            >
              {t('login')}
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
            <p className="text-lg font-medium">{t('dragDropTitle')}</p>
            <p className="text-sm text-gray-500 mt-2">
              {t('supportedFormats')} • {t('maxFileSize')}
            </p>
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
            className="btn-gradient px-6 py-2 inline-block cursor-pointer"
          >
            {t('browseFiles')}
          </label>
        </div>
      </div>
    </div>
  );
};