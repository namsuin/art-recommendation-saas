/**
 * AI 큐레이터 챗봇 서비스
 * 미술 전문 지식 기반 대화형 AI 어시스턴트
 */

import { supabase } from './supabase';
import { mockDB } from './mock-database';

export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: string;
  metadata?: {
    artworks?: any[];
    recommendations?: any[];
    analysis?: any;
  };
}

export interface ChatRequest {
  message: string;
  userId?: string;
  context?: {
    previousMessages?: ChatMessage[];
    userPreferences?: any;
    sessionId?: string;
  };
}

export interface ChatResponse {
  success: boolean;
  response?: string;
  metadata?: {
    artworks?: any[];
    recommendations?: any[];
    analysis?: any;
    confidence?: number;
    sources?: string[];
  };
  error?: string;
}

export interface ConversationContext {
  intent: 'recommendation' | 'education' | 'analysis' | 'general' | 'greeting';
  entities: {
    styles?: string[];
    artists?: string[];
    periods?: string[];
    techniques?: string[];
    colors?: string[];
    emotions?: string[];
  };
  confidence: number;
}

export class AICuratorChatbotService {
  private artKnowledgeBase: Map<string, any> = new Map();
  private conversationHistory: Map<string, ChatMessage[]> = new Map();

  constructor() {
    this.initializeKnowledgeBase();
  }

  /**
   * 채팅 메시지 처리
   */
  async processChat(request: ChatRequest): Promise<ChatResponse> {
    try {
      // 메시지 분석 및 의도 파악
      const context = await this.analyzeMessage(request.message);
      
      // 사용자 컨텍스트 로드
      let userContext = null;
      if (request.userId) {
        userContext = await this.getUserContext(request.userId);
      }

      // 대화 히스토리 업데이트
      const sessionId = request.context?.sessionId || `session_${Date.now()}`;
      this.updateConversationHistory(sessionId, {
        id: Date.now().toString(),
        type: 'user',
        content: request.message,
        timestamp: new Date().toISOString()
      });

      // 응답 생성
      const response = await this.generateResponse(context, request, userContext);

      // 대화 히스토리에 봇 응답 추가
      this.updateConversationHistory(sessionId, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response.response || '',
        timestamp: new Date().toISOString(),
        metadata: response.metadata
      });

      return response;

    } catch (error) {
      console.error('Chat processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '채팅 처리 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 메시지 분석 및 의도 파악
   */
  private async analyzeMessage(message: string): Promise<ConversationContext> {
    const lowercaseMessage = message.toLowerCase();
    
    // 의도 분류
    let intent: ConversationContext['intent'] = 'general';
    let confidence = 0.5;

    // 추천 관련 키워드
    const recommendationKeywords = ['추천', '좋아할', '비슷한', '맞는', '어울리는', '취향'];
    if (recommendationKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'recommendation';
      confidence = 0.8;
    }

    // 교육/설명 관련 키워드
    const educationKeywords = ['설명', '알려', '차이', '역사', '특징', '기법', '의미'];
    if (educationKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'education';
      confidence = 0.9;
    }

    // 분석 관련 키워드
    const analysisKeywords = ['분석', '해석', '평가', '비평', '의견'];
    if (analysisKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'analysis';
      confidence = 0.7;
    }

    // 인사 관련 키워드
    const greetingKeywords = ['안녕', '반가', '처음', '시작', '도움'];
    if (greetingKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'greeting';
      confidence = 0.9;
    }

    // 엔티티 추출
    const entities = this.extractEntities(message);

    return { intent, entities, confidence };
  }

  /**
   * 엔티티 추출
   */
  private extractEntities(message: string): ConversationContext['entities'] {
    const entities: ConversationContext['entities'] = {};

    // 스타일 추출
    const styles = ['인상주의', '표현주의', '큐비즘', '초현실주의', '팝아트', '미니멀리즘', '바로크', '로코코'];
    entities.styles = styles.filter(style => message.includes(style));

    // 아티스트 추출
    const artists = ['피카소', '반고흐', '모네', '다빈치', '미켈란젤로', '달리', '워홀', '잭슨폴록'];
    entities.artists = artists.filter(artist => message.includes(artist));

    // 색상 추출
    const colors = ['빨간', '파란', '노란', '초록', '보라', '주황', '검은', '흰', '회색'];
    entities.colors = colors.filter(color => message.includes(color));

    // 감정 추출
    const emotions = ['행복', '슬픔', '분노', '평온', '역동', '고요', '강렬', '부드러운'];
    entities.emotions = emotions.filter(emotion => message.includes(emotion));

    return entities;
  }

  /**
   * 사용자 컨텍스트 로드
   */
  private async getUserContext(userId: string): Promise<any> {
    try {
      if (supabase) {
        // 사용자 선호도 조회
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        // 최근 상호작용 조회
        const { data: interactions } = await supabase
          .from('user_interactions')
          .select('*')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false })
          .limit(10);

        return {
          preferences,
          recentInteractions: interactions
        };
      }

      // Mock 데이터 반환
      return {
        preferences: {
          categories: { 'contemporary': 0.8, 'abstract': 0.6 },
          styles: { 'modern': 0.7, 'minimalist': 0.5 }
        },
        recentInteractions: []
      };
    } catch (error) {
      console.error('Error loading user context:', error);
      return null;
    }
  }

  /**
   * 응답 생성
   */
  private async generateResponse(
    context: ConversationContext,
    request: ChatRequest,
    userContext: any
  ): Promise<ChatResponse> {
    switch (context.intent) {
      case 'greeting':
        return this.generateGreetingResponse();
      
      case 'recommendation':
        return await this.generateRecommendationResponse(context, request, userContext);
      
      case 'education':
        return this.generateEducationResponse(context, request);
      
      case 'analysis':
        return this.generateAnalysisResponse(context, request);
      
      default:
        return this.generateGeneralResponse(context, request);
    }
  }

  /**
   * 인사 응답 생성
   */
  private generateGreetingResponse(): ChatResponse {
    const greetings = [
      '안녕하세요! 저는 AI 미술 큐레이터입니다. 🎨\n\n다음과 같은 도움을 드릴 수 있습니다:\n• 개인 맞춤 작품 추천\n• 미술 스타일 및 기법 설명\n• 작가와 작품 분석\n• 미술사 및 예술 이론 설명\n\n어떤 것이 궁금하신가요?',
      '반갑습니다! 미술에 대해 무엇이든 물어보세요. 🎭\n\n저는 다양한 미술 스타일, 유명 작가들의 작품, 그리고 예술사에 대한 깊은 지식을 가지고 있습니다.\n\n특별히 관심 있는 미술 분야가 있으신가요?'
    ];

    return {
      success: true,
      response: greetings[Math.floor(Math.random() * greetings.length)]
    };
  }

  /**
   * 추천 응답 생성
   */
  private async generateRecommendationResponse(
    context: ConversationContext,
    request: ChatRequest,
    userContext: any
  ): Promise<ChatResponse> {
    try {
      // 개인화된 추천 생성
      const recommendations = await this.generatePersonalizedRecommendations(
        request.userId,
        context.entities,
        userContext
      );

      let response = '';
      
      if (userContext && userContext.preferences) {
        response += '당신의 취향을 분석한 결과를 바탕으로 추천 작품을 선별했습니다.\n\n';
      } else {
        response += '선호하시는 스타일을 바탕으로 작품을 추천해드립니다.\n\n';
      }

      if (context.entities.styles && context.entities.styles.length > 0) {
        response += `${context.entities.styles.join(', ')} 스타일을 중심으로 선별했습니다.\n\n`;
      }

      response += '추천 작품들을 확인해보세요:';

      return {
        success: true,
        response,
        metadata: {
          recommendations: recommendations.slice(0, 6),
          confidence: 0.85
        }
      };
    } catch (error) {
      return {
        success: true,
        response: '추천 시스템에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.'
      };
    }
  }

  /**
   * 교육 응답 생성
   */
  private generateEducationResponse(
    context: ConversationContext,
    request: ChatRequest
  ): ChatResponse {
    const message = request.message.toLowerCase();
    
    // 스타일 설명
    if (message.includes('인상주의')) {
      return {
        success: true,
        response: `# 인상주의 (Impressionism)

**시대**: 19세기 후반 (1860-1890년대)
**발원지**: 프랑스

## 주요 특징
- 빛과 색채의 순간적 변화 포착
- 야외에서 직접 그리는 '플레인 에어(Plein Air)' 기법
- 명확한 윤곽선보다는 색채와 붓터치로 형태 표현

## 대표 작가들
- **클로드 모네**: 수련, 루앙 대성당 연작
- **피에르 오귀스트 르누아르**: 무도회, 인물화
- **에드가 드가**: 발레리나 연작

## 영향
- 현대 미술의 출발점이 된 혁신적 운동
- 사진술 발달에 대한 회화의 새로운 답변`,
        metadata: {
          artworks: this.getStyleExamples('impressionist'),
          confidence: 0.9
        }
      };
    }

    if (message.includes('큐비즘')) {
      return {
        success: true,
        response: `# 큐비즘 (Cubism)

**시대**: 20세기 초 (1907-1920년대)
**창시자**: 파블로 피카소, 조르주 브라크

## 주요 특징
- 대상을 기하학적 형태로 해체하고 재구성
- 다각도에서 본 시점을 하나의 화면에 종합
- 분석적 큐비즘 → 종합적 큐비즘으로 발전

## 발전 단계
1. **분석적 큐비즘** (1909-1912): 형태의 해체와 분석
2. **종합적 큐비즘** (1912-1920): 콜라주와 혼합 재료 사용

## 의의
- 르네상스 이후 서구 회화의 전통적 재현 방식 혁신
- 추상 미술의 토대 마련`,
        metadata: {
          artworks: this.getStyleExamples('cubist'),
          confidence: 0.9
        }
      };
    }

    // 일반적인 교육 응답
    return {
      success: true,
      response: `미술에 대해 더 구체적으로 질문해주시면 상세한 설명을 드릴 수 있습니다.

다음과 같은 주제에 대해 설명해드릴 수 있습니다:
- 미술 운동과 스타일 (인상주의, 큐비즘, 초현실주의 등)
- 유명 작가들의 생애와 작품 세계
- 미술 기법과 재료
- 색채 이론과 구성 원리
- 미술사의 주요 시대별 특징

어떤 것이 궁금하신가요?`
    };
  }

  /**
   * 분석 응답 생성
   */
  private generateAnalysisResponse(
    context: ConversationContext,
    request: ChatRequest
  ): ChatResponse {
    return {
      success: true,
      response: `작품 분석을 도와드리겠습니다! 🔍

구체적으로 분석하고 싶은 작품이나 작가를 알려주시면:
- 작품의 조형 요소 분석 (색채, 구성, 형태)
- 표현 기법과 스타일 해석
- 역사적, 문화적 맥락 설명
- 작가의 의도와 메시지 분석

을 통해 작품을 깊이 있게 이해할 수 있도록 도와드립니다.

분석하고 싶은 특정 작품이나 작가가 있으신가요?`
    };
  }

  /**
   * 일반 응답 생성
   */
  private generateGeneralResponse(
    context: ConversationContext,
    request: ChatRequest
  ): ChatResponse {
    return {
      success: true,
      response: `미술과 관련된 질문이라면 무엇이든 도움을 드릴 수 있습니다! 🎨

예를 들어:
- "인상주의에 대해 알려주세요"
- "내 취향에 맞는 작품을 추천해주세요"  
- "피카소의 작품 세계는 어떤가요?"
- "색채 이론에 대해 설명해주세요"

구체적인 질문을 해주시면 더 자세한 답변을 드릴 수 있습니다.`
    };
  }

  /**
   * 개인화된 추천 생성
   */
  private async generatePersonalizedRecommendations(
    userId?: string,
    entities?: ConversationContext['entities'],
    userContext?: any
  ): Promise<any[]> {
    // Mock 추천 데이터 생성
    const mockRecommendations = [
      {
        artworkId: 'rec_1',
        title: '별이 빛나는 밤',
        artist: '빈센트 반 고흐',
        imageUrl: 'https://example.com/starry-night.jpg',
        thumbnailUrl: 'https://example.com/thumb/starry-night.jpg',
        style: '후기 인상주의',
        score: 0.92,
        reasoning: '당신이 선호하는 색채와 역동적인 붓터치가 특징입니다'
      },
      {
        artworkId: 'rec_2',
        title: '수련',
        artist: '클로드 모네',
        imageUrl: 'https://example.com/water-lilies.jpg',
        thumbnailUrl: 'https://example.com/thumb/water-lilies.jpg',
        style: '인상주의',
        score: 0.88,
        reasoning: '평온한 분위기와 자연적 색감이 돋보이는 작품입니다'
      },
      {
        artworkId: 'rec_3',
        title: '아비뇽의 처녀들',
        artist: '파블로 피카소',
        imageUrl: 'https://example.com/les-demoiselles.jpg',
        thumbnailUrl: 'https://example.com/thumb/les-demoiselles.jpg',
        style: '큐비즘',
        score: 0.85,
        reasoning: '혁신적인 형태 해체와 재구성이 인상적인 작품입니다'
      }
    ];

    // 엔티티나 사용자 컨텍스트에 따라 필터링/정렬
    return mockRecommendations;
  }

  /**
   * 스타일 예시 작품 조회
   */
  private getStyleExamples(style: string): any[] {
    const examples = {
      impressionist: [
        { title: '인상, 해돋이', artist: '클로드 모네', thumbnailUrl: '/examples/impression-sunrise.jpg' },
        { title: '발코니', artist: '베르트 모리조', thumbnailUrl: '/examples/balcony.jpg' }
      ],
      cubist: [
        { title: '아비뇽의 처녀들', artist: '파블로 피카소', thumbnailUrl: '/examples/les-demoiselles.jpg' },
        { title: '바이올린과 촛대', artist: '조르주 브라크', thumbnailUrl: '/examples/violin-candlestick.jpg' }
      ]
    };

    return examples[style] || [];
  }

  /**
   * 대화 히스토리 업데이트
   */
  private updateConversationHistory(sessionId: string, message: ChatMessage): void {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, []);
    }
    
    const history = this.conversationHistory.get(sessionId)!;
    history.push(message);
    
    // 최대 50개 메시지만 유지
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  /**
   * 채팅 히스토리 조회
   */
  async getChatHistory(userId: string, limit: number = 50): Promise<{ success: boolean; data?: ChatMessage[]; error?: string }> {
    try {
      // 실제 구현에서는 데이터베이스에서 조회
      // 여기서는 메모리에서 임시 조회
      const sessionId = `session_${userId}`;
      const history = this.conversationHistory.get(sessionId) || [];
      
      return {
        success: true,
        data: history.slice(-limit)
      };
    } catch (error) {
      console.error('Get chat history error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '채팅 히스토리 조회 실패'
      };
    }
  }

  /**
   * 지식 베이스 초기화
   */
  private initializeKnowledgeBase(): void {
    // 미술 운동별 정보
    this.artKnowledgeBase.set('impressionism', {
      period: '1860-1890',
      characteristics: ['빛과 색채', '야외 그리기', '순간 포착'],
      artists: ['모네', '르누아르', '드가', '피사로']
    });

    this.artKnowledgeBase.set('cubism', {
      period: '1907-1920',
      characteristics: ['기하학적 형태', '다시점', '해체와 재구성'],
      artists: ['피카소', '브라크', '그리스', '레제']
    });

    // 더 많은 지식 베이스 데이터 추가 가능
  }
}