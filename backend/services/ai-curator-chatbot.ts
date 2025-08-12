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
  intent: 'recommendation' | 'education' | 'analysis' | 'general' | 'greeting' | 'quiz' | 'comparison' | 'technique' | 'museum';
  entities: {
    styles?: string[];
    artists?: string[];
    periods?: string[];
    techniques?: string[];
    colors?: string[];
    emotions?: string[];
    museums?: string[];
    mediums?: string[];
    themes?: string[];
  };
  confidence: number;
  followUpType?: 'quiz' | 'detail' | 'comparison' | 'related' | 'technique';
}

export class AICuratorChatbotService {
  private artKnowledgeBase: Map<string, any> = new Map();
  private conversationHistory: Map<string, ChatMessage[]> = new Map();
  private quizState: Map<string, any> = new Map();
  private userLearningProgress: Map<string, any> = new Map();

  constructor() {
    this.initializeKnowledgeBase();
    this.initializeArtistDatabase();
    this.initializeTechniquesDatabase();
    this.initializeMuseumDatabase();
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
      logger.error('Chat processing error:', error);
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
    let followUpType: ConversationContext['followUpType'];

    // 퀴즈 관련 키워드
    const quizKeywords = ['퀴즈', '문제', '테스트', '맞춰', '게임', '도전'];
    if (quizKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'quiz';
      confidence = 0.9;
    }

    // 비교 관련 키워드
    const comparisonKeywords = ['비교', '차이점', '공통점', '다른점', '유사점', 'vs', '대비'];
    if (comparisonKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'comparison';
      confidence = 0.85;
    }

    // 기법/재료 관련 키워드
    const techniqueKeywords = ['기법', '그리는', '만드는', '재료', '도구', '방법', '과정', '단계'];
    if (techniqueKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'technique';
      confidence = 0.8;
    }

    // 박물관/전시 관련 키워드
    const museumKeywords = ['박물관', '미술관', '전시', '갤러리', '컬렉션', '소장품', '관람'];
    if (museumKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'museum';
      confidence = 0.8;
    }

    // 추천 관련 키워드
    const recommendationKeywords = ['추천', '좋아할', '비슷한', '맞는', '어울리는', '취향', '선호', '관심'];
    if (recommendationKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'recommendation';
      confidence = 0.8;
    }

    // 교육/설명 관련 키워드
    const educationKeywords = ['설명', '알려', '차이', '역사', '특징', '의미', '개념', '정의', '이해'];
    if (educationKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'education';
      confidence = 0.9;
      // 후속 질문 유형 결정
      if (lowercaseMessage.includes('더') || lowercaseMessage.includes('자세히')) {
        followUpType = 'detail';
      } else if (lowercaseMessage.includes('비교') || lowercaseMessage.includes('차이')) {
        followUpType = 'comparison';
      }
    }

    // 분석 관련 키워드
    const analysisKeywords = ['분석', '해석', '평가', '비평', '의견', '감상', '비판'];
    if (analysisKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'analysis';
      confidence = 0.7;
    }

    // 인사 관련 키워드
    const greetingKeywords = ['안녕', '반가', '처음', '시작', '도움', '소개'];
    if (greetingKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'greeting';
      confidence = 0.9;
    }

    // 엔티티 추출
    const entities = this.extractEntities(message);

    return { intent, entities, confidence, followUpType };
  }

  /**
   * 엔티티 추출
   */
  private extractEntities(message: string): ConversationContext['entities'] {
    const entities: ConversationContext['entities'] = {};

    // 스타일/운동 추출 (대폭 확장)
    const styles = [
      // 고전/전통
      '고대', '그리스', '로마', '비잔틴', '고딕', '르네상스', '바로크', '로코코', '신고전주의',
      // 근현대 주요 운동
      '로맨티즘', '사실주의', '인상주의', '후기인상주의', '신인상주의', '상징주의',
      '표현주의', '야수파', '큐비즘', '미래주의', '다다이즘', '초현실주의',
      '추상표현주의', '팝아트', '옵아트', '미니멀리즘', '개념미술', '포스트모던',
      // 동양 미술
      '한국화', '수묵화', '민화', '불화', '일본화', '중국화', '서예',
      // 기타
      '스트리트아트', '디지털아트', '설치미술', '비디오아트', '퍼포먼스'
    ];
    entities.styles = styles.filter(style => message.includes(style));

    // 아티스트 추출 (대폭 확장)
    const artists = [
      // 르네상스
      '레오나르도 다 빈치', '다빈치', '미켈란젤로', '라파엘로', '보티첼리', '도나텔로',
      // 바로크
      '카라바조', '베르니니', '루벤스', '렘브란트', '베르메르', '벨라스케스',
      // 인상주의
      '모네', '클로드 모네', '르누아르', '드가', '에드가 드가', '마네', '피사로', '시슬레',
      // 후기인상주의
      '반 고흐', '반고흐', '빈센트 반 고흐', '폴 세잔', '세잔', '고갱', '폴 고갱', '툴루즈 로트렉',
      // 표현주의
      '뭉크', '에드바르 뭉크', '칸딘스키', '바실리 칸딘스키', '클레', '파울 클레',
      // 큐비즘
      '피카소', '파블로 피카소', '조르주 브라크', '브라크', '후안 그리스',
      // 초현실주의
      '달리', '살바도르 달리', '마그리트', '르네 마그리트', '미로', '호안 미로', '에른스트',
      // 추상표현주의
      '잭슨 폴록', '폴록', '마크 로스코', '로스코', '윌렘 드 쿠닝', '드 쿠닝',
      // 팝아트
      '앤디 워홀', '워홀', '로이 리히텐슈타인', '리히텐슈타인', '재스퍼 존스',
      // 한국 작가
      '김환기', '박수근', '이중섭', '천경자', '장욱진', '유영국',
      // 기타 현대
      '데이비드 호크니', '호크니', '제프 쿤스', '쿤스', '뱅크시'
    ];
    entities.artists = artists.filter(artist => message.includes(artist));

    // 시대/시기 추출
    const periods = [
      '고대', '중세', '르네상스', '바로크', '18세기', '19세기', '20세기', '21세기',
      '근세', '근대', '현대', '동시대', '전쟁전', '전쟁후', '1900년대', '2000년대'
    ];
    entities.periods = periods.filter(period => message.includes(period));

    // 기법/매체 추출
    const techniques = [
      '유화', '수채화', '아크릴', '템페라', '파스텔', '목탄', '연필', '펜화',
      '판화', '목판화', '동판화', '석판화', '실크스크린', '조각', '청동', '대리석',
      '도자기', '칠기', '금속공예', '직물', '태피스트리', '모자이크', '프레스코',
      '콜라주', '아상블라주', '설치', '비디오', '사진', '디지털', 'VR'
    ];
    entities.techniques = techniques.filter(technique => message.includes(technique));

    // 색상 추출 (확장)
    const colors = [
      '빨간색', '빨강', '적색', '파란색', '파랑', '청색', '노란색', '노랑', '황색',
      '초록색', '초록', '녹색', '보라색', '보라', '자주색', '주황색', '주황', '오렌지',
      '검은색', '검정', '흑색', '흰색', '하양', '백색', '회색', '회색', '갈색', '분홍',
      '금색', '은색', '청록', '남색', '자홍', '라임', '올리브', '마젠타'
    ];
    entities.colors = colors.filter(color => message.includes(color));

    // 감정/분위기 추출 (확장)
    const emotions = [
      '행복', '기쁨', '즐거움', '슬픔', '우울', '애수', '분노', '화남', '격정',
      '평온', '고요', '평화', '역동', '활기', '에너지', '강렬', '격렬', '부드러운',
      '온화', '따뜻', '차가운', '신비', '몽환', '환상', '현실', '꿈', '희망', '절망'
    ];
    entities.emotions = emotions.filter(emotion => message.includes(emotion));

    // 박물관/기관 추출
    const museums = [
      '루브르', '오르세', '퐁피두', 'MoMA', '메트로폴리탄', '구겐하임', '테이트',
      '내셔널 갤러리', '에르미타주', '우피치', '국립현대미술관', '리움', '간송미술관',
      '삼성미술관', '예술의전당', '서울시립미술관', '부산시립미술관'
    ];
    entities.museums = museums.filter(museum => message.includes(museum));

    // 주제/테마 추출
    const themes = [
      '초상화', '풍경화', '정물화', '역사화', '종교화', '신화', '일상', '도시',
      '자연', '바다', '산', '꽃', '동물', '인물', '추상', '기하학', '유기체',
      '전쟁', '평화', '사랑', '죽음', '탄생', '성장', '변화', '시간'
    ];
    entities.themes = themes.filter(theme => message.includes(theme));

    // 매체/재료 추출
    const mediums = [
      '캔버스', '종이', '나무', '금속', '돌', '점토', '유리', '직물', '플라스틱',
      '디지털', '비디오', '사진', '설치', '조각', '회화', '드로잉', '판화', '공예'
    ];
    entities.mediums = mediums.filter(medium => message.includes(medium));

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
      logger.error('Error loading user context:', error);
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
      
      case 'quiz':
        return this.generateQuizResponse(context, request);
      
      case 'comparison':
        return this.generateComparisonResponse(context, request);
      
      case 'technique':
        return this.generateTechniqueResponse(context, request);
      
      case 'museum':
        return this.generateMuseumResponse(context, request);
      
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
    const entities = context.entities;
    
    // 구체적인 스타일/운동 설명
    if (entities.styles && entities.styles.length > 0) {
      return this.generateStyleEducation(entities.styles[0]);
    }

    // 구체적인 작가 설명
    if (entities.artists && entities.artists.length > 0) {
      return this.generateArtistEducation(entities.artists[0]);
    }

    // 기법/재료 설명
    if (entities.techniques && entities.techniques.length > 0) {
      return this.generateTechniqueEducation(entities.techniques[0]);
    }

    // 색채 이론
    if (message.includes('색채') || message.includes('색상') || message.includes('컬러')) {
      return this.generateColorTheoryResponse();
    }

    // 구성/조형 원리
    if (message.includes('구성') || message.includes('조형') || message.includes('원리')) {
      return this.generateCompositionResponse();
    }

    // 미술사
    if (message.includes('미술사') || message.includes('역사') || entities.periods) {
      return this.generateArtHistoryResponse(entities.periods?.[0]);
    }

    // 일반적인 교육 응답
    return {
      success: true,
      response: `🎨 **미술 교육 도우미입니다!** 🎨

저는 다음과 같은 주제에 대해 상세하고 흥미진진한 설명을 제공할 수 있습니다:

**🎭 미술 운동과 스타일**
- 고전부터 현대까지 모든 주요 미술 운동
- 각 스타일의 특징과 역사적 맥락
- 대표 작품과 작가들의 이야기

**👨‍🎨 작가와 작품 세계**
- 유명 작가들의 생애와 예술 철학
- 작품에 담긴 의미와 기법
- 흥미로운 일화와 숨겨진 이야기

**🎨 미술 기법과 재료**
- 전통 회화부터 현대 디지털 아트까지
- 각 기법의 특징과 사용법
- 작가들이 왜 특정 기법을 선택했는지

**🌈 색채 이론과 구성 원리**
- 색의 심리학과 상징성
- 시각적 구성의 기본 원리
- 명작들의 조형적 분석

**📚 미술사의 흐름**
- 시대별 주요 특징과 변화
- 사회적 배경과 예술의 관계
- 동서양 미술의 교류와 영향

구체적으로 어떤 주제가 궁금하신가요? 예를 들어:
• "르네상스에 대해 알려주세요"
• "피카소의 작품 세계는?"
• "유화 기법의 특징은?"
• "색채 심리학이 뭔가요?"`
    };
  }

  /**
   * 분석 응답 생성
   */
  private generateAnalysisResponse(
    context: ConversationContext,
    request: ChatRequest
  ): ChatResponse {
    const entities = context.entities;
    
    // 특정 작가 분석
    if (entities.artists && entities.artists.length > 0) {
      return this.generateArtistAnalysis(entities.artists[0]);
    }

    // 특정 스타일 분석
    if (entities.styles && entities.styles.length > 0) {
      return this.generateStyleAnalysis(entities.styles[0]);
    }

    return {
      success: true,
      response: `🔍 **전문적인 미술 작품 분석을 도와드리겠습니다!**

저는 다음과 같은 다각도 분석을 제공합니다:

**🎨 조형적 분석**
• 색채 구성과 색채 대비 효과
• 선과 형태의 사용법과 의미
• 공간 구성과 원근법
• 질감과 붓터치의 표현력

**📖 내용적 분석**
• 주제와 소재의 상징적 의미
• 작가의 의도와 메시지
• 문화적, 종교적 배경
• 시대적 맥락과 사회적 영향

**🎭 양식적 분석**
• 미술사적 위치와 의의
• 기법과 표현 방식의 혁신성
• 다른 작품들과의 비교
• 후대에 미친 영향

**💭 감상과 해석**
• 작품이 주는 감정과 인상
• 다양한 관점에서의 해석
• 현대적 의의와 가치

분석하고 싶은 구체적인 작품이나 작가를 알려주세요!
예: "모나리자 분석해주세요", "피카소 작품의 특징은?", "인상주의 작품들의 공통점은?"`
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
    // 실제 작품 이미지 URL을 포함한 추천 데이터
    const mockRecommendations = [
      {
        artworkId: 'rec_1',
        title: '별이 빛나는 밤 (The Starry Night)',
        artist: '빈센트 반 고흐',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/320px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
        style: '후기 인상주의',
        score: 0.92,
        reasoning: '역동적인 붓터치와 강렬한 색채가 특징인 반 고흐의 대표작입니다',
        year: '1889',
        museum: 'MoMA, 뉴욕'
      },
      {
        artworkId: 'rec_2',
        title: '수련 (Water Lilies)',
        artist: '클로드 모네',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Claude_Monet_-_Le_Bassin_Aux_Nymph%C3%A9as.jpg/1280px-Claude_Monet_-_Le_Bassin_Aux_Nymph%C3%A9as.jpg',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Claude_Monet_-_Le_Bassin_Aux_Nymph%C3%A9as.jpg/320px-Claude_Monet_-_Le_Bassin_Aux_Nymph%C3%A9as.jpg',
        style: '인상주의',
        score: 0.88,
        reasoning: '빛과 색채의 순간적 변화를 포착한 모네의 연작 중 하나입니다',
        year: '1906',
        museum: '시카고 미술관'
      },
      {
        artworkId: 'rec_3',
        title: '아비뇽의 처녀들 (Les Demoiselles d\'Avignon)',
        artist: '파블로 피카소',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Les_Demoiselles_d%27Avignon.jpg/1024px-Les_Demoiselles_d%27Avignon.jpg',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Les_Demoiselles_d%27Avignon.jpg/320px-Les_Demoiselles_d%27Avignon.jpg',
        style: '큐비즘',
        score: 0.85,
        reasoning: '큐비즘의 시작을 알린 혁명적인 작품입니다',
        year: '1907',
        museum: 'MoMA, 뉴욕'
      },
      {
        artworkId: 'rec_4',
        title: '절규 (The Scream)',
        artist: '에드바르 뭉크',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/800px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/320px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg',
        style: '표현주의',
        score: 0.83,
        reasoning: '인간의 실존적 불안을 표현한 표현주의의 대표작입니다',
        year: '1893',
        museum: '노르웨이 국립미술관'
      },
      {
        artworkId: 'rec_5',
        title: '진주 귀걸이를 한 소녀 (Girl with a Pearl Earring)',
        artist: '요하네스 베르메르',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/800px-1665_Girl_with_a_Pearl_Earring.jpg',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/320px-1665_Girl_with_a_Pearl_Earring.jpg',
        style: '바로크',
        score: 0.81,
        reasoning: '빛과 그림자의 대비가 아름다운 바로크 초상화입니다',
        year: '1665',
        museum: '마우리츠하위스 미술관, 헤이그'
      },
      {
        artworkId: 'rec_6',
        title: '게르니카 (Guernica)',
        artist: '파블로 피카소',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/74/PicassoGuernica.jpg/1280px-PicassoGuernica.jpg',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/74/PicassoGuernica.jpg/320px-PicassoGuernica.jpg',
        style: '큐비즘',
        score: 0.79,
        reasoning: '전쟁의 참상을 큐비즘으로 표현한 피카소의 역작입니다',
        year: '1937',
        museum: '레이나 소피아 미술관, 마드리드'
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
      logger.error('Get chat history error:', error);
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