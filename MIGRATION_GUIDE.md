# 소셜 기능 데이터베이스 마이그레이션 가이드

## 🎯 개요
이 가이드는 Supabase에 소셜 기능을 위한 데이터베이스 테이블들을 생성하는 방법을 설명합니다.

## 📋 준비사항
- Supabase 프로젝트 접근 권한
- SQL Editor 사용 권한

## 🚀 마이그레이션 단계

### 1단계: Supabase 대시보드 접속
1. 브라우저에서 다음 URL로 이동:
   ```
   https://supabase.com/dashboard/project/lzvfmnnshjrjugsrmswu
   ```

2. SQL Editor 메뉴로 이동

### 2단계: SQL 실행
1. `SOCIAL_MIGRATION_SQL.sql` 파일의 내용을 복사
2. SQL Editor에 붙여넣기
3. "Run" 버튼 클릭하여 실행

### 3단계: 실행 확인
SQL 실행 후 다음 항목들이 생성되어야 합니다:

#### 🗃️ 생성된 테이블들
- ✅ `user_follows` - 팔로우 관계
- ✅ `artwork_likes` - 작품 좋아요
- ✅ `bookmark_collections` - 북마크 컬렉션
- ✅ `bookmark_items` - 북마크 아이템
- ✅ `community_posts` - 커뮤니티 포스트
- ✅ `post_likes` - 포스트 좋아요
- ✅ `post_comments` - 댓글
- ✅ `comment_likes` - 댓글 좋아요
- ✅ `notifications` - 알림

#### 🔐 보안 정책
- Row Level Security (RLS) 활성화
- 사용자별 데이터 접근 제어
- 공개/비공개 컨텐츠 정책

#### ⚡ 성능 최적화
- 인덱스 생성
- 자동 카운터 업데이트 트리거
- 기본 북마크 컬렉션 자동 생성

## 🧪 테스트 방법

### API 응답 확인
마이그레이션 완료 후 다음 명령어로 확인:

```bash
# 소셜 피드 테스트
curl -s http://localhost:3000/api/social/feed | jq .

# 포스트 생성 테스트
curl -X POST http://localhost:3000/api/social/post/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "content": "첫 번째 실제 데이터베이스 포스트!"
  }' | jq .
```

### 데이터베이스 확인
SQL Editor에서 실행:

```sql
-- 테이블 존재 확인
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%follow%' OR tablename LIKE '%like%' OR tablename LIKE '%post%'
ORDER BY tablename;

-- 컬럼 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'community_posts'
ORDER BY ordinal_position;
```

## ⚠️ 주의사항

1. **백업**: 기존 데이터가 있다면 미리 백업하세요
2. **권한**: Service Role 키가 필요할 수 있습니다
3. **순서**: SQL은 순서대로 실행되어야 합니다
4. **오류**: 일부 정책이 이미 존재한다는 오류는 무시해도 됩니다

## 🔧 문제 해결

### 자주 발생하는 오류

1. **외래키 제약 조건 오류**
   ```
   ERROR: relation "users" does not exist
   ```
   → `users` 테이블이 먼저 존재해야 합니다

2. **정책 중복 오류**
   ```
   ERROR: policy "policy_name" already exists
   ```
   → 무시하고 계속 진행하세요

3. **권한 오류**
   ```
   ERROR: permission denied
   ```
   → Service Role 키 사용을 확인하세요

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. Supabase 로그
2. SQL 구문 오류
3. 네트워크 연결
4. 권한 설정