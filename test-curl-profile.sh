#!/bin/bash

echo "🧪 Testing profile update with curl..."

# Test profile update with curl
curl -X POST http://localhost:3000/api/profile/update \
  -F "userId=46f3e470-fb03-4bcb-8bd8-4462f35ecafe" \
  -F "displayName=테스트 업데이트 사용자" \
  -F "nickname=테스트업데이트닉네임" \
  -v

echo ""
echo "✅ Test completed"