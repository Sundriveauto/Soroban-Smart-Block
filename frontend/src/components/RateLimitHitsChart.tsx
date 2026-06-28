/**
 * Real-time line chart of rate limit hits per minute.
 */
interface HitDataPoint {
  minute: string;
  hits: number;
}

export default function RateLimitHitsChart({ data }: { data: HitDataPoint[] }) {
  if (!data.length) {
    return <p style={{ color: "#9ca3af", fontSize: 13 }}>No rate limit hits in the selected window.</p>;
  }

  const maxHits = Math.max(...data.map((d) => Number(d.hits)), 1);
  const w = 600;
  const h = 80;
  const pts = data
    .map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * w;
      const y = h - (Number(d.hits) / maxHits) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: "block", overflow: "visible" }}
        aria-label="Rate limit hits per minute chart"
      >
        <polyline points={pts} fill="none" stroke="#dc2626" strokeWidth={2} />
        {data.map((d, i) => {
          const x = (i / (data.length - 1 || 1)) * w;
          const y = h - (Number(d.hits) / maxHits) * h;
          return (
            <circle key={i} cx={x} cy={y} r={3} fill="#dc2626">
              <title>
                {new Date(d.minute).toLocaleTimeString()}: {d.hits} hits
              </title>
            </circle>
          );
        })}
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#9ca3af",
          marginTop: 4,
        }}
      >
        <span>{data[0] ? new Date(data[0].minute).toLocaleTimeString() : ""}</span>
        <span>Peak: {maxHits} hits/min</span>
        <span>{data[data.length - 1] ? new Date(data[data.length - 1].minute).toLocaleTimeString() : ""}</span>
      </div>
    </div>
  );
}
