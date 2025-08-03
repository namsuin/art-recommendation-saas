#!/usr/bin/env bun

// 개발 서버 - API와 프론트엔드 통합
import { serveIndexHTML } from './backend/routes/static';
import './backend/simple-server'; // API 서버 import

console.log('🚀 Starting integrated development server...');
console.log('📦 Frontend: Bun will auto-bundle React components');
console.log('🔧 Backend: API endpoints are ready');
console.log('\n🌐 Open http://localhost:3000 in your browser\n');