import { AuthAPI } from "../api/auth";

export interface RouteHandler {
  (req: Request): Promise<Response>;
}

// 인증 관련 라우트 핸들러들
export const authRoutes = new Map<string, RouteHandler>();

// 회원가입
authRoutes.set("POST:/api/auth/signup", async (req: Request) => {
  try {
    const { email, password, displayName } = await req.json();
    
    if (!email || !password) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "이메일과 비밀번호가 필요합니다." 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const result = await AuthAPI.signUp(email, password, displayName);
    
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: "회원가입 처리 중 오류가 발생했습니다."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

// 로그인
authRoutes.set("POST:/api/auth/signin", async (req: Request) => {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "이메일과 비밀번호가 필요합니다." 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const result = await AuthAPI.signIn(email, password);
    
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Signin error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: "로그인 처리 중 오류가 발생했습니다."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

// 로그아웃
authRoutes.set("POST:/api/auth/signout", async (req: Request) => {
  try {
    const result = await AuthAPI.signOut();
    
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Signout error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: "로그아웃 처리 중 오류가 발생했습니다."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

// 현재 사용자 정보
authRoutes.set("GET:/api/auth/user", async (req: Request) => {
  try {
    const result = await AuthAPI.getCurrentUser();
    
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 401,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: "사용자 정보 조회 중 오류가 발생했습니다."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

// 프로필 업데이트
authRoutes.set("PUT:/api/auth/profile", async (req: Request) => {
  try {
    const { userId, displayName, avatarUrl } = await req.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "사용자 ID가 필요합니다." 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const updates: { display_name?: string; avatar_url?: string } = {};
    if (displayName) updates.display_name = displayName;
    if (avatarUrl) updates.avatar_url = avatarUrl;

    const result = await AuthAPI.updateProfile(userId, updates);
    
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: "프로필 업데이트 중 오류가 발생했습니다."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

// 업로드 제한 확인
authRoutes.set("GET:/api/auth/upload-limit", async (req: Request) => {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return new Response(JSON.stringify({ 
        canUpload: false, 
        remainingUploads: 0,
        error: "사용자 ID가 필요합니다."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const result = await AuthAPI.checkUploadLimit(userId);
    
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Upload limit check error:', error);
    return new Response(JSON.stringify({
      canUpload: true,
      remainingUploads: 10,
      error: "업로드 제한 확인 중 오류가 발생했습니다."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});