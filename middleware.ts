import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(list) { list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)); }
      }
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = req.nextUrl.pathname;
  const isLogin = pathname.startsWith("/login");
  const isApiAuth = pathname.startsWith("/api/auth");
  const isCron = pathname.startsWith("/api/cron");
  const isUpdatePassword = pathname.startsWith("/update-password");
  if (!user && !isLogin && !isApiAuth && !isCron && !isUpdatePassword) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
