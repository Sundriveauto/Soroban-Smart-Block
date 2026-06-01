import type { FeeBumpInfo } from "../api";

interface Props {
  feeBump: FeeBumpInfo;
}

// Resolve channel_account from either new or legacy field
function channelAccount(feeBump: FeeBumpInfo): string {
  return feeBump.channel_account ?? feeBump.inner_source ?? "";
}

export default function FeeSponsorBanner({ feeBump }: Props) {
  const channel = channelAccount(feeBump);
  const hasCaller = !!feeBump.actual_caller;

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
          {hasCaller ? "Chain of Custody — Fee-Bump Transaction" : "Fee-Bump Sponsored Transaction"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <TierRow tier="1" label="Sponsor Wallet" sublabel="pays network fee" address={feeBump.sponsor} accent="#58a6ff" />

        <Connector />

        <TierRow tier="2" label="Channel Account" sublabel="provides sequence number" address={channel} accent="var(--text)" />

        {hasCaller && (
          <>
            <Connector />
            <TierRow tier="3" label="Actual Caller" sublabel="signs contract logic" address={feeBump.actual_caller!} accent="#3fb950" />
          </>
        )}
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div style={{ paddingLeft: 24, color: "var(--muted)", fontSize: 11, lineHeight: 1 }}>
      ↓ on behalf of
    </div>
  );
}

function TierRow({
  tier,
  label,
  sublabel,
  address,
  accent,
}: {
  tier: string;
  label: string;
  sublabel: string;
  address: string;
  accent: string;
}) {
  const short = address.length > 10 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px",
        borderRadius: 6,
        background: "var(--bg)",
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: accent,
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {tier}
      </span>
      <div style={{ minWidth: 150 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </div>
        <div style={{ fontSize: 10, color: "var(--muted)", opacity: 0.7 }}>{sublabel}</div>
      </div>
      <code
        style={{ fontSize: 13, fontFamily: "monospace", color: accent, wordBreak: "break-all" }}
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
