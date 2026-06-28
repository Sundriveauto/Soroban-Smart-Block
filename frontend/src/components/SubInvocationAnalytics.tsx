// Issue #210: Analytics dashboard for sub-invocation call data
// Shows: top contracts, depth distribution, reentrancy count, centrality metrics,
// volume by timeframe, unique contracts, avg/max depth.
import { useMemo } from "react";
import type { SubInvocationExtended } from "../api";
import {
  computeTopContracts,
  computeDepthDistribution,
  computeAvgDepth,
  computeMaxDepth,
  detectReentrancy,
  buildDependencyMap,
  clusterContracts,
} from "../utils/subInvocationQuery";

interface Props {
  invocations: SubInvocationExtended[];
}

function short(id: string) {
  return id.length > 20 ? `${id.slice(0, 10)}…${id.slice(-8)}` : id;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        minWidth: 120,
        flex: "1 1 120px",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function BarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{label}</div>
      {data.slice(0, 8).map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              color: "var(--muted)",
              width: 100,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            title={d.label}
          >
            {d.label}
          </div>
          <div
            style={{
              flex: 1,
              background: "var(--surface)",
              borderRadius: 3,
              height: 16,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(d.value / max) * 100}%`,
                height: "100%",
                background: "#6366f1",
                borderRadius: 3,
                transition: "width 0.3s",
              }}
            />
          </div>
          <div style={{ fontSize: 10, color: "var(--muted)", width: 28, textAlign: "right" }}>
            {d.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SubInvocationAnalytics({ invocations }: Props) {
  const topContracts = useMemo(() => computeTopContracts(invocations, 8), [invocations]);
  const depthDist = useMemo(() => computeDepthDistribution(invocations), [invocations]);
  const avgDepth = useMemo(() => computeAvgDepth(invocations), [invocations]);
  const maxDepth = useMemo(() => computeMaxDepth(invocations), [invocations]);
  const reentrant = useMemo(() => detectReentrancy(invocations), [invocations]);
  const depMap = useMemo(() => buildDependencyMap(invocations), [invocations]);
  const clusters = useMemo(() => clusterContracts(invocations), [invocations]);

  const uniqueContracts = useMemo(
    () => new Set(invocations.map((i) => i.contract_id)).size,
    [invocations],
  );

  // Centrality: number of unique contracts that depend on each contract
  const centrality = useMemo(() => {
    const incoming = new Map<string, Set<string>>();
    for (const [caller, callees] of Object.entries(depMap)) {
      for (const callee of callees) {
        if (!incoming.has(callee)) incoming.set(callee, new Set());
        incoming.get(callee)!.add(caller);
      }
    }
    return [...incoming.entries()]
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 5)
      .map(([id, deps]) => ({ id, score: deps.size }));
  }, [depMap]);

  if (!invocations.length) {
    return (
      <p style={{ color: "var(--muted)", padding: 12 }}>
        No data — run a search to populate analytics.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="Total Invocations" value={invocations.length} />
        <StatCard label="Unique Contracts" value={uniqueContracts} />
        <StatCard label="Max Depth" value={maxDepth} />
        <StatCard label="Avg Depth" value={avgDepth.toFixed(1)} />
        <StatCard
          label="Reentrancy Events"
          value={reentrant.length}
          sub={reentrant.length > 0 ? "⚠ detected" : "✓ none"}
        />
        <StatCard label="Contract Clusters" value={clusters.length} />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card">
          <BarChart
            label="Top Contracts by Call Count"
            data={topContracts.map((c) => ({ label: short(c.contract_id), value: c.call_count }))}
          />
        </div>
        <div className="card">
          <BarChart
            label="Depth Distribution"
            data={depthDist.map((d) => ({ label: `depth ${d.depth}`, value: d.count }))}
          />
        </div>
      </div>

      {/* Centrality metrics */}
      {centrality.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            Centrality (most depended-upon contracts)
          </div>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--muted)", fontSize: 11 }}>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Contract</th>
                <th style={{ textAlign: "right", padding: "4px 8px" }}>Dependents</th>
              </tr>
            </thead>
            <tbody>
              {centrality.map((c, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "4px 8px", fontFamily: "monospace", fontSize: 11 }}>
                    {short(c.id)}
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>{c.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Clusters */}
      {clusters.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            Contract Clusters ({clusters.length} groups)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {clusters.slice(0, 5).map((cluster, i) => (
              <div key={i} style={{ fontSize: 11, color: "var(--muted)" }}>
                <strong>Cluster {i + 1}:</strong>{" "}
                {cluster.map((c) => short(c)).join(" → ")}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reentrancy paths */}
      {reentrant.length > 0 && (
        <div
          className="card"
          style={{ border: "1px solid #dc2626", background: "rgba(220,38,38,0.06)" }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", marginBottom: 8 }}>
            ⚠ Reentrancy Detected ({reentrant.length} invocations)
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            {[...new Set(reentrant.map((r) => r.contract_id))].map((id) => (
              <div key={id} style={{ fontFamily: "monospace" }}>
                {id}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
