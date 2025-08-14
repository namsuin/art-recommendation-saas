import { serverLogger } from '../../shared/logger';
import { ArtworkManagementAPI } from '../api/artwork-management';

export interface RouteHandler {
  (req: Request, corsHeaders: Record<string, string>): Promise<Response>;
}

export class ArtworkRoutes {

  async handleArtworkRegister(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    const response = await ArtworkManagementAPI.registerArtwork(req);
    const responseBody = await response.text();
    
    return new Response(responseBody, {
      status: response.status,
      headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
    });
  }

  async handleArtworkApprove(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    const response = await ArtworkManagementAPI.approveArtwork(req);
    const responseBody = await response.text();
    
    return new Response(responseBody, {
      status: response.status,
      headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
    });
  }

  async handleArtworkReject(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    const response = await ArtworkManagementAPI.rejectArtwork(req);
    const responseBody = await response.text();
    
    return new Response(responseBody, {
      status: response.status,
      headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
    });
  }

  async handleGetApprovedArtworks(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    const response = await ArtworkManagementAPI.getApprovedArtworks(req);
    const responseBody = await response.text();
    
    return new Response(responseBody, {
      status: response.status,
      headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
    });
  }

  async handleGetArtistArtworks(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    const response = await ArtworkManagementAPI.getArtistArtworks(req);
    const responseBody = await response.text();
    
    return new Response(responseBody, {
      status: response.status,
      headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
    });
  }

  async handleGetArtworkStats(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    const response = await ArtworkManagementAPI.getArtworkStats(req);
    const responseBody = await response.text();
    
    return new Response(responseBody, {
      status: response.status,
      headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
    });
  }

  async handleUpdateArtwork(req: Request, corsHeaders: Record<string, string>, artworkId: string): Promise<Response> {
    const response = await ArtworkManagementAPI.updateArtwork(req, artworkId);
    const responseBody = await response.text();
    
    return new Response(responseBody, {
      status: response.status,
      headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
    });
  }

  async handleDeleteArtwork(req: Request, corsHeaders: Record<string, string>, artworkId: string): Promise<Response> {
    const response = await ArtworkManagementAPI.deleteArtwork(req, artworkId);
    const responseBody = await response.text();
    
    return new Response(responseBody, {
      status: response.status,
      headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
    });
  }

  // Admin artwork management endpoints
  async handleAdminRegisterArtwork(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      const formData = await req.formData();
      const title = formData.get("title") as string;
      const artist = formData.get("artist") as string;
      const artist_bio = formData.get("artist_bio") as string;
      const description = formData.get("description") as string;
      const year = formData.get("year") as string;
      const medium = formData.get("medium") as string;
      const style = formData.get("style") as string;
      const imageFile = formData.get("image") as File | null;
      const imageUrl = formData.get("image_url") as string;

      if (!title || !artist) {
        return new Response(JSON.stringify({
          success: false,
          error: "Title and artist are required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      if (!imageFile && !imageUrl) {
        return new Response(JSON.stringify({
          success: false,
          error: "Image file or URL is required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      const { artworkRegistry } = await import('../services/artwork-registry');
      
      const result = await artworkRegistry.registerArtwork({
        title,
        artist,
        artist_bio: artist_bio || undefined,
        description: description || undefined,
        year: year ? parseInt(year) : undefined,
        medium: medium || undefined,
        style: style || undefined,
        image_file: imageFile ? Buffer.from(await imageFile.arrayBuffer()) : undefined,
        image_url: imageUrl || undefined
      }, 'admin');
      
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (error) {
      serverLogger.error("Failed to register artwork:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to register artwork"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }

  async handleAdminGetArtworks(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      const { artworkRegistry } = await import('../services/artwork-registry');
      const artworks = artworkRegistry.getAllArtworks();
      
      return new Response(JSON.stringify({
        success: true,
        artworks
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to fetch artworks"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }

  async handleAdminDeleteArtwork(req: Request, corsHeaders: Record<string, string>, artworkId: string): Promise<Response> {
    try {
      if (!artworkId) {
        return new Response(JSON.stringify({
          success: false,
          error: "Artwork ID is required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      const { artworkRegistry } = await import('../services/artwork-registry');
      const deleted = artworkRegistry.deleteArtwork(artworkId);
      
      return new Response(JSON.stringify({
        success: deleted,
        message: deleted ? "Artwork deleted successfully" : "Artwork not found"
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to delete artwork"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }

  async handleAdminUpdateArtwork(req: Request, corsHeaders: Record<string, string>, artworkId: string): Promise<Response> {
    try {
      if (!artworkId) {
        return new Response(JSON.stringify({
          success: false,
          error: "Artwork ID is required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      const body = await req.json();
      const { available } = body;
      
      if (typeof available !== 'boolean') {
        return new Response(JSON.stringify({
          success: false,
          error: "Available status is required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      const { artworkRegistry } = await import('../services/artwork-registry');
      const updated = artworkRegistry.updateArtworkAvailability(artworkId, available);
      
      return new Response(JSON.stringify({
        success: updated,
        message: updated ? 
          `Artwork ${available ? 'activated' : 'deactivated'} successfully` : 
          "Artwork not found"
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (error) {
      serverLogger.error("Failed to update artwork availability:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to update artwork availability"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
}