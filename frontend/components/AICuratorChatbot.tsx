import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  metadata?: {
    artworks?: any[];
    recommendations?: any[];
    analysis?: any;
  };
}

interface AICuratorChatbotProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AICuratorChatbot: React.FC<AICuratorChatbotProps> = ({ userId, isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: '안녕하세요! 저는 AI 큐레이터입니다. 🎨\n\n작품 추천, 미술 분석, 스타일 설명 등 다양한 도움을 드릴 수 있습니다. 무엇을 도와드릴까요?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedQuestions] = useState([
    '내 취향에 맞는 작품을 추천해주세요',
    '인상주의와 표현주의의 차이점을 알려주세요',
    '피카소의 큐비즘 스타일에 대해 설명해주세요',
    '최근 트렌딩 작품들을 보여주세요',
    '색채 이론에 대해 알려주세요'
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai-curator/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          userId,
          context: {
            previousMessages: messages.slice(-5) // 최근 5개 메시지만 컨텍스트로 전송
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: result.response,
          timestamp: new Date(),
          metadata: result.metadata
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: '죄송합니다. 현재 서비스에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: '네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해주세요.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const formatContent = (content: string) => {
    // 기본적인 마크다운 스타일 텍스트 포맷팅
    return content
      .split('\n')
      .map((line, index) => {
        // 헤더 처리
        if (line.startsWith('# ')) {
          return <h3 key={index} className="text-lg font-bold mt-3 mb-2">{line.substring(2)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h4 key={index} className="text-md font-semibold mt-2 mb-1">{line.substring(3)}</h4>;
        }
        
        // 리스트 처리
        if (line.startsWith('- ')) {
          return <li key={index} className="ml-4 list-disc">{line.substring(2)}</li>;
        }
        
        // 빈 줄 처리
        if (line.trim() === '') {
          return <br key={index} />;
        }
        
        // 일반 텍스트
        return <p key={index} className="mb-1">{line}</p>;
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              🎨
            </div>
            <div>
              <h3 className="font-semibold">AI 큐레이터</h3>
              <p className="text-xs opacity-90">전문 미술 상담사</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="text-sm">
                  {message.type === 'user' ? (
                    <p>{message.content}</p>
                  ) : (
                    <div>{formatContent(message.content)}</div>
                  )}
                </div>
                
                {/* Metadata display for bot messages */}
                {message.metadata && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {message.metadata.artworks && (
                      <div className="grid grid-cols-2 gap-2">
                        {message.metadata.artworks.slice(0, 4).map((artwork: any, idx: number) => (
                          <div key={idx} className="bg-white p-2 rounded">
                            <img
                              src={artwork.thumbnailUrl || artwork.imageUrl}
                              alt={artwork.title}
                              className="w-full h-20 object-cover rounded mb-1"
                            />
                            <p className="text-xs font-medium">{artwork.title}</p>
                            <p className="text-xs text-gray-600">{artwork.artist}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {message.metadata.recommendations && (
                      <div className="space-y-2">
                        {message.metadata.recommendations.slice(0, 3).map((rec: any, idx: number) => (
                          <div key={idx} className="bg-white p-2 rounded flex items-center space-x-2">
                            <img
                              src={rec.thumbnailUrl}
                              alt={rec.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{rec.title}</p>
                              <p className="text-xs text-gray-600">{rec.artist}</p>
                              <p className="text-xs text-blue-600">매치율: {Math.round(rec.score * 100)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions (show only when conversation is short) */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">추천 질문:</p>
            <div className="flex flex-wrap gap-1">
              {suggestedQuestions.slice(0, 3).map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="미술에 대해 궁금한 것을 물어보세요..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isTyping}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              전송
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-500 text-center">
            AI 큐레이터는 미술 전문 지식을 바탕으로 도움을 드립니다. 
            {!userId && ' 로그인하면 더 개인화된 추천을 받을 수 있습니다.'}
          </p>
        </div>
      </div>
    </div>
  );
};