const server = Bun.serve({
  port: 3000,
  hostname: "0.0.0.0",
  
  fetch(req) {
    return new Response("🎨 Art Recommendation Server is running!");
  }
});

console.log(`🚀 Server running at http://localhost:${server.port}`);