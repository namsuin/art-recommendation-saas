# Grok API Setup Guide

## 🎨 Grok (xAI) Integration Complete!

The AI Art Generator now supports Grok API for image generation.

## 📋 Setup Instructions

1. **Get your Grok API Key**
   - Visit: https://x.ai/api
   - Sign up or log in to get your API key
   - The API uses the model: `grok-2-image-1212`

2. **Add API Key to .env file**
   ```bash
   # Add one of these to your .env file:
   GROK_API_KEY=your-api-key-here
   # or
   XAI_API_KEY=your-api-key-here
   ```

3. **Test the Integration**
   ```bash
   bun test-grok.ts
   ```

## 🚀 Features

- **High-quality image generation** with Grok's Aurora model
- **Automatic fallback** to Stable Diffusion or DALL-E if Grok fails
- **Support for keywords, style, mood, and colors**
- **Integrated with the AI Art Generator tab** in the frontend

## 💰 Pricing

- Grok charges **$0.07 per image**
- Up to 10 images per request
- Limited to 5 requests per second

## 🔧 Technical Details

- **Endpoint**: `https://api.x.ai/v1/images/generations`
- **Model**: `grok-2-image-1212`
- **Format**: JPG images
- **Authentication**: Bearer token (OpenAI-compatible format)

## ⚠️ Current Limitations

- No support for quality, size, or style parameters yet (xAI API limitation)
- Fixed output format (JPG only)
- Size adjustments not supported by the API

## 📝 Usage in Application

1. Go to the **"AI 아트 생성기"** tab
2. Enter keywords or use common keywords from analyzed images
3. Click **"AI 이미지 생성하기"**
4. The system will try Grok first, then fall back to other services if needed

## 🧪 Testing

Run the test script to verify your setup:
```bash
bun test-grok.ts
```

When successful, you'll see:
- ✅ Grok API key detected
- 🎉 Image generation successful!
- Service used: Grok (xAI)