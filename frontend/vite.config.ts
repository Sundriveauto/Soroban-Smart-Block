import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import monacoEditorPluginPkg from "vite-plugin-monaco-editor";
const monacoEditorPlugin = monacoEditorPluginPkg.default || monacoEditorPluginPkg;

export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin({
      languageWorkers: ["editorWorkerService", "typescript", "json", "css", "html"],
    }),
  ],
  build: {
    target: "esnext",
  },
  server: { proxy: { "/api": "http://localhost:3001" } },
  test: { environment: "jsdom", globals: true, setupFiles: [] },
});
