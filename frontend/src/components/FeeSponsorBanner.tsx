import type { FeeBumpInfo } from "../api";

interface Props {
  feeBump: FeeBumpInfo;
}

export default function FeeSponsorBanner({ feeBump }: Props) {
  return (
    <div
      className="card"
      style={{
        marginTop: 12,
        borderLeft: "3px solid var(--accent)",
        background: "var(--surface, #1a1a2e)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--accent)",
          }}
        >
          Fee-Bump Sponsored Transaction
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <AccountRow
          role="Paid by Sponsor"
          address={feeBump.sponsor}
          accent="#58a6ff"
        />
        <div style={{ display: "flex", alignItems: "center", paddingLeft: 8 }}>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>on behalf of</span>
        </div>
        <AccountRow
          role="Caller"
          address={feeBump.inner_source}
          accent="var(--text)"
        />
      </div>
    </div>
  );
}

function AccountRow({
  role,
  address,
  accent,
}: {
  role: string;
  address: string;
  accent: string;
}) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px",
        borderRadius: 6,
        background: "var(--bg)",
      }}
    >
      <span
        style={{
          minWidth: 130,
          fontSize: 11,
          fontWeight: 600,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {role}
      </span>
      <code
        style={{
          fontSize: 13,
          fontFamily: "monospace",
          color: accent,
          wordBreak: "break-all",
        }}
        title={address}
      >
        {short}
      </code>
      <span
        style={{
          fontSize: 11,
          color: "var(--muted)",
          fontFamily: "monospace",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
        }}
        title={address}
      >
        {address}
      </span>
    </div>
  );
}
