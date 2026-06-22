import {
  createModelAction,
  createProviderAction,
  deleteModelAction,
  deleteProviderAction,
} from "@/app/actions";
import { listProvidersWithModels } from "@/lib/repositories/leaderboard";

export default async function ProvidersPage() {
  const providers = await listProvidersWithModels();

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Provider registry</p>
        <h1 className="m-0 text-3xl font-semibold">Manage providers and models</h1>
        <p className="max-w-3xl text-slate-300">
          Saved model records are available immediately for Admin uploads and Compare filters.
          Models can be deleted only before outputs are uploaded. Providers can be deleted only after all models are removed.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <form action={createProviderAction} className="panel grid gap-4">
            <h2 className="text-xl font-semibold">Create provider</h2>
            <label className="field">
              Provider name
              <input className="input" name="name" placeholder="Provider E" required />
            </label>
            <button className="btn btn-primary" type="submit">
              Save provider
            </button>
          </form>

          <form action={createModelAction} className="panel grid gap-4">
            <h2 className="text-xl font-semibold">Create model</h2>
            <label className="field">
              Provider
              <select className="input" name="providerId" required>
                <option value="">Select provider</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Model name
              <input className="input" name="name" placeholder="Model E-1" required />
            </label>
            <label className="field">
              Version
              <input className="input" name="version" placeholder="2026.06" required />
            </label>
            <button className="btn btn-primary" type="submit">
              Save model record
            </button>
          </form>
        </div>

        <div className="grid content-start gap-6">
          <section className="table-panel">
            <table className="min-w-[620px] w-full border-collapse text-left text-sm">
              <thead className="bg-panel-warm text-xs uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="p-4">Provider</th>
                  <th className="p-4">Models</th>
                  <th className="p-4">Action</th>
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
                          <input type="hidden" name="providerId" value={provider.id} />
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
          </section>

          <section className="table-panel">
            <table className="min-w-[860px] w-full border-collapse text-left text-sm">
              <thead className="bg-panel-warm text-xs uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="p-4">Provider</th>
                  <th className="p-4">Model</th>
                  <th className="p-4">Version</th>
                  <th className="p-4">Uploaded outputs</th>
                  <th className="p-4">Action</th>
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
                            <input type="hidden" name="modelId" value={model.id} />
                            <button className="btn border-rose-400/40 text-rose-200 hover:bg-rose-500/10" type="submit">
                              Delete
                            </button>
                          </form>
                        ) : (
                          <span className="status-pill text-muted">Delete</span>
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
