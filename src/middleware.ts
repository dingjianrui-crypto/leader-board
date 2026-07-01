import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasLocalePrefix = routing.locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));

  if (!hasLocalePrefix) {
    const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "") ?? "http";
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const locale = detectLocale(request);
    const targetPath = `/${locale}${pathname === "/" ? "" : pathname}${search}`;

    if (!host) {
      return NextResponse.redirect(new URL(targetPath, request.url));
    }

    return NextResponse.redirect(`${protocol}://${host}${targetPath}`);
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

function detectLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (isSupportedLocale(cookieLocale)) {
    return cookieLocale;
  }

  const acceptedLanguages = parseAcceptLanguage(request.headers.get("accept-language"));
  for (const language of acceptedLanguages) {
    const normalized = language.toLowerCase();
    if (normalized === "zh" || normalized.startsWith("zh-")) {
      return "zh-CN";
    }
    if (normalized === "en" || normalized.startsWith("en-")) {
      return "en";
    }
  }

  return routing.defaultLocale;
}

function isSupportedLocale(value: string | undefined): value is (typeof routing.locales)[number] {
  return routing.locales.includes(value as (typeof routing.locales)[number]);
}

function parseAcceptLanguage(header: string | null) {
  if (!header) {
    return [];
  }

  return header
    .split(",")
    .map((part) => {
      const [language, ...params] = part.trim().split(";");
      const qualityParam = params.find((param) => param.trim().startsWith("q="));
      const quality = qualityParam ? Number(qualityParam.trim().slice(2)) : 1;
      return {
        language,
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((item) => item.language)
    .sort((a, b) => b.quality - a.quality)
    .map((item) => item.language);
}
