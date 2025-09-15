#!/bin/bash

# Google AutoML Vision 커스텀 모델 학습 설정 스크립트

set -e

echo "🎨 Google AutoML Vision 커스텀 모델 설정 시작..."

# 환경 변수 확인
if [ -z "$GOOGLE_CLOUD_PROJECT" ]; then
  echo "❌ GOOGLE_CLOUD_PROJECT 환경 변수가 설정되지 않았습니다."
  echo "   export GOOGLE_CLOUD_PROJECT=your-project-id 를 실행하세요."
  exit 1
fi

echo "📋 프로젝트 ID: $GOOGLE_CLOUD_PROJECT"

# Google Cloud SDK 확인
if ! command -v gcloud &> /dev/null; then
  echo "❌ Google Cloud SDK가 설치되지 않았습니다."
  echo "   https://cloud.google.com/sdk/docs/install 에서 설치하세요."
  exit 1
fi

echo "✅ Google Cloud SDK 확인 완료"

# 프로젝트 설정
echo "🔧 프로젝트 설정 중..."
gcloud config set project $GOOGLE_CLOUD_PROJECT

# 필요한 API 활성화
echo "📡 필요한 API 활성화 중..."
gcloud services enable automl.googleapis.com
gcloud services enable storage-component.googleapis.com
gcloud services enable vision.googleapis.com

# 서비스 계정 생성
SERVICE_ACCOUNT="automl-service-account"
echo "👤 서비스 계정 생성: $SERVICE_ACCOUNT"

# 기존 서비스 계정이 있는지 확인
if gcloud iam service-accounts describe ${SERVICE_ACCOUNT}@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com &>/dev/null; then
  echo "ℹ️  서비스 계정이 이미 존재합니다."
else
  gcloud iam service-accounts create $SERVICE_ACCOUNT \
    --display-name="AutoML Service Account for Art Analysis"
fi

# 권한 부여
echo "🔐 서비스 계정 권한 설정 중..."
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/automl.admin"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# 서비스 계정 키 생성
KEY_FILE="./automl-service-account-key.json"
echo "🔑 서비스 계정 키 생성: $KEY_FILE"

if [ ! -f "$KEY_FILE" ]; then
  gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=${SERVICE_ACCOUNT}@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com
  echo "✅ 서비스 계정 키 생성 완료"
else
  echo "ℹ️  서비스 계정 키 파일이 이미 존재합니다."
fi

# Cloud Storage 버킷 생성
BUCKET_NAME="${GOOGLE_CLOUD_PROJECT}-automl-training"
echo "🗂️  Cloud Storage 버킷 생성: $BUCKET_NAME"

if gsutil ls -b gs://$BUCKET_NAME &>/dev/null; then
  echo "ℹ️  버킷이 이미 존재합니다."
else
  gsutil mb gs://$BUCKET_NAME
  echo "✅ 버킷 생성 완료"
fi

# 환경 변수 파일 생성
ENV_FILE=".env.automl"
echo "📝 환경 변수 파일 업데이트: $ENV_FILE"

cat > $ENV_FILE << EOF
# Google AutoML Vision 설정
AUTOML_PROJECT_ID=$GOOGLE_CLOUD_PROJECT
GOOGLE_APPLICATION_CREDENTIALS=./automl-service-account-key.json
AUTOML_TRAINING_BUCKET=$BUCKET_NAME
USE_CUSTOM_MODEL=false

# 학습된 모델 이름 (학습 완료 후 설정)
# AUTOML_MODEL_NAME=projects/$GOOGLE_CLOUD_PROJECT/locations/us-central1/models/MODEL_ID

# 모델 학습 예산 (밀리노드 시간, 8000 = 8시간)
AUTOML_TRAIN_BUDGET=8000
EOF

echo "✅ 환경 변수 파일 생성 완료"

# 학습 스크립트 실행 가이드
echo ""
echo "🎉 AutoML 설정 완료!"
echo ""
echo "다음 단계:"
echo "1. 학습 데이터 준비: bun scripts/prepare-training-data.ts"
echo "2. 모델 학습 시작: bun scripts/train-automl-model.ts"
echo "3. 학습 완료 후 .env.automl 파일에서 AUTOML_MODEL_NAME 설정"
echo "4. USE_CUSTOM_MODEL=true 로 변경하여 커스텀 모델 활성화"
echo ""
echo "📋 생성된 파일:"
echo "   - $KEY_FILE (서비스 계정 키)"
echo "   - $ENV_FILE (환경 변수)"
echo "   - gs://$BUCKET_NAME (학습 데이터 버킷)"
echo ""