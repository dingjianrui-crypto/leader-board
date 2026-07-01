"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { routing, type Locale } from "@/i18n/routing";

const localeNames: Record<Locale, string> = {
  en: "English",
  "zh-CN": "中文",
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("settings");

  function switchLocale(nextLocale: Locale) {
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <label className="grid gap-2 text-sm text-slate-200 max-lg:hidden max-sm:block">
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        <Languages className="size-4" />
        {t("language")}
      </span>
      <select
        className="input min-h-10"
        value={locale}
        aria-label={t("language")}
        onChange={(event) => switchLocale(event.target.value as Locale)}
      >
        {routing.locales.map((item) => (
          <option key={item} value={item}>
            {localeNames[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
