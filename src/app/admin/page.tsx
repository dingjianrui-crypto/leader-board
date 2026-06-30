import Link from "next/link";
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

type SearchParams = Promise<{
  editCase?: string;
  editOutput?: string;
}>;

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [categories, providers, testCases, outputs] = await Promise.all([
    listCategories(),
    listProvidersWithModels(),
    listTestCases(),
    listModelOutputs(),
  ]);

  const models = providers.flatMap((provider) =>
    provider.models.map((model) => ({
      ...model,
      providerName: provider.name,
    })),
  );
  const editingTestCase = testCases.find((testCase) => testCase.id === params.editCase);
  const editingOutput = outputs.find((output) => output.id === params.editOutput);

  return (
    <div className="grid gap-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Admin workspace</p>
        <h1 className="m-0 text-3xl font-semibold">Manage benchmark data and offline outputs</h1>
        <p className="max-w-4xl text-slate-300">
          Create categories first, create test cases with prompt inputs, then upload finished model videos with manual scores.
        </p>
      </header>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form action={createCategoryAction} className="panel grid content-start gap-4">
          <h2 className="text-xl font-semibold">Manage categories</h2>
          <label className="field">
            Category name
            <input className="input" name="name" placeholder="Scene transition" required />
          </label>
          <label className="field">
            Category description
            <textarea className="input min-h-28" name="description" required />
          </label>
          <button className="btn btn-primary" type="submit">
            Save category
          </button>
        </form>

        <div className="table-panel">
          <table className="min-w-[760px] w-full border-collapse text-left text-sm">
            <thead className="bg-panel-warm text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="p-4">Category</th>
                <th className="p-4">Description</th>
                <th className="p-4">Test cases</th>
                <th className="p-4">Good</th>
                <th className="p-4">Bad</th>
                <th className="p-4">Action</th>
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
                        <input type="hidden" name="categoryId" value={category.id} />
                        <button className="btn border-rose-400/40 text-rose-200 hover:bg-rose-500/10" type="submit">
                          Delete
                        </button>
                      </form>
                    ) : (
                      <span className="status-pill text-muted">Delete</span>
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
          {editingTestCase ? <input type="hidden" name="testCaseId" value={editingTestCase.id} /> : null}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{editingTestCase ? "Edit test case" : "Create test case"}</h2>
            {editingTestCase ? (
              <Link href="/admin" className="btn">
                Cancel
              </Link>
            ) : null}
          </div>
          <label className="field">
            Test case title
            <input
              className="input"
              name="title"
              placeholder="Studio dolly shot with product reveal"
              defaultValue={editingTestCase?.title}
              required
            />
          </label>
          <label className="field">
            Category
            <select className="input" name="categoryId" defaultValue={editingTestCase?.categoryId ?? ""} required>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Text prompt
            <textarea className="input min-h-28" name="prompt" defaultValue={editingTestCase?.prompt} required />
          </label>
          <label className="field">
            Description
            <textarea className="input min-h-24" name="description" defaultValue={editingTestCase?.description} required />
          </label>
          <label className="field">
            {editingTestCase ? "Add reference assets" : "Reference assets"}
            <input className="input" name="assets" type="file" multiple />
          </label>
          <p className="text-xs text-muted">
            {editingTestCase
              ? `${editingTestCase.assets.length} existing files will be kept. New uploads are appended.`
              : "Images, audio, and videos are supported. Each file must be 50MB or smaller."}
          </p>
          <button className="btn btn-primary" type="submit">
            {editingTestCase ? "Save changes" : "Create test case"}
          </button>
        </form>

        <div className="table-panel">
          <table className="min-w-[920px] w-full border-collapse text-left text-sm">
            <thead className="bg-panel-warm text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="p-4">Test case</th>
                <th className="p-4">Category</th>
                <th className="p-4">Reference assets</th>
                <th className="p-4">Outputs</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {testCases.map((testCase) => (
                <tr key={testCase.id} className="border-t border-border-soft">
                  <td className="p-4 font-semibold">{testCase.title}</td>
                  <td className="p-4">{testCase.category.name}</td>
                  <td className="p-4">{testCase.assets.length} files</td>
                  <td className="p-4">{testCase.outputs.length} uploaded</td>
                  <td className="p-4">
                    <span className={`status-pill ${testCase.outputs.length ? "text-emerald-300" : "text-amber-300"}`}>
                      {testCase.outputs.length ? "ready" : "needs outputs"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin?editCase=${testCase.id}#test-case-form`} className="btn">
                        Edit
                      </Link>
                      <form action={deleteTestCaseAction}>
                        <input type="hidden" name="testCaseId" value={testCase.id} />
                        <button className="btn border-rose-400/40 text-rose-200 hover:bg-rose-500/10" type="submit">
                          Delete
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
          {editingOutput ? <input type="hidden" name="outputId" value={editingOutput.id} /> : null}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{editingOutput ? "Edit model output" : "Upload model output"}</h2>
            {editingOutput ? (
              <Link href="/admin" className="btn">
                Cancel
              </Link>
            ) : null}
          </div>
          <label className="field">
            Test case
            <select className="input" name="testCaseId" defaultValue={editingOutput?.testCaseId ?? ""} required>
              <option value="">Select test case</option>
              {testCases.map((testCase) => (
                <option key={testCase.id} value={testCase.id}>
                  {testCase.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Model
            <select className="input" name="modelId" defaultValue={editingOutput?.modelId ?? ""} required>
              <option value="">Select model</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.providerName} / {model.name} / {model.version}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {editingOutput ? "Replace output video" : "Output video"}
            <input
              className="input"
              name="video"
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              required={!editingOutput}
            />
          </label>
          {editingOutput ? (
            <p className="text-xs text-muted">Current file: {editingOutput.videoFilename}. Leave empty to keep it.</p>
          ) : null}
          <label className="field">
            GSB
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
            Comments
            <textarea
              className="input min-h-24"
              name="userComments"
              maxLength={1000}
              placeholder="Optional notes"
              defaultValue={editingOutput?.userComments}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            {editingOutput ? "Save changes" : "Upload output"}
          </button>
        </form>

        <div className="table-panel">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="bg-panel-warm text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="p-4">Output</th>
                <th className="p-4">Test case</th>
                <th className="p-4">Model</th>
                <th className="p-4">GSB</th>
                <th className="p-4">Comments</th>
                <th className="p-4">Action</th>
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
                        Edit
                      </Link>
                      <form action={deleteModelOutputAction}>
                        <input type="hidden" name="outputId" value={output.id} />
                        <button className="btn border-rose-400/40 text-rose-200 hover:bg-rose-500/10" type="submit">
                          Delete
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
