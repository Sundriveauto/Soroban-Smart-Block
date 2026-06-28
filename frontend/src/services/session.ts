import { SandboxFile } from "./webcontainer";

export interface SessionData {
  sandboxId: string;
  templateId: string;
  selectedFile: string | null;
  files: Record<string, SandboxFile>;
  timestamp: number;
}

const STORAGE_KEY = "soroban_sandbox_session";
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export function saveSession(sessionData: SessionData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}

export function loadSession(): SessionData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to load session:", error);
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function createAutoSaver(
  sandboxId: string,
  templateId: string,
  files: Map<string, SandboxFile>,
  selectedFile: string | null,
): () => void {
  const interval = setInterval(() => {
    const filesObj: Record<string, SandboxFile> = {};
    for (const [key, file] of files) {
      filesObj[key] = file;
    }

    saveSession({
      sandboxId,
      templateId,
      selectedFile,
      files: filesObj,
      timestamp: Date.now(),
    });
  }, AUTO_SAVE_INTERVAL);

  return () => clearInterval(interval);
}
