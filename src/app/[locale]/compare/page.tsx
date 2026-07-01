import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listCategories, listModelOutputs, listProvidersWithModels, listTestCases } from "@/lib/repositories/leaderboard";

type SearchParams = Promise<{
  categories?: string;
  models?: string;
  case?: string;
}>;

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const [t, tCommon] = await Promise.all([getTranslations("compare"), getTranslations("common")]);
  const selectedCategoryIds = splitParam(query.categories);
  const selectedModelIds = splitParam(query.models);

  const [categories, providers, testCaseList] = await Promise.all([
    listCategories(),
    listProvidersWithModels(),
    listTestCases({ categoryIds: selectedCategoryIds }),
  ]);

  const activeCase = testCaseList.find((item) => item.id === query.case) ?? testCaseList[0];
  const outputs = activeCase
    ? await listModelOutputs({
        testCaseId: activeCase.id,
        modelIds: selectedModelIds,
      })
    : [];

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p>
          <h1 className="m-0 text-3xl font-semibold tracking-normal">{t("title")}</h1>
        </div>
        <Link href="/admin" className="btn btn-primary">
          {t("newTestCase")}
        </Link>
      </header>

      <section className="panel grid gap-4">
        <FilterGroup title={t("categories")}>
          <FilterLink label={tCommon("all")} active={selectedCategoryIds.length === 0} params={{ models: query.models }} />
          {categories.map((category) => (
            <FilterLink
              key={category.id}
              label={category.name}
              active={selectedCategoryIds.includes(category.id)}
              params={{
                categories: toggle(selectedCategoryIds, category.id),
                models: query.models,
              }}
            />
          ))}
        </FilterGroup>

        <div className="grid gap-3">
          <p className="text-sm font-semibold text-slate-300">{t("providersModels")}</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {providers.map((provider) => (
              <div key={provider.id} className="rounded-2xl border border-border bg-[#0e1420] p-3">
                <p className="mb-2 text-sm font-semibold">{provider.name}</p>
                <div className="flex flex-wrap gap-2">
                  {provider.models.map((model) => (
                    <FilterLink
                      key={model.id}
                      label={`${model.name} ${model.version}`}
                      active={selectedModelIds.includes(model.id)}
                      params={{
                        categories: query.categories,
                        models: toggle(selectedModelIds, model.id),
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="panel grid content-start gap-3">
          <p className="text-sm font-semibold text-slate-300">{t("testCases")}</p>
          {testCaseList.map((testCase) => (
            <Link
              key={testCase.id}
              href={{
                pathname: "/compare",
                query: {
                  ...(query.categories ? { categories: query.categories } : {}),
                  ...(query.models ? { models: query.models } : {}),
                  case: testCase.id,
                },
              }}
              className={`rounded-2xl border p-3 text-left transition ${
                testCase.id === activeCase?.id
                  ? "border-accent bg-accent/10"
                  : "border-border bg-[#0e1420] hover:border-accent/70"
              }`}
            >
              <strong className="block text-sm">{testCase.title}</strong>
              <span className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                <span>{testCase.category.name}</span>
                <span>{testCase.assets.length} {t("refs")}</span>
                <span>{testCase.outputs.length} {t("outputs")}</span>
              </span>
            </Link>
          ))}
        </aside>

        <div className="grid gap-6">
          {activeCase ? (
            <>
              <article className="panel">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                  {activeCase.category.name}
                </p>
                <h2 className="mt-1 text-2xl font-semibold">{activeCase.title}</h2>
                <p className="max-w-4xl text-slate-300">{activeCase.prompt}</p>
                {activeCase.assets.length ? (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {activeCase.assets.map((asset) => (
                      <ReferencePreview key={asset.id} asset={asset} />
                    ))}
                  </div>
                ) : null}
              </article>

              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {outputs.length ? (
                  outputs.map((output) => (
                    <article key={output.id} className="overflow-hidden rounded-2xl border border-border bg-panel">
                      {output.videoAccessPath === "#" ? (
                        <div className="grid aspect-video place-items-center bg-[#05070d] text-sm text-muted">
                          {t("uploadVideoToPreview")}
                        </div>
                      ) : (
                        <video className="aspect-video w-full" src={output.videoAccessPath} controls preload="metadata" />
                      )}
                      <div className="grid gap-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="m-0 text-sm font-semibold">{output.model.provider.name}</p>
                            <p className="m-0 text-xs text-muted">
                              {output.model.name} · {output.model.version}
                            </p>
                          </div>
                          <strong className="font-mono text-lg text-accent">{output.gsbValue}</strong>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="panel lg:col-span-2">
                    <p className="text-slate-300">{t("noOutputs")}</p>
                  </div>
                )}
              </div>

              <div className="table-panel">
                <table className="min-w-[800px] w-full border-collapse text-left text-sm">
                  <thead className="bg-panel-warm text-xs uppercase tracking-[0.14em] text-muted">
                    <tr>
                      <th className="p-4">{t("rank")}</th>
                      <th className="p-4">{tCommon("provider")}</th>
                      <th className="p-4">{tCommon("model")}</th>
                      <th className="p-4">{tCommon("gsb")}</th>
                      <th className="p-4">{tCommon("comments")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outputs.map((output, index) => (
                      <tr key={output.id} className="border-t border-border-soft">
                        <td className="p-4 font-mono">{index + 1}</td>
                        <td className="p-4">{output.model.provider.name}</td>
                        <td className="p-4">{output.model.name}</td>
                        <td className="p-4 font-semibold text-accent">{output.gsbValue}</td>
                        <td className="max-w-xs p-4 text-muted">
                          <span className="line-clamp-2">{output.userComments || "-"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="panel">
              <p className="text-slate-300">{t("createToStart")}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ReferencePreview({
  asset,
}: {
  asset: {
    filename: string;
    assetType: string;
    mimeType: string;
    accessPath: string;
  };
}) {
  const label = asset.filename;

  if (asset.assetType === "image" || asset.mimeType.startsWith("image/")) {
    return (
      <figure className="w-40 overflow-hidden rounded-xl border border-border bg-[#05070d] sm:w-44">
        <img className="h-24 w-full object-cover" src={asset.accessPath} alt={label} />
        <figcaption className="truncate border-t border-border-soft px-3 py-2 text-xs text-muted">
          {label}
        </figcaption>
      </figure>
    );
  }

  if (asset.assetType === "video" || asset.mimeType.startsWith("video/")) {
    return (
      <figure className="w-40 overflow-hidden rounded-xl border border-border bg-[#05070d] sm:w-44">
        <video
          className="h-24 w-full object-cover"
          src={asset.accessPath}
          controls
          muted
          preload="metadata"
        />
        <figcaption className="truncate border-t border-border-soft px-3 py-2 text-xs text-muted">
          {label}
        </figcaption>
      </figure>
    );
  }

  if (asset.assetType === "audio" || asset.mimeType.startsWith("audio/")) {
    return (
      <figure className="grid min-h-24 w-56 content-center gap-2 rounded-xl border border-border bg-[#05070d] p-3">
        <figcaption className="truncate text-xs text-muted">{label}</figcaption>
        <audio className="w-full" src={asset.accessPath} controls preload="metadata" />
      </figure>
    );
  }

  return (
    <a
      className="grid min-h-24 w-44 content-center rounded-xl border border-border bg-[#05070d] p-3 text-sm text-slate-300 hover:border-accent"
      href={asset.accessPath}
    >
      <span className="truncate">{label}</span>
      <span className="mt-1 text-xs text-muted">{asset.mimeType}</span>
    </a>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterLink({
  label,
  active,
  params,
}: {
  label: string;
  active: boolean;
  params: Record<string, string | undefined>;
}) {
  const query = Object.fromEntries(Object.entries(params).filter(([, value]) => value));
  return (
    <Link
      href={{ pathname: "/compare", query }}
      className={`chip ${active ? "border-accent bg-accent text-[#06101d]" : "bg-[#0e1420] hover:border-accent"}`}
    >
      {label}
    </Link>
  );
}

function splitParam(value?: string) {
  return value ? value.split(",").filter(Boolean) : [];
}

function toggle(values: string[], value: string) {
  const next = values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
  return next.length ? next.join(",") : undefined;
}
