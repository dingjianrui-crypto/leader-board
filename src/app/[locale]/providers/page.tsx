import {
  createModelAction,
  createProviderAction,
  deleteModelAction,
  deleteProviderAction,
} from "@/app/actions";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listProvidersWithModels } from "@/lib/repositories/leaderboard";

export default async function ProvidersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [providers, t, tCommon] = await Promise.all([
    listProvidersWithModels(),
    getTranslations("providers"),
    getTranslations("common"),
  ]);

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p>
        <h1 className="m-0 text-3xl font-semibold">{t("title")}</h1>
        <p className="max-w-3xl text-slate-300">
          {t("description")}
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <form action={createProviderAction} className="panel grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <h2 className="text-xl font-semibold">{t("createProvider")}</h2>
            <label className="field">
              {t("providerName")}
              <input className="input" name="name" placeholder={t("providerPlaceholder")} required />
            </label>
            <button className="btn btn-primary" type="submit">
              {t("saveProvider")}
            </button>
          </form>

          <form action={createModelAction} className="panel grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <h2 className="text-xl font-semibold">{t("createModel")}</h2>
            <label className="field">
              {tCommon("provider")}
              <select className="input" name="providerId" required>
                <option value="">{t("selectProvider")}</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              {t("modelName")}
              <input className="input" name="name" placeholder={t("modelPlaceholder")} required />
            </label>
            <label className="field">
              {tCommon("version")}
              <input className="input" name="version" placeholder={t("versionPlaceholder")} required />
            </label>
            <button className="btn btn-primary" type="submit">
              {t("saveModel")}
            </button>
          </form>
        </div>

        <div className="grid content-start gap-6">
          <section className="table-panel">
            <table className="min-w-[620px] w-full border-collapse text-left text-sm">
              <thead className="bg-panel-warm text-xs uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="p-4">{tCommon("provider")}</th>
                  <th className="p-4">{t("models")}</th>
                  <th className="p-4">{tCommon("action")}</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider) => (
                  <tr key={provider.id} className="border-t border-border-soft">
                    <td className="p-4 font-semibold">{provider.name}</td>
                    <td className="p-4">{provider.models.length}</td>
                    <td className="p-4">
                      {provider.models.length === 0 ? (
                        <form action={deleteProviderAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="providerId" value={provider.id} />
                          <button className="btn border-rose-400/40 text-rose-200 hover:bg-rose-500/10" type="submit">
                            {tCommon("delete")}
                          </button>
                        </form>
                      ) : (
                        <span className="status-pill text-muted">{tCommon("delete")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="table-panel">
            <table className="min-w-[860px] w-full border-collapse text-left text-sm">
              <thead className="bg-panel-warm text-xs uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="p-4">{tCommon("provider")}</th>
                  <th className="p-4">{tCommon("model")}</th>
                  <th className="p-4">{tCommon("version")}</th>
                  <th className="p-4">{t("uploadedOutputs")}</th>
                  <th className="p-4">{tCommon("action")}</th>
                </tr>
              </thead>
              <tbody>
                {providers.flatMap((provider) =>
                  provider.models.map((model) => (
                    <tr key={model.id} className="border-t border-border-soft">
                      <td className="p-4 font-semibold">{provider.name}</td>
                      <td className="p-4">{model.name}</td>
                      <td className="p-4">{model.version}</td>
                      <td className="p-4">{model.outputs?.length ?? 0}</td>
                      <td className="p-4">
                        {(model.outputs?.length ?? 0) === 0 ? (
                          <form action={deleteModelAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="modelId" value={model.id} />
                            <button className="btn border-rose-400/40 text-rose-200 hover:bg-rose-500/10" type="submit">
                              {tCommon("delete")}
                            </button>
                          </form>
                        ) : (
                          <span className="status-pill text-muted">{tCommon("delete")}</span>
                        )}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </section>
        </div>
      </section>
    </div>
  );
}
