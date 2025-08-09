#!/usr/bin/env bun

/**
 * Test script for Grok API integration
 * Usage: bun test-grok.ts
 */

import { AIImageGenerator } from './backend/services/ai-image-generator';

async function testGrokIntegration() {
  console.log('🧪 Testing Grok API Integration...\n');
  
  const generator = new AIImageGenerator();
  
  // Check service availability
  console.log('📋 Service availability:', generator.isAvailable());
  console.log('🛠️ Available services:', generator.getAvailableServices());
  
  // Check if Grok API key is configured
  const hasGrokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  
  if (!hasGrokKey) {
    console.log('\n⚠️ Grok API key not configured!');
    console.log('Please set GROK_API_KEY or XAI_API_KEY in your .env file');
    console.log('You can get an API key from: https://x.ai/api\n');
    return;
  }
  
  console.log('\n✅ Grok API key detected');
  console.log('🎨 Attempting to generate a test image...\n');
  
  try {
    const result = await generator.generateImage({
      keywords: ['futuristic', 'city', 'sunset', 'neon lights', 'cyberpunk'],
      style: 'digital art',
      mood: 'dramatic',
      colors: ['purple', 'orange', 'blue'],
      width: 768,
      height: 768
    });
    
    console.log('🎉 Image generation successful!');
    console.log('📸 Image URL:', result.imageUrl);
    console.log('💬 Prompt used:', result.prompt);
    console.log('⏱️ Processing time:', result.processingTime + 'ms');
    console.log('🔧 Service used:', generator.getAvailableServices()[0]);
    
  } catch (error) {
    console.error('❌ Image generation failed:', error);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check if your API key is valid');
    console.log('2. Ensure you have credits/quota available');
    console.log('3. Check the API documentation at: https://docs.x.ai/');
  }
}

// Run the test
testGrokIntegration();