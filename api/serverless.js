// Vercel serverless function wrapper
import '../server.ts';

export default async function handler(req, res) {
  // Bun server is already initialized in server.ts
  // This is just a wrapper for Vercel
  res.status(200).json({ 
    message: "Please use Render or Railway for Bun deployment. Vercel doesn't fully support Bun runtime yet." 
  });
}