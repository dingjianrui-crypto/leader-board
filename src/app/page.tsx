import Link from "next/link";
import { getGsbMatrix } from "@/lib/repositories/leaderboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const matrix = await getGsbMatrix();

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">GSB</p>
          <h1 className="m-0 text-3xl font-semibold tracking-normal">Model GSB by category</h1>
        </div>
        <Link href="/admin" className="btn btn-primary">
          Manage outputs
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryMetric label="Models" value={matrix.models.length} />
        <SummaryMetric label="Categories" value={matrix.categories.length} />
        <SummaryMetric
          label="Rated cells"
          value={matrix.models.reduce(
            (total, model) =>
              total + matrix.categories.filter((category) => model.cells[category.id].total > 0).length,
            0,
          )}
        />
      </section>

      <div className="table-panel">
        <table className="min-w-[920px] w-full border-collapse text-left text-sm">
          <thead className="bg-panel-warm text-xs uppercase tracking-[0.14em] text-muted">
            <tr>
              <th className="sticky left-0 z-10 bg-panel-warm p-4">Model</th>
              {matrix.categories.map((category) => (
                <th key={category.id} className="p-4">
                  {category.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.models.length ? (
              matrix.models.map((model) => (
                <tr key={model.id} className="border-t border-border-soft">
                  <td className="sticky left-0 z-10 bg-panel p-4">
                    <p className="m-0 font-semibold">{model.providerName}</p>
                    <p className="m-0 text-xs text-muted">
                      {model.name} / {model.version}
                    </p>
                  </td>
                  {matrix.categories.map((category) => (
                    <td key={category.id} className="p-4">
                      <GsbCell cell={model.cells[category.id]} />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr className="border-t border-border-soft">
                <td className="p-4 text-slate-300" colSpan={matrix.categories.length + 1}>
                  Add providers and models to start calculating GSB values.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RadarChart matrix={matrix} />
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel">
      <p className="m-0 text-sm text-muted">{label}</p>
      <strong className="mt-2 block font-mono text-3xl text-slate-50">{value}</strong>
    </div>
  );
}

function GsbCell({
  cell,
}: {
  cell: {
    good: number;
    bad: number;
    total: number;
    value: number | null;
  };
}) {
  if (cell.value == null) {
    return <span className="text-muted">-</span>;
  }

  return (
    <div className="grid gap-1">
      <strong className={`font-mono text-base ${cell.value >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
        {formatGsb(cell.value)}
      </strong>
      <span className="text-xs text-muted">
        {cell.good} good / {cell.bad} bad / {cell.total} total
      </span>
    </div>
  );
}

function formatGsb(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function RadarChart({
  matrix,
}: {
  matrix: Awaited<ReturnType<typeof getGsbMatrix>>;
}) {
  const categories = matrix.categories;
  const models = matrix.models.filter((model) =>
    categories.some((category) => model.cells[category.id].value != null),
  );

  if (categories.length < 3 || models.length === 0) {
    return (
      <section className="panel">
        <h2 className="m-0 text-xl font-semibold">GSB radar</h2>
        <p className="m-0 mt-3 text-sm text-slate-300">
          Add at least three categories with rated model outputs to draw the radar chart.
        </p>
      </section>
    );
  }

  const size = 620;
  const center = size / 2;
  const radius = 220;
  const rings = [-1, -0.5, 0, 0.5, 1];
  const colors = [
    "#22d3ee",
    "#34d399",
    "#f59e0b",
    "#f472b6",
    "#a78bfa",
    "#fb7185",
    "#60a5fa",
    "#facc15",
  ];

  return (
    <section className="panel grid gap-6">
      <div>
        <h2 className="m-0 text-xl font-semibold">GSB radar</h2>
        <p className="m-0 mt-2 text-sm text-slate-300">
          Indicators are categories. Each model line plots its category GSB value.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,680px)_minmax(220px,1fr)]">
        <div className="overflow-x-auto">
          <svg
            className="block max-w-full"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label="Radar chart comparing model GSB values by category"
          >
            {rings.map((ring) => (
              <polygon
                key={ring}
                points={categories
                  .map((_, index) => {
                    const point = radarPoint(index, categories.length, valueRadius(ring, radius), center);
                    return `${point.x},${point.y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke={ring === 0 ? "rgba(34,211,238,0.5)" : "rgba(148,163,184,0.18)"}
                strokeWidth={ring === 0 ? 1.5 : 1}
              />
            ))}

            {categories.map((category, index) => {
              const end = radarPoint(index, categories.length, radius, center);
              const label = radarPoint(index, categories.length, radius + 38, center);
              return (
                <g key={category.id}>
                  <line
                    x1={center}
                    y1={center}
                    x2={end.x}
                    y2={end.y}
                    stroke="rgba(148,163,184,0.22)"
                    strokeWidth="1"
                  />
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor={label.x > center + 8 ? "start" : label.x < center - 8 ? "end" : "middle"}
                    dominantBaseline="middle"
                    fill="#cbd5e1"
                    fontSize="12"
                  >
                    {category.name}
                  </text>
                </g>
              );
            })}

            {models.map((model, modelIndex) => {
              const color = colors[modelIndex % colors.length];
              const points = categories
                .map((category, index) => {
                  const value = model.cells[category.id].value ?? -1;
                  const point = radarPoint(index, categories.length, valueRadius(value, radius), center);
                  return `${point.x},${point.y}`;
                })
                .join(" ");

              return (
                <g key={model.id}>
                  <polygon points={points} fill={color} fillOpacity="0.08" stroke={color} strokeWidth="2" />
                  {categories.map((category, index) => {
                    const value = model.cells[category.id].value ?? -1;
                    const point = radarPoint(index, categories.length, valueRadius(value, radius), center);
                    return <circle key={category.id} cx={point.x} cy={point.y} r="3" fill={color} />;
                  })}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="grid content-start gap-3">
          <p className="m-0 text-sm font-semibold text-slate-300">Models</p>
          <div className="grid gap-2">
            {models.map((model, index) => (
              <div key={model.id} className="flex items-center gap-3 text-sm">
                <span
                  className="h-1.5 w-8 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span>
                  {model.providerName} / {model.name} / {model.version}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-1 border-t border-border-soft pt-3 text-xs text-muted">
            <span>Outer ring: 100%</span>
            <span>Middle ring: 0%</span>
            <span>Center: -100%</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function valueRadius(value: number, radius: number) {
  return ((Math.max(-1, Math.min(1, value)) + 1) / 2) * radius;
}

function radarPoint(index: number, total: number, radius: number, center: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}
