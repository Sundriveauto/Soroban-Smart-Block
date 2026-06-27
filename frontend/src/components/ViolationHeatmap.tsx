/**
 * Hour-of-day × day-of-week heat map of rate limit violations.
 */
interface HeatmapCell {
  hour: number;
  day_of_week: number;
  violations: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ViolationHeatmap({ data }: { data: HeatmapCell[] }) {
  if (!data.length) {
    return <p style={{ color: "#9ca3af", fontSize: 13 }}>No violation data available.</p>;
  }

  // Build a lookup map: [day][hour] → violations
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  let maxVal = 1;
  for (const cell of data) {
    const v = Number(cell.violations);
    grid[cell.day_of_week][cell.hour] = v;
    if (v > maxVal) maxVal = v;
  }

  const cellSize = 18;
  const labelW = 32;
  const headerH = 20;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        width={labelW + 24 * cellSize}
        height={headerH + 7 * cellSize}
        aria-label="Rate limit violation heatmap by hour and day of week"
      >
        {/* Hour labels */}
        {Array.from({ length: 24 }, (_, h) => (
          <text
            key={h}
            x={labelW + h * cellSize + cellSize / 2}
            y={headerH - 4}
            textAnchor="middle"
            fontSize={9}
            fill="#9ca3af"
          >
            {h % 6 === 0 ? h : ""}
          </text>
        ))}

        {/* Day labels + cells */}
        {Array.from({ length: 7 }, (_, day) => (
          <g key={day}>
            <text
              x={labelW - 4}
              y={headerH + day * cellSize + cellSize / 2 + 4}
              textAnchor="end"
              fontSize={10}
              fill="#6b7280"
            >
              {DAY_LABELS[day]}
            </text>
            {Array.from({ length: 24 }, (_, hour) => {
              const v = grid[day][hour];
              const intensity = v / maxVal;
              const r = Math.round(220 + (220 - 220) * intensity);
              const g = Math.round(220 - 160 * intensity);
              const b = Math.round(220 - 200 * intensity);
              const fill = v === 0 ? "#f3f4f6" : `rgb(${r},${g},${b})`;
              return (
                <rect
                  key={hour}
                  x={labelW + hour * cellSize + 1}
                  y={headerH + day * cellSize + 1}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  fill={fill}
                  rx={2}
                >
                  <title>
                    {DAY_LABELS[day]} {hour}:00 — {v} violations
                  </title>
                </rect>
              );
            })}
          </g>
        ))}
      </svg>
      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
        Darker = more violations · Last 30 days
      </div>
    </div>
  );
}
