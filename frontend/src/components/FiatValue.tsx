import { useEffect, useState } from "react";
import { fiatLabel } from "../utils/exchangeRate";

interface Props {
  amount: number;
  symbol: string;
}

/**
 * Renders an adaptive subtitle showing the approximate USD value of a token
 * amount, e.g. "~$50.02 USD". Renders nothing while loading or if the rate
 * is unavailable.
 */
export default function FiatValue({ amount, symbol }: Props) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fiatLabel(amount, symbol).then(l => { if (!cancelled) setLabel(l); });
    return () => { cancelled = true; };
  }, [amount, symbol]);

  if (!label) return null;

  return (
    <span style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 2 }}>
      {label}
    </span>
  );
}
