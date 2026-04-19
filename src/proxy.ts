import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// En Next.js 16+, esta es la función que maneja el ruteo y subdominios
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const url = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Lógica de Subdominios para Catálogo Público
  const baseDomain =
    process.env.NODE_ENV === "production" ? "invenza.do" : "localhost:3000";
  const currentHost = hostname.replace(`.${baseDomain}`, "");

  // Protección de ERP
  const isAuthRoute =
    url.pathname.startsWith("/login") || url.pathname.startsWith("/register");
  const isProtectedRoute =
    url.pathname.startsWith("/overview") ||
    url.pathname.startsWith("/pos") ||
    url.pathname.startsWith("/inventory") ||
    url.pathname.startsWith("/settings") ||
    url.pathname.startsWith("/products"); // ERP products management

  const isPublicRoute = url.pathname === "/" || (!isProtectedRoute && !isAuthRoute && !url.pathname.startsWith("/_next") && !url.pathname.includes("."));

  if (
    currentHost !== baseDomain &&
    currentHost !== "www" &&
    currentHost !== hostname &&
    isPublicRoute
  ) {
    const rewriteUrl = new URL(`/${currentHost}${url.pathname}`, request.url);
    console.log(`[Proxy] Rewriting ${request.url} to ${rewriteUrl.toString()}`);
    return NextResponse.rewrite(rewriteUrl);
  }

  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  return supabaseResponse;
}

// Configuración de rutas excluidas
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};