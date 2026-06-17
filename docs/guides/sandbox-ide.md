# Soroban Sandbox IDE

Interactive web-based IDE for developing and testing Soroban contracts with live coding, preview, and collaboration features.

## Features

### 📝 Code Editor
- Monaco Editor with syntax highlighting for JavaScript, TypeScript, Rust, and Python
- Multi-file project support with file explorer
- Auto-save every 30 seconds
- Session persistence with localStorage + backend

### 🚀 WebContainer Runtime
- Run Node.js projects directly in the browser
- Execute npm commands and scripts
- Real-time terminal output
- No external infrastructure required

### 📦 Multiple Framework Templates
- **Node.js SDK** - Soroban Explorer event listener
- **React SPA** - Full React app with explorer integration
- **Python SDK** - Python event consumer
- **Hardhat** - Solidity-compatible scripts
- **Foundry** - Fast Rust-based toolkit

### 🔗 Sharing & Export
- Generate shareable URLs for read-only access
- Export projects as ZIP files
- QR codes for mobile viewing
- Shareable links last indefinitely

### 🔍 Dependency Analyzer
- Parse package.json dependencies
- Detect security vulnerabilities
- Estimate bundle size
- Display severity levels (critical, high, medium)

### 💾 Project Persistence
- Auto-save to browser storage
- Backend storage for sharing
- Load previous sessions
- Fork and duplicate projects

## Quick Start

### Creating a New Sandbox

1. Navigate to `/sandbox`
2. Select a framework template
3. Files will be loaded into the editor
4. Make changes and code runs automatically

### Running Code

Click the **Run** button to execute your project:
- Dependencies install automatically
- Terminal shows live output
- Errors are displayed in real-time

### Sharing Your Project

1. Click the **Share** button
2. Copy the URL from the modal
3. Share with collaborators (read-only access)
4. Share QR code for mobile viewing

### Exporting Your Project

1. Click the **Export** button
2. Download as ZIP file
3. Extract locally to continue development
4. All files and configurations included

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Frontend (React + Vite)                        │
│  ├─ Sandbox (Editor + File Explorer)           │
│  ├─ Editor (Monaco)                            │
│  ├─ Terminal (Output streaming)                │
│  ├─ Preview (Dependency visualizer)            │
│  └─ ActionBar (Export, Share, Menu)            │
├─────────────────────────────────────────────────┤
│  WebContainer API (Client-side Runtime)         │
│  ├─ File system mounting                       │
│  ├─ npm command execution                      │
│  └─ Output streaming                           │
├─────────────────────────────────────────────────┤
│  Backend API (Express + PostgreSQL)             │
│  ├─ POST /api/sandbox - Save project           │
│  ├─ GET /api/sandbox/:id - Load project        │
│  ├─ DELETE /api/sandbox/:id - Delete project   │
│  └─ GET /api/sandboxes - List projects         │
└─────────────────────────────────────────────────┘
```

## API Routes

### Save Sandbox
```
POST /api/sandbox
Content-Type: application/json

{
  "sandboxId": "abc123",
  "templateId": "node-sdk",
  "files": { "src/index.js": { ... } },
  "metadata": { "name": "My Project" }
}
```

### Load Sandbox
```
GET /api/sandbox/:id

Response:
{
  "sandboxId": "abc123",
  "templateId": "node-sdk",
  "files": { ... },
  "createdAt": "2026-06-17T...",
  "updatedAt": "2026-06-17T..."
}
```

### List Sandboxes
```
GET /api/sandboxes?limit=20&offset=0

Response:
{
  "sandboxes": [ ... ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

## Environment Variables

Frontend (`.env.local` or `.env`):
```
VITE_API_URL=http://localhost:3001
```

Backend (`.env`):
```
DATABASE_URL=postgresql://...
PORT=3001
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

## Templates

Each template includes:
- Pre-configured `package.json` / `Cargo.toml`
- Environment variables (`.env`)
- README with setup instructions
- Example code matching contract ABI
- `.gitignore` and Docker support

### Creating Custom Templates

Add to `frontend/src/services/templates.ts`:

```typescript
export const TEMPLATES = {
  'my-template': {
    name: 'My Custom Template',
    description: 'Description here',
    files: {
      'src/index.js': { 
        path: 'src/index.js',
        language: 'javascript',
        content: `// Code here`
      },
      // ... more files
    }
  }
}
```

## Development

### Local Setup

```bash
# Frontend
cd frontend
npm install
npm run dev  # http://localhost:5173

# Indexer (backend)
cd indexer
npm install
node src/index.js
```

### Building for Production

```bash
# Frontend
npm run build

# Create migration and apply
npm run migrate
```

## Roadmap

### Phase 2 (Complete)
- ✅ Collaboration with Y.js CRDT
- ✅ AI-powered code assistant
- ✅ GitHub integration

### Phase 3 (Future)
- Built-in debugger with breakpoints
- Plugin/extension system
- CI integration (GitHub Actions)
- Ephemeral environment deployment
- Visual contract ABI explorer

## Troubleshooting

### WebContainer not loading
- Check browser console for COOP/COEP header errors
- Works best in Chrome/Edge, Firefox, Safari (latest versions)
- Enable in deployment via proper HTTP headers

### Files not saving
- Check browser storage quota
- Try exporting project as backup
- Backend must be running for persistent storage

### npm commands failing
- Verify `package.json` syntax
- Check network for npm registry access
- WebContainer has limited environment variables

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## License

MIT
