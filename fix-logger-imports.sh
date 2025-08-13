#!/bin/bash

# logger import가 없는 파일들에 import 추가
cd /Users/suin2/art-recommendation-saas/backend/services

files=(
"ab-test-framework.ts"
"academy-art-api.ts"
"admin-dashboard.ts"
"advanced-recommendation.ts"
"ai-art-generator.ts"
"ai-curator-chatbot.ts"
"analytics.ts"
"artpi-integration.ts"
"artsonia-api.ts"
"artsy-integration.ts"
"bluethumb-api.ts"
"business-metrics.ts"
"chicago-art-api.ts"
"clarifai-art-analysis.ts"
"comment-system.ts"
"degreeart-api.ts"
"email.ts"
"enhanced-image-analysis.ts"
"europeana-api.ts"
"expanded-art-search.ts"
"google-arts-culture-integration.ts"
"harvard-museums-api.ts"
"image-validation-service.ts"
"korea-museum-api.ts"
"korean-creative-platforms.ts"
"korean-cultural-api.ts"
"mock-artist-applications.ts"
"multi-image-analysis.ts"
"performance-monitor.ts"
"personalization-engine.ts"
"playform-integration.ts"
"recommendation-service.ts"
"review-system.ts"
"rijksmuseum-api.ts"
"role-auth.ts"
"runway-clip-gpt-pipeline.ts"
"social-features-v2.ts"
"social-media-integration.ts"
"supabase-admin.ts"
"sva-bfa-api.ts"
"trending-content.ts"
"user-behavior-analytics.ts"
"user-follow.ts"
"user-gallery.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        # 파일의 첫 번째 import 문 앞에 logger import 추가
        if grep -q "^import" "$file"; then
            # 첫 번째 import 문 찾기
            first_import_line=$(grep -n "^import" "$file" | head -1 | cut -d: -f1)
            # logger import 추가
            sed -i '' "${first_import_line}i\\
import { logger } from '../../shared/logger';\\
" "$file"
            echo "✅ Fixed: $file"
        else
            # import 문이 없으면 파일 맨 앞에 추가
            echo "import { logger } from '../../shared/logger';" | cat - "$file" > temp && mv temp "$file"
            echo "✅ Fixed (prepended): $file"
        fi
    fi
done

echo "✨ All files fixed!"