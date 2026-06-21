import {
  createCategoryAction,
  deleteCategoryAction,
  deleteModelOutputAction,
  deleteTestCaseAction,
} from "@/app/actions";
import {
  listCategories,
  listModelOutputs,
  listProvidersWithModels,
  listTestCases,
} from "@/lib/repositories/leaderboard";
import { formatScore } from "@/lib/scoring";

export default async function AdminPage() {
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
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-panel-warm text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="p-4">Category</th>
                <th className="p-4">Description</th>
                <th className="p-4">Test cases</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-t border-border-soft">
                  <td className="p-4 font-semibold">{category.name}</td>
                  <td className="p-4 text-slate-300">{category.description}</td>
                  <td className="p-4">{category.testCaseCount}</td>
                  <td className="p-4">
                    {category.testCaseCount === 0 ? (
                      <form action={deleteCategoryAction}>
                        <input type="hidden" name="categoryId" value={category.id} />
                        <button className="btn border-rose-400/40 text-rose-200 hover:bg-rose-500/10" type="submit">
                          Delete category
                        </button>
                      </form>
                    ) : (
                      <span className="status-pill text-muted">Contains test cases</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form action="/api/test-cases" method="post" encType="multipart/form-data" className="panel grid content-start gap-4">
          <h2 className="text-xl font-semibold">Create test case</h2>
          <label className="field">
            Test case title
            <input className="input" name="title" placeholder="Studio dolly shot with product reveal" required />
          </label>
          <label className="field">
            Category
            <select className="input" name="categoryId" required>
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
            <textarea className="input min-h-28" name="prompt" required />
          </label>
          <label className="field">
            Description
            <textarea className="input min-h-24" name="description" required />
          </label>
          <label className="field">
            Reference assets
            <input className="input" name="assets" type="file" multiple />
          </label>
          <p className="text-xs text-muted">Images, audio, and videos are supported. Each file must be 50MB or smaller.</p>
          <button className="btn btn-primary" type="submit">
            Create test case
          </button>
        </form>

        <div className="table-panel">
          <table className="w-full border-collapse text-left text-sm">
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
                    <form action={deleteTestCaseAction}>
                      <input type="hidden" name="testCaseId" value={testCase.id} />
                      <button className="btn border-rose-400/40 text-rose-200 hover:bg-rose-500/10" type="submit">
                        Delete test case
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form action="/api/model-outputs" method="post" encType="multipart/form-data" className="panel grid content-start gap-4">
          <h2 className="text-xl font-semibold">Upload model output</h2>
          <label className="field">
            Test case
            <select className="input" name="testCaseId" required>
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
            <select className="input" name="modelId" required>
              <option value="">Select model</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.providerName} / {model.name} / {model.version}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Output video
            <input className="input" name="video" type="file" accept="video/mp4,video/quicktime,video/webm" required />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <ScoreInput name="scorePromptMatch" label="Prompt match" defaultValue="9.0" />
            <ScoreInput name="scoreReference" label="Reference" defaultValue="8.5" />
            <ScoreInput name="scoreMotion" label="Motion" defaultValue="8.5" />
            <ScoreInput name="scoreAudioSync" label="Audio sync" defaultValue="8.0" />
          </div>
          <button className="btn btn-primary" type="submit">
            Upload output
          </button>
        </form>

        <div className="table-panel">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-panel-warm text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="p-4">Output</th>
                <th className="p-4">Test case</th>
                <th className="p-4">Model</th>
                <th className="p-4">Overall</th>
                <th className="p-4">Prompt</th>
                <th className="p-4">Reference</th>
                <th className="p-4">Motion</th>
                <th className="p-4">Audio</th>
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
                  <td className="p-4 font-semibold text-accent">{formatScore(output.scoreOverall)}</td>
                  <td className="p-4">{formatScore(output.scorePromptMatch)}</td>
                  <td className="p-4">{formatScore(output.scoreReference)}</td>
                  <td className="p-4">{formatScore(output.scoreMotion)}</td>
                  <td className="p-4">{formatScore(output.scoreAudioSync)}</td>
                  <td className="p-4">
                    <form action={deleteModelOutputAction}>
                      <input type="hidden" name="outputId" value={output.id} />
                      <button className="btn border-rose-400/40 text-rose-200 hover:bg-rose-500/10" type="submit">
                        Delete output
                      </button>
                    </form>
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

function ScoreInput({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="field">
      {label}
      <input className="input" name={name} type="number" min="0" max="10" step="0.1" defaultValue={defaultValue} required />
    </label>
  );
}
