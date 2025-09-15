#!/usr/bin/env bun

/**
 * AutoML Vision 커스텀 모델 학습 스크립트
 * 34,537개 Artsper 작품 데이터를 활용한 예술 스타일 분류 모델 학습
 */

import { ArtworkAutoMLTrainer } from '../ai-service/automl-trainer';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// 환경 변수 로드
function loadEnvFile(filename: string) {
  const envPath = join(process.cwd(), filename);
  if (!existsSync(envPath)) {
    console.error(`❌ 환경 변수 파일을 찾을 수 없습니다: ${filename}`);
    console.error('   먼저 ./scripts/setup-automl.sh 를 실행하세요.');
    process.exit(1);
  }

  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
}

async function main() {
  console.log('🎨 AutoML Vision 커스텀 모델 학습 시작...');
  
  // 환경 변수 로드
  loadEnvFile('.env.automl');
  
  const projectId = process.env.AUTOML_PROJECT_ID;
  const bucketName = process.env.AUTOML_TRAINING_BUCKET;
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!projectId || !bucketName || !keyFile) {
    console.error('❌ 필수 환경 변수가 설정되지 않았습니다.');
    console.error('   AUTOML_PROJECT_ID, AUTOML_TRAINING_BUCKET, GOOGLE_APPLICATION_CREDENTIALS');
    process.exit(1);
  }
  
  console.log(`📋 프로젝트 ID: ${projectId}`);
  console.log(`🗂️  저장소 버킷: ${bucketName}`);
  console.log(`🔑 인증 키: ${keyFile}`);
  
  const trainer = new ArtworkAutoMLTrainer(projectId, keyFile);
  
  try {
    console.log('\n📊 1단계: 데이터셋 생성...');
    const dataset = await trainer.createDataset('artwork-style-classifier');
    const datasetId = dataset.name!.split('/').pop()!;
    console.log(`✅ 데이터셋 생성 완료: ${datasetId}`);
    
    console.log('\n📤 2단계: 학습 데이터 업로드...');
    await trainer.uploadTrainingData(bucketName, './training-data');
    console.log('✅ 학습 데이터 업로드 완료');
    
    console.log('\n📥 3단계: 데이터셋에 데이터 import...');
    const csvPath = `gs://${bucketName}/training_data.csv`;
    await trainer.importData(dataset.name!, csvPath);
    console.log('✅ 데이터 import 완료');
    
    console.log('\n🧠 4단계: 모델 학습 시작...');
    console.log('⏱️  예상 소요 시간: 2-8시간 (데이터 크기에 따라)');
    console.log('💰 비용: 무료 티어 8시간 한도 내에서 진행');
    
    const model = await trainer.trainModel(dataset.name!, 'artwork-style-classifier-v1');
    const modelId = model.name!.split('/').pop()!;
    
    console.log(`✅ 모델 학습 완료: ${modelId}`);
    
    console.log('\n📈 5단계: 모델 평가...');
    await trainer.evaluateModel(model.name!);
    
    console.log('\n🚀 6단계: 모델 배포...');
    await trainer.deployModel(model.name!);
    
    // 환경 변수 파일 업데이트
    const envPath = '.env.automl';
    let envContent = readFileSync(envPath, 'utf-8');
    
    // AUTOML_MODEL_NAME 업데이트
    if (envContent.includes('AUTOML_MODEL_NAME=')) {
      envContent = envContent.replace(
        /AUTOML_MODEL_NAME=.*/,
        `AUTOML_MODEL_NAME=${model.name}`
      );
    } else {
      envContent += `\nAUTOML_MODEL_NAME=${model.name}\n`;
    }
    
    // USE_CUSTOM_MODEL 활성화
    envContent = envContent.replace(
      'USE_CUSTOM_MODEL=false',
      'USE_CUSTOM_MODEL=true'
    );
    
    await Bun.write(envPath, envContent);
    
    console.log('\n🎉 모든 단계 완료!');
    console.log('\n📋 다음 작업:');
    console.log(`   1. 모델 이름이 .env.automl 파일에 저장되었습니다`);
    console.log(`   2. USE_CUSTOM_MODEL=true 로 설정되었습니다`);
    console.log(`   3. 서버를 재시작하여 커스텀 모델을 활성화하세요`);
    console.log(`   4. 모델 성능 테스트: bun scripts/test-custom-model.ts`);
    
    console.log('\n🔗 모델 정보:');
    console.log(`   모델 이름: ${model.name}`);
    console.log(`   데이터셋: ${dataset.name}`);
    console.log(`   버킷: gs://${bucketName}`);
    
  } catch (error) {
    console.error('❌ 모델 학습 중 오류 발생:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        console.error('💳 할당량 초과: 무료 티어 한도를 확인하세요');
      } else if (error.message.includes('authentication')) {
        console.error('🔐 인증 오류: 서비스 계정 키를 확인하세요');
      } else if (error.message.includes('permission')) {
        console.error('🔒 권한 오류: 서비스 계정 권한을 확인하세요');
      }
    }
    
    console.error('\n🛠️  문제 해결:');
    console.error('   1. ./scripts/setup-automl.sh 재실행');
    console.error('   2. Google Cloud Console에서 API 활성화 확인');
    console.error('   3. 서비스 계정 권한 확인');
    console.error('   4. 무료 티어 할당량 확인');
    
    process.exit(1);
  }
}

// 스크립트 실행
if (import.meta.main) {
  main().catch(console.error);
}