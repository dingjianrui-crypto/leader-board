import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  createCategoryAction,
  createModelOutputAction,
  createTestCaseAction,
  deleteCategoryAction,
  deleteModelOutputAction,
  deleteTestCaseAction,
  updateModelOutputAction,
  updateTestCaseAction,
} from "@/app/actions";
import {
  listCategories,
  listModelOutputs,
  listProvidersWithModels,
  listTestCases,
} from "@/lib/repositories/leaderboard";
import { Link } from "@/i18n/routing";

type SearchParams = Promise<{
  editCase?: string;
  editOutput?: string;
}>;

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const [categories, providers, testCases, outputs, t, tCommon] = await Promise.all([
    listCategories(),
    listProvidersWithModels(),
    listTestCases(),
    listModelOutputs(),
    getTranslations("admin"),
    getTranslations("common"),
  ]);

  const models = providers.flatMap((provider) =>
    provider.models.map((model) => ({
      ...model,
      providerName: provider.name,
    })),
  );
  const editingTestCase = testCases.find((testCase) => testCase.id === query.editCase);
  const editingOutput = outputs.find((output) => output.id === query.editOutput);

  return (
    <div className="grid gap-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t("eyebrow")}</p>
        <h1 className="m-0 text-3xl font-semibold">{t("title")}</h1>
        <p className="max-w-4xl text-slate-300">
          {t("description")}
        </p>
      </header>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form action={createCategoryAction} className="panel grid content-start gap-4">
          <input type="hidden" name="locale" value={locale} />
          <h2 className="text-xl font-semibold">{t("manageCategories")}</h2>
          <label className="field">
            {t("categoryName")}
            <input className="input" name="name" placeholder={t("categoryPlaceholder")} required />
          </label>
          <label className="field">
            {t("categoryDescription")}
            <textarea className="input min-h-28" name="description" required />
          </label>
          <button className="btn btn-primary" type="submit">
            {t("saveCategory")}
          </button>
        </form>

        <div className="table-panel">
          <table className="min-w-[760px] w-full border-collapse text-left text-sm">
            <thead className="bg-panel-warm text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="p-4">{t("category")}</th>
                <th className="p-4">{t("descriptionColumn")}</th>
                <th className="p-4">{t("testCase")}</th>
                <th className="p-4">{t("good")}</th>
                <th className="p-4">{t("bad")}</th>
                <th className="p-4">{tCommon("action")}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-t border-border-soft">
                  <td className="p-4 font-semibold">{category.name}</td>
                  <td className="p-4 text-slate-300">{category.description}</td>
                  <td className="p-4">{category.testCaseCount}</td>
                  <td className="p-4 text-emerald-300">{category.goodOutputCount ?? 0}</td>
                  <td className="p-4 text-rose-300">{category.badOutputCount ?? 0}</td>
                  <td className="p-4">
                    {category.testCaseCount === 0 ? (
                      <form action={deleteCategoryAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="categoryId" value={category.id} />
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
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form
          id="test-case-form"
          key={editingTestCase?.id ?? "new-test-case"}
          action={editingTestCase ? updateTestCaseAction : createTestCaseAction}
          className="panel grid content-start gap-4"
        >
          <input type="hidden" name="locale" value={locale} />
          {editingTestCase ? <input type="hidden" name="testCaseId" value={editingTestCase.id} /> : null}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{editingTestCase ? t("editTestCase") : t("createTestCase")}</h2>
            {editingTestCase ? (
              <Link href="/admin" className="btn">
                {tCommon("cancel")}
              </Link>
            ) : null}
          </div>
          <label className="field">
            {t("testCaseTitle")}
            <input
              className="input"
              name="title"
              placeholder={t("testCasePlaceholder")}
              defaultValue={editingTestCase?.title}
              required
            />
          </label>
          <label className="field">
            {t("category")}
            <select className="input" name="categoryId" defaultValue={editingTestCase?.categoryId ?? ""} required>
              <option value="">{t("selectCategory")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("textPrompt")}
            <textarea className="input min-h-28" name="prompt" defaultValue={editingTestCase?.prompt} required />
          </label>
          <label className="field">
            {t("description")}
            <textarea className="input min-h-24" name="description" defaultValue={editingTestCase?.description} required />
          </label>
          <label className="field">
            {editingTestCase ? t("addReferenceAssets") : t("referenceAssets")}
            <input className="input" name="assets" type="file" multiple />
          </label>
          <p className="text-xs text-muted">
            {editingTestCase
              ? t("existingAssetsHelp", { count: editingTestCase.assets.length })
              : t("referenceAssetsHelp")}
          </p>
          <button className="btn btn-primary" type="submit">
            {editingTestCase ? tCommon("saveChanges") : t("createTestCase")}
          </button>
        </form>

        <div className="table-panel">
          <table className="min-w-[920px] w-full border-collapse text-left text-sm">
            <thead className="bg-panel-warm text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="p-4">{t("testCase")}</th>
                <th className="p-4">{t("category")}</th>
                <th className="p-4">{t("referenceAssets")}</th>
                <th className="p-4">{t("outputs")}</th>
                <th className="p-4">{t("status")}</th>
                <th className="p-4">{tCommon("action")}</th>
              </tr>
            </thead>
            <tbody>
              {testCases.map((testCase) => (
                <tr key={testCase.id} className="border-t border-border-soft">
                  <td className="p-4 font-semibold">{testCase.title}</td>
                  <td className="p-4">{testCase.category.name}</td>
                  <td className="p-4">{t("filesCount", { count: testCase.assets.length })}</td>
                  <td className="p-4">{t("uploadedCount", { count: testCase.outputs.length })}</td>
                  <td className="p-4">
                    <span className={`status-pill ${testCase.outputs.length ? "text-emerald-300" : "text-amber-300"}`}>
                      {testCase.outputs.length ? t("ready") : t("needsOutputs")}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin?editCase=${testCase.id}#test-case-form`} className="btn">
                        {tCommon("edit")}
                      </Link>
                      <form action={deleteTestCaseAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="testCaseId" value={testCase.id} />
                        <button className="btn border-rose-400/40 text-rose-200 hover:bg-rose-500/10" type="submit">
                          {tCommon("delete")}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form
          id="model-output-form"
          key={editingOutput?.id ?? "new-model-output"}
          action={editingOutput ? updateModelOutputAction : createModelOutputAction}
          className="panel grid content-start gap-4"
        >
          <input type="hidden" name="locale" value={locale} />
          {editingOutput ? <input type="hidden" name="outputId" value={editingOutput.id} /> : null}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{editingOutput ? t("editModelOutput") : t("uploadModelOutput")}</h2>
            {editingOutput ? (
              <Link href="/admin" className="btn">
                {tCommon("cancel")}
              </Link>
            ) : null}
          </div>
          <label className="field">
            {t("testCase")}
            <select className="input" name="testCaseId" defaultValue={editingOutput?.testCaseId ?? ""} required>
              <option value="">{t("selectTestCase")}</option>
              {testCases.map((testCase) => (
                <option key={testCase.id} value={testCase.id}>
                  {testCase.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {tCommon("model")}
            <select className="input" name="modelId" defaultValue={editingOutput?.modelId ?? ""} required>
              <option value="">{t("selectModel")}</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.providerName} / {model.name} / {model.version}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {editingOutput ? t("replaceOutputVideo") : t("outputVideo")}
            <input
              className="input"
              name="video"
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              required={!editingOutput}
            />
          </label>
          {editingOutput ? (
            <p className="text-xs text-muted">{t("currentFile", { filename: editingOutput.videoFilename })}</p>
          ) : null}
          <label className="field">
            {tCommon("gsb")}
            <select className="input" name="gsbValue" defaultValue={editingOutput?.gsbValue ?? "normal"} required>
              <option value="best">best</option>
              <option value="samebest">samebest</option>
              <option value="normal">normal</option>
              <option value="samenormal">samenormal</option>
              <option value="worst">worst</option>
              <option value="sameworst">sameworst</option>
            </select>
          </label>
          <label className="field">
            {tCommon("comments")}
            <textarea
              className="input min-h-24"
              name="userComments"
              maxLength={1000}
              placeholder={t("commentsPlaceholder")}
              defaultValue={editingOutput?.userComments}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            {editingOutput ? tCommon("saveChanges") : t("uploadOutput")}
          </button>
        </form>

        <div className="table-panel">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="bg-panel-warm text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="p-4">{t("output")}</th>
                <th className="p-4">{t("testCase")}</th>
                <th className="p-4">{tCommon("model")}</th>
                <th className="p-4">{tCommon("gsb")}</th>
                <th className="p-4">{tCommon("comments")}</th>
                <th className="p-4">{tCommon("action")}</th>
              </tr>
            </thead>
            <tbody>
              {outputs.map((output) => (
                <tr key={output.id} className="border-t border-border-soft">
                  <td className="p-4 font-semibold">{output.videoFilename}</td>
                  <td className="p-4">{output.testCase.title}</td>
                  <td className="p-4">
                    {output.model.provider.name} / {output.model.name}
                  </td>
                  <td className="p-4">{output.gsbValue}</td>
                  <td className="max-w-72 p-4 text-slate-300">
                    <span className="line-clamp-2">{output.userComments || "-"}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin?editOutput=${output.id}#model-output-form`} className="btn">
                        {tCommon("edit")}
                      </Link>
                      <form action={deleteModelOutputAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="outputId" value={output.id} />
                        <button className="btn border-rose-400/40 text-rose-200 hover:bg-rose-500/10" type="submit">
                          {tCommon("delete")}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
