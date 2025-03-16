import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const providers: Record<string, { clientId: string; clientSecret: string; authUrl: string; tokenUrl: string; redirectUri: string, scope:string, state:string }> = {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authUrl: "https://accounts.google.com/o/oauth2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback?provider=google`,
        scope: encodeURIComponent(
            'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        ),
        state: encodeURIComponent(`site=google&backend=${process.env.NEXT_PUBLIC_BASE_URL}`),
    },
    github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        authUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback?provider=github`,
        scope:encodeURIComponent(""),
        state: encodeURIComponent(`site=google&backend=${process.env.NEXT_PUBLIC_BASE_URL}`),
    },
};

export async function fetchToken(provider: string, code: string) {
    const config = providers[provider];
    if (!config) throw new Error(`Unknown provider: ${provider}`);

    const response = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: config.redirectUri,
        }),
    });

    if (!response.ok) throw new Error(`Failed to fetch token: ${await response.text()}`);
    return response.json();
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!provider || !providers[provider]) {
        return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    return new Response(`
        <script>
          window.opener?.postMessage({ provider: "${provider}", success: true }, window.location.origin);
          window.close();
        </script>
      `, { headers: { "Content-Type": "text/html" } });

    // if (!code) {
    //     const authUrl = `${providers[provider].authUrl}?client_id=${providers[provider].clientId}&redirect_uri=${providers[provider].redirectUri}&response_type=code&scope=${providers[provider].scope}&state=${state}`;
    //     return NextResponse.redirect(authUrl);
    // }

    // try {
    //     const { access_token, expires_in } = await fetchToken(provider, code);

    //     if (!access_token) throw new Error("Authentication failed");

    //     (await cookies()).set(`auth_${provider}_token`, access_token, { path: "/", httpOnly: true, secure: true, maxAge: expires_in });

    //     // **Step 3: Send message to parent window & close popup**
    //     return new Response(`
    //   <script>
    //     window.opener?.postMessage({ provider: "${provider}", success: true }, window.location.origin);
    //     window.close();
    //   </script>
    // `, { headers: { "Content-Type": "text/html" } });
    // } catch (error) {
    //     return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    // }
}

