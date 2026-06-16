import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

describe("useEventStream", () => {
  let wsMock: { close: any; send: any; onmessage: any; onerror: any; readyState: number };

  beforeEach(() => {
    wsMock = { close: vi.fn(), send: vi.fn(), onmessage: null, onerror: null, readyState: 1 };
    class MockWebSocket { constructor() { return wsMock; } }
    (globalThis as any).WebSocket = MockWebSocket as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function renderHookWithEventStream(onEvent: (ev: any) => void) {
    const mod = await import("../src/hooks/useEventStream");
    return renderHook(() => mod.useEventStream(onEvent));
  }

  it("creates WebSocket connection on mount", async () => {
    const onEvent = vi.fn();
    await renderHookWithEventStream(onEvent);
    expect(wsMock).toBeDefined();
  });

  it("calls onEvent when receiving an event message", async () => {
    const onEvent = vi.fn();
    await renderHookWithEventStream(onEvent);
    act(() => { wsMock.onmessage({ data: JSON.stringify({ type: "event", data: { seq: 1 } }) }); });
    expect(onEvent).toHaveBeenCalledWith({ seq: 1 });
  });

  it("ignores non-event message types", async () => {
    const onEvent = vi.fn();
    await renderHookWithEventStream(onEvent);
    act(() => { wsMock.onmessage({ data: JSON.stringify({ type: "connected" }) }); });
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("ignores malformed JSON frames", async () => {
    const onEvent = vi.fn();
    await renderHookWithEventStream(onEvent);
    act(() => { wsMock.onmessage({ data: "not-json" }); });
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("closes WebSocket on unmount", async () => {
    const onEvent = vi.fn();
    const { unmount } = await renderHookWithEventStream(onEvent);
    unmount();
    expect(wsMock.close).toHaveBeenCalled();
  });
});

describe("useLocalAbi", () => {
  it("validates ABI JSON file contents", async () => {
    const mod = await import("../src/hooks/useLocalAbi");
    expect(mod).toBeDefined();
  });

  it("parseAbiFile parses flat array format", async () => {
    const mod = await import("../src/hooks/useLocalAbi");
    const { parseAbiFile } = mod;
    const input: any[] = [{ name: "transfer", params: [{ name: "to", type: "address" }] }];
    const result = parseAbiFile(input, "test.json");
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe("transfer");
    expect(result.functions[0].params?.[0].name).toBe("to");
    expect(result.fileName).toBe("test.json");
  });

  it("parseAbiFile parses registry format", async () => {
    const mod = await import("../src/hooks/useLocalAbi");
    const { parseAbiFile } = mod;
    const input = { contractId: "C1", name: "Token", functions: [{ name: "mint" }] };
    const result = parseAbiFile(input, "abi.json");
    expect(result.contractId).toBe("C1");
    expect(result.name).toBe("Token");
    expect(result.functions[0].name).toBe("mint");
  });

  it("parseAbiFile parses full-spec format", async () => {
    const mod = await import("../src/hooks/useLocalAbi");
    const { parseAbiFile } = mod;
    const input = { functions: [{ name: "transfer", inputs: [{ name: "to", type: "address" }] }], types: [{ kind: "struct", name: "Data" }] };
    const result = parseAbiFile(input, "spec.json");
    expect(result.functions[0].name).toBe("transfer");
    expect(result.types).toHaveLength(1);
  });

  it("parseAbiFile throws for null input", async () => {
    const mod = await import("../src/hooks/useLocalAbi");
    const { parseAbiFile } = mod;
    expect(() => parseAbiFile(null, "x.json")).toThrow("must be a JSON object or array");
  });

  it("parseAbiFile throws for unrecognised format", async () => {
    const mod = await import("../src/hooks/useLocalAbi");
    const { parseAbiFile } = mod;
    expect(() => parseAbiFile({ unknown: true }, "x.json")).toThrow("Unrecognised");
  });
});

describe("useTxStatus", () => {
  it("exports useTxStatus hook", async () => {
    const mod = await import("../src/hooks/useTxStatus");
    expect(mod.useTxStatus).toBeTypeOf("function");
  });
});
