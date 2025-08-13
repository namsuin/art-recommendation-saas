# Deployment Guide for Art Recommendation SaaS

## Render Deployment Setup

### 1. Environment Variables Configuration

Configure these environment variables in your Render dashboard:

**Required:**
- `PORT` = `3000`
- `NODE_ENV` = `production`

**Database (Required for full functionality):**
- `SUPABASE_URL` = Your Supabase URL
- `SUPABASE_ANON_KEY` = Your Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase Service Role Key

**AI Services (Optional - at least one recommended):**
- `GOOGLE_CLOUD_PROJECT_ID` = Your Google Cloud Project ID
- `CLARIFAI_API_KEY` = Your Clarifai API Key
- `REPLICATE_API_TOKEN` = Your Replicate API Token
- `GEMINI_API_KEY` = Your Google Gemini API Key
- `MISTRAL_API_KEY` = Your Mistral API Key
- `OPENAI_API_KEY` = Your OpenAI API Key

**Payment (Optional):**
- `STRIPE_SECRET_KEY` = Your Stripe Secret Key
- `STRIPE_PUBLISHABLE_KEY` = Your Stripe Publishable Key

**Admin:**
- `ADMIN_AUTH_CODE` = `ADMIN2025SECRET`

### 2. Deployment Configuration

Your `render.yaml` is configured with:
- Docker runtime using Bun
- Health check endpoint: `/api/health`
- Automatic deployments enabled
- Free tier resource limits

### 3. Common 502 Bad Gateway Fixes

If you encounter 502 errors, check:

1. **Port Binding**: Ensure your app binds to `0.0.0.0:3000`
2. **Environment Variables**: Verify all required env vars are set
3. **Build Process**: Check build logs for errors
4. **Dependencies**: Ensure all dependencies install correctly
5. **Startup Time**: App must respond within 60 seconds

### 4. Deployment Steps

1. Push your code to GitHub
2. Connect your GitHub repo to Render
3. Configure environment variables in Render dashboard
4. Deploy using the `render.yaml` configuration
5. Monitor deployment logs
6. Test health endpoint: `https://your-app.onrender.com/api/health`

### 5. Troubleshooting

**502 Bad Gateway:**
- Check Render logs for startup errors
- Verify port configuration (`PORT=3000`)
- Ensure Dockerfile builds successfully
- Test locally with `bun start`

**Build Failures:**
- Check all dependencies are listed in package.json
- Verify Bun compatibility of packages
- Check TypeScript compilation errors

**Runtime Errors:**
- Monitor application logs in Render dashboard
- Check database connections (Supabase)
- Verify API keys are correctly set

### 6. Health Monitoring

The app includes:
- Health check endpoint: `/api/health`
- Startup validation script
- Error handling for critical services
- Graceful degradation for optional services

### 7. Performance Optimization

For better performance:
- Use appropriate Render plan (upgrade from free)
- Enable Redis caching (optional)
- Optimize Docker image size
- Configure proper logging levels

### 8. Security

Security features:
- Non-root user in Docker container
- Environment variable validation
- Admin authentication
- CORS configuration
- Error message sanitization