// Issue #210: Sub-Invocation Search & Analysis page
// Integrates: query search, force-directed graph, flamegraph, analytics, diff, live stream.
import { useState, useCallback } from "react";
import SubInvocationSearch from "../components/SubInvocationSearch";
import SubInvocationGraph from "../components/SubInvocationGraph";
import SubInvocationFlamegraph from "../components/SubInvocationFlamegraph";
import SubInvocationAnalytics from "../components/SubInvocationAnalytics";
import SubInvocationDiff from "../components/SubInvocationDiff";
import type { SubInvocationExtended } from "../api";
import { useSubInvocationStream } from "../hooks/useSubInvocationStream";

type Tab = "search" | "graph" | "flamegraph" | "analytics" | "diff";

const TABS: { key: Tab; label: string }[] = [
  { key: "search", label: "Search" },
  { key: "graph", label: "Graph" },
  { key: "flamegraph", label: "Flamegraph" },
  { key: "analytics", label: "Analytics" },
  { key: "diff", label: "Compare" },
];

export default function SubInvocationPage() {
  const [activeTab, setActiveTab] = useState<Tab>("search");
  const [results, setResults] = useState<SubInvocationExtended[]>([]);
  const [liveResults, setLiveResults] = useState<SubInvocationExtended[]>([]);
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [streamError, setStreamError] = useState(false);

  const handleLiveInvocation = useCallback((inv: SubInvocationExtended) => {
    setLiveResults((prev) => [inv, ...prev].slice(0, 200));
  }, []);

  const { connected } = useSubInvocationStream({
    onInvocation: handleLiveInvocation,
    onError: () => setStreamError(true),
    enabled: liveEnabled,
    mode: "sse",
  });

  const displayResults = liveEnabled && liveResults.length > 0 ? liveResults : results;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Sub-Invocation Explorer</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>
            Search, visualize, and analyze cross-contract call chains
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            title={connected ? "SSE connected" : streamError ? "SSE error" : "SSE disconnected"}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: streamError ? "#ef4444" : connected ? "#22c55e" : "#f59e0b",
              display: "inline-block",
            }}
          />
          <button
            onClick={() => {
              setLiveEnabled((v) => !v);
              setStreamError(false);
              if (liveEnabled) setLiveResults([]);
            }}
            style={{
              padding: "6px 14px",
              background: liveEnabled ? "rgba(34,197,94,0.12)" : "var(--surface)",
              border: `1px solid ${liveEnabled ? "#22c55e" : "var(--border)"}`,
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
              color: liveEnabled ? "#22c55e" : "var(--muted)",
            }}
          >
            {liveEnabled ? (connected ? "⬤ Live" : "○ Connecting…") : "Enable Live Stream"}
          </button>
          {streamError && (
            <span style={{ fontSize: 11, color: "#ef4444" }}>Stream error</span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "8px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              color: activeTab === t.key ? "var(--accent)" : "var(--muted)",
              borderBottom: activeTab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
            }}
            aria-selected={activeTab === t.key}
          >
            {t.label}
          </button>
        ))}
        {displayResults.length > 0 && (
          <span
            style={{
              marginLeft: "auto",
              alignSelf: "center",
              fontSize: 11,
              color: "var(--muted)",
              padding: "0 8px",
            }}
          >
            {displayResults.length} results{liveEnabled ? " (live)" : ""}
          </span>
        )}
      </div>

      {/* Tab content */}
      {activeTab === "search" && (
        <SubInvocationSearch onResultsChange={setResults} />
      )}

      {activeTab === "graph" && (
        <SubInvocationGraph invocations={displayResults} />
      )}

      {activeTab === "flamegraph" && (
        <SubInvocationFlamegraph invocations={displayResults} />
      )}

      {activeTab === "analytics" && (
        <SubInvocationAnalytics invocations={displayResults} />
      )}

      {activeTab === "diff" && <SubInvocationDiff />}
    </div>
  );
}
