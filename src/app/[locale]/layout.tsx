import { BarChart3, Database, Gauge, Settings2 } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import { hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link, routing } from "@/i18n/routing";
import { getSummaryCounts } from "@/lib/repositories/leaderboard";
import { LanguageSwitcher } from "./language-switcher";

const nav = [
  { href: "/", labelKey: "gsb", icon: Gauge },
  { href: "/compare", labelKey: "compare", icon: BarChart3 },
  { href: "/admin", labelKey: "admin", icon: Database },
  { href: "/providers", labelKey: "providers", icon: Settings2 },
] as const;

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const [counts, messages, tBrand, tNav, tMetrics] = await Promise.all([
    getSummaryCounts(),
    getMessages(),
    getTranslations("brand"),
    getTranslations("nav"),
    getTranslations("metrics"),
  ]);

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="grid min-h-screen grid-cols-[280px_minmax(0,1fr)] max-lg:grid-cols-[88px_minmax(0,1fr)] max-sm:grid-cols-1">
        <aside className="sticky top-0 flex h-screen flex-col gap-8 border-r border-border-soft bg-panel/80 p-6 max-sm:static max-sm:h-auto max-sm:flex-row max-sm:items-center max-sm:overflow-x-auto">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent font-mono text-xs font-black text-[#06101d] shadow-glow">
              LB
            </div>
            <div className="min-w-0 max-lg:hidden max-sm:block">
              <p className="m-0 text-lg font-semibold leading-tight">{tBrand("name")}</p>
              <p className="m-0 font-mono text-xs text-muted">{tBrand("tagline")}</p>
            </div>
          </Link>

          <nav className="grid gap-2 max-sm:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-11 items-center gap-3 rounded-2xl border border-transparent px-3 text-sm font-semibold text-slate-300 transition hover:border-border hover:bg-panel-warm hover:text-white"
              >
                <item.icon className="size-4 shrink-0" />
                <span className="max-lg:hidden max-sm:block">{tNav(item.labelKey)}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto grid gap-4">
            <LanguageSwitcher />
            <div className="rounded-2xl border border-border bg-panel p-4 max-lg:hidden max-sm:hidden">
            <p className="m-0 text-sm text-slate-300">{tBrand("activeSet")}</p>
            <Metric label={tMetrics("testCases")} value={counts.testCases} />
            <Metric label={tMetrics("modelOutputs")} value={counts.modelOutputs} />
            <Metric label={tMetrics("providerModels")} value={counts.providerModels} />
            </div>
          </div>
        </aside>
        <main className="min-w-0 p-6 max-sm:p-4">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-border-soft pt-3 text-sm">
      <span className="text-muted">{label}</span>
      <strong className="font-mono text-slate-50">{String(value).padStart(2, "0")}</strong>
    </div>
  );
}
