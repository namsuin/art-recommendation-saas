import React, { useState } from 'react';

interface InstagramPost {
  id: string;
  title: string;
  artist: string;
  image_url: string;
  description: string;
  tags: string[];
}

interface InstagramImportProps {
  onImportComplete?: (artworks: InstagramPost[]) => void;
}

export function InstagramImport({ onImportComplete }: InstagramImportProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [importedArtworks, setImportedArtworks] = useState<InstagramPost[]>([]);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleImport = async () => {
    if (!username.trim()) {
      setError('Instagram 사용자명을 입력해주세요');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Clean username (remove @ if present)
      const cleanUsername = username.replace('@', '').replace('https://www.instagram.com/', '').replace('/', '');
      
      const response = await fetch(`/api/instagram/profile/${cleanUsername}`);
      const data = await response.json();

      if (data.success && data.data) {
        setImportedArtworks(data.data.artworks);
        setShowResults(true);
        
        if (onImportComplete) {
          onImportComplete(data.data.artworks);
        }
      } else {
        setError('Instagram 프로필을 불러올 수 없습니다');
      }
    } catch (err) {
      setError('Instagram 연동 중 오류가 발생했습니다');
      console.error('Instagram import error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectArtwork = (artwork: InstagramPost) => {
    // 작품 선택 시 추천 시스템으로 이동하거나 분석
    console.log('Selected artwork:', artwork);
    window.location.href = `/analyze?image=${encodeURIComponent(artwork.image_url)}`;
  };

  return (
    <div className="instagram-import-container p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Instagram 작품 가져오기</h2>
      
      <div className="import-form mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Instagram 사용자명 또는 URL (예: _ramswork)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={handleImport}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
          >
            {loading ? '가져오는 중...' : '가져오기'}
          </button>
        </div>
        
        {error && (
          <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>

      {showResults && importedArtworks.length > 0 && (
        <div className="imported-results">
          <h3 className="text-lg font-semibold mb-4">
            가져온 작품 ({importedArtworks.length}개)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {importedArtworks.map((artwork) => (
              <div
                key={artwork.id}
                className="artwork-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleSelectArtwork(artwork)}
              >
                <img
                  src={artwork.image_url}
                  alt={artwork.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h4 className="font-semibold text-gray-800 mb-1">
                    {artwork.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    @{artwork.artist}
                  </p>
                  {artwork.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {artwork.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setShowResults(false);
                setUsername('');
                setImportedArtworks([]);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              다른 계정 가져오기
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
}