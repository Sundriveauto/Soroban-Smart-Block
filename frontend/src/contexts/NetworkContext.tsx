import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type NetworkKind = "testnet" | "mainnet" | "futurenet" | "custom";

export interface NetworkConfig {
  id: string;
  kind: NetworkKind;
  name: string;
  rpcUrl: string;
  horizonUrl: string;
  passphrase: string;
  /** Custom networks only — removable, persisted to localStorage. */
  custom?: boolean;
}

export const BUILTIN_NETWORKS: NetworkConfig[] = [
  {
    id: "testnet",
    kind: "testnet",
    name: "Testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    horizonUrl: "https://horizon-testnet.stellar.org",
    passphrase: "Test SDF Network ; September 2015",
  },
  {
    id: "mainnet",
    kind: "mainnet",
    name: "Mainnet",
    rpcUrl: "https://mainnet.sorobanrpc.com",
    horizonUrl: "https://horizon.stellar.org",
    passphrase: "Public Global Stellar Network ; September 2015",
  },
  {
    id: "futurenet",
    kind: "futurenet",
    name: "Futurenet",
    rpcUrl: "https://rpc-futurenet.stellar.org",
    horizonUrl: "https://horizon-futurenet.stellar.org",
    passphrase: "Test SDF Future Network ; October 2022",
  },
];

export const NETWORK_COLORS: Record<NetworkKind, string> = {
  testnet: "#f59e0b",
  mainnet: "#3b82f6",
  futurenet: "#a855f7",
  custom: "#22c55e",
};

const ACTIVE_KEY = "sb-network-active";
const CUSTOM_KEY = "sb-network-custom";

function loadCustomNetworks(): NetworkConfig[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface NetworkContextValue {
  networks: NetworkConfig[];
  active: NetworkConfig;
  setActiveId: (id: string) => void;
  addCustomNetwork: (network: Omit<NetworkConfig, "id" | "kind" | "custom">) => NetworkConfig;
  removeCustomNetwork: (id: string) => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [customNetworks, setCustomNetworks] = useState<NetworkConfig[]>(loadCustomNetworks);
  const [activeId, setActiveIdState] = useState<string>(
    () => localStorage.getItem(ACTIVE_KEY) || BUILTIN_NETWORKS[0].id
  );

  const networks = useMemo(() => [...BUILTIN_NETWORKS, ...customNetworks], [customNetworks]);

  const active = useMemo(
    () => networks.find(n => n.id === activeId) ?? BUILTIN_NETWORKS[0],
    [networks, activeId]
  );

  useEffect(() => {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(customNetworks));
  }, [customNetworks]);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    localStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const addCustomNetwork = useCallback((network: Omit<NetworkConfig, "id" | "kind" | "custom">) => {
    const id = `custom-${Date.now()}`;
    const full: NetworkConfig = { ...network, id, kind: "custom", custom: true };
    setCustomNetworks(prev => [...prev, full]);
    return full;
  }, []);

  const removeCustomNetwork = useCallback((id: string) => {
    setCustomNetworks(prev => prev.filter(n => n.id !== id));
    if (activeId === id) setActiveId(BUILTIN_NETWORKS[0].id);
  }, [activeId, setActiveId]);

  const value = useMemo(
    () => ({ networks, active, setActiveId, addCustomNetwork, removeCustomNetwork }),
    [networks, active, setActiveId, addCustomNetwork, removeCustomNetwork]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used within a NetworkProvider");
  return ctx;
}
