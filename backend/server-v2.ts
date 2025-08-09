import { printEnvironmentStatus, validateEnvironment } from "./utils/env-validator";
import { router } from "./routes/router";

interface WebSocketData {
  message: string;
  timestamp: number;
}

console.log('🚀 Starting Art Recommendation Server V2...\n');

// 환경 변수 검증
printEnvironmentStatus();
const envValidation = validateEnvironment();

if (!envValidation.isValid) {
  console.error('\n❌ Critical environment configuration errors detected!');
  console.error('Please check your .env file and fix the errors above.');
  process.exit(1);
}

// 서버 시작
const server = Bun.serve({
  port: 3000,
  hostname: "0.0.0.0",
  
  async fetch(req: Request) {
    try {
      // 모든 요청을 라우터에게 위임
      return await router.handleRequest(req);
    } catch (error) {
      console.error('Request handling error:', error);
      return new Response(JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  },

  // WebSocket 지원
  websocket: {
    open(ws) {
      console.log("WebSocket connection opened");
      ws.send(JSON.stringify({
        type: "connection",
        message: "Connected to AI Art Recommendation service V2",
        timestamp: Date.now()
      }));
    },

    message(ws, message) {
      console.log("WebSocket message received:", message);

      try {
        const data = JSON.parse(message.toString()) as WebSocketData;

        // Echo back with timestamp
        ws.send(JSON.stringify({
          type: "echo",
          originalMessage: data.message,
          serverTimestamp: Date.now(),
          clientTimestamp: data.timestamp
        }));
      } catch (error) {
        ws.send(JSON.stringify({
          type: "error",
          message: "Invalid JSON format",
          timestamp: Date.now()
        }));
      }
    },

    close(ws, code, message) {
      console.log("WebSocket connection closed:", code, message);
    }
  },

  error(error) {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

// 서버 시작 로그
console.log('\n🎉 Server V2 Started Successfully!');
console.log(`🚀 AI Art Recommendation Server running at http://localhost:${server.port}`);
console.log(`📱 WebSocket endpoint: ws://localhost:${server.port}`);
console.log(`🎨 Frontend: http://localhost:${server.port}`);
console.log(`❤️  Health check: http://localhost:${server.port}/api/health`);
console.log(`🔐 Authentication: Login/Signup available`);

console.log('\n📋 Registered Routes:');
const routes = router.getRegisteredRoutes();
routes.slice(0, 10).forEach(route => {
  console.log(`  - ${route}`);
});
if (routes.length > 10) {
  console.log(`  ... and ${routes.length - 10} more routes`);
}

console.log('\n✅ All systems operational!');