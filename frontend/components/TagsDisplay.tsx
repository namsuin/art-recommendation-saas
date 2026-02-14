// components/TagsDisplay.tsx

import * as React from 'react';
import { tagTranslations } from '../utils/translations';

interface Props {
  styleTags: string[];
  moodTags: string[];
}

export const TagsDisplay: React.FC<Props> = ({ styleTags, moodTags }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      {/* 스타일 태그 섹션 */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-xl">🎨</span>
          <span>스타일 특성</span>
          <span className="ml-auto text-xs font-normal text-gray-500">
            {styleTags.length}개
          </span>
        </h3>
        
        {styleTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {styleTags.map((tag, index) => (
              <span
                key={tag}
                className="group relative px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-800 border-2 border-blue-200 hover:shadow-md transition-all duration-200 cursor-default"
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.3s ease-out forwards'
                }}
              >
                {tagTranslations[tag] || tag}
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {tag}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-lg">
            감지된 스타일 특성이 없습니다
          </div>
        )}
      </div>

      {/* 무드 태그 섹션 */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-xl">✨</span>
          <span>분위기</span>
          <span className="ml-auto text-xs font-normal text-gray-500">
            {moodTags.length}개
          </span>
        </h3>
        
        {moodTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {moodTags.map((tag, index) => (
              <span
                key={tag}
                className="group relative px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-purple-50 to-pink-50 text-purple-800 border-2 border-purple-200 hover:shadow-md transition-all duration-200 cursor-default"
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.3s ease-out forwards'
                }}
              >
                {tagTranslations[tag] || tag}
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {tag}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-lg">
            감지된 분위기가 없습니다
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
