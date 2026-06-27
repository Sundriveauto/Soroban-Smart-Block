/**
 * List of API keys whose 7-day average request rate exceeds 80% of their tier limit.
 */
interface Recommendation {
  id: string;
  name: string;
  tier: string;
  avg_daily_requests: number;
  daily_tier_limit: number;
}

const NEXT_TIER: Record<string, string> = {
  unauthenticated: "free",
  free: "pro",
  pro: "enterprise",
};

export default function UpgradeRecommendations({ data }: { data: Recommendation[] }) {
  if (!data.length) {
    return (
      <p style={{ color: "#9ca3af", fontSize: 13 }}>
        No keys are approaching their tier limit.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {data.map((rec) => {
        const pct = rec.daily_tier_limit
          ? Math.round((Number(rec.avg_daily_requests) / Number(rec.daily_tier_limit)) * 100)
          : 0;
        const next = NEXT_TIER[rec.tier] ?? "custom";

        return (
          <div
            key={rec.id}
            style={{
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: "12px 16px",
              background: "#fffbeb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{rec.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                Tier: <strong>{rec.tier}</strong> · Avg {Number(rec.avg_daily_requests).toLocaleString()} req/day ·{" "}
                <span style={{ color: "#d97706" }}>{pct}% of limit</span>
              </div>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#92400e",
                background: "#fde68a",
                padding: "4px 10px",
                borderRadius: 4,
              }}
            >
              Consider upgrading to {next}
            </div>
          </div>
        );
      })}
    </div>
  );
}
