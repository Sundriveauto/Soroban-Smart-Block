import { SandboxFile } from "./webcontainer";

export interface Template {
  name: string;
  description: string;
  files: Record<string, SandboxFile>;
}

export const TEMPLATES: Record<string, Template> = {
  "node-sdk": {
    name: "Node.js SDK",
    description: "Event listener using Soroban Explorer SDK",
    files: {
      "src/index.js": {
        path: "src/index.js",
        language: "javascript",
        content: `import { SorobanExplorer } from 'soroban-explorer-sdk';
import dotenv from 'dotenv';

dotenv.config();

const explorer = new SorobanExplorer({
  network: 'testnet',
  rpcUrl: process.env.SOROBAN_RPC_URL,
});

console.log('Starting Soroban Event Listener...');
console.log('Connecting to testnet...');

explorer.on('event', (event) => {
  console.log('Event received:', {
    type: event.type,
    contract: event.contractId,
    function: event.functionName,
    data: event.data,
  });
});

explorer.on('error', (err) => {
  console.error('Error:', err.message);
});

console.log('Listening for events...');
await explorer.start();
`,
      },
      "package.json": {
        path: "package.json",
        language: "json",
        content: `{
  "name": "soroban-explorer-demo",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "soroban-explorer-sdk": "0.2.0",
    "dotenv": "16.4.5"
  }
}
`,
      },
      ".env": {
        path: ".env",
        language: "plaintext",
        content: `SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
EXPLORER_CONTRACT_ID=CABCD1234567890ABCD1234567890ABCD1234567890ABCD1234567890ABC
`,
      },
    },
  },
  "react-spa": {
    name: "React SPA",
    description: "Full React app with explorer integration",
    files: {
      "src/App.tsx": {
        path: "src/App.tsx",
        language: "typescript",
        content: `import { useState, useEffect } from 'react';
import { SorobanExplorer } from 'soroban-explorer-sdk';
import './App.css';

interface Event {
  id: string;
  contractId: string;
  functionName: string;
  timestamp: number;
  data: Record<string, any>;
}

export default function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!isListening) return;

    const explorer = new SorobanExplorer({
      network: 'testnet',
      rpcUrl: import.meta.env.VITE_SOROBAN_RPC_URL,
    });

    explorer.on('event', (event: Event) => {
      setEvents(prev => [event, ...prev.slice(0, 49)]);
    });

    explorer.on('error', (err: Error) => {
      console.error('Error:', err.message);
      setIsListening(false);
    });

    explorer.start().catch(() => setIsListening(false));

    return () => {
      explorer.stop();
    };
  }, [isListening]);

  return (
    <div className="app">
      <header>
        <h1>Soroban Event Explorer</h1>
        <button onClick={() => setIsListening(!isListening)}>
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
      </header>

      <div className="events">
        {events.length === 0 ? (
          <p>No events yet. Click "Start Listening" to begin.</p>
        ) : (
          events.map(event => (
            <div key={event.id} className="event-card">
              <h3>{event.functionName}</h3>
              <p className="contract">{event.contractId.slice(0, 10)}...</p>
              <pre>{JSON.stringify(event.data, null, 2)}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
`,
      },
      "src/main.tsx": {
        path: "src/main.tsx",
        language: "typescript",
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`,
      },
      "package.json": {
        path: "package.json",
        language: "json",
        content: `{
  "name": "soroban-explorer-react",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "soroban-explorer-sdk": "0.2.0"
  },
  "devDependencies": {
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "@vitejs/plugin-react": "4.3.1",
    "typescript": "5.4.5",
    "vite": "6.4.2"
  }
}
`,
      },
      ".env.example": {
        path: ".env.example",
        language: "plaintext",
        content: `VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
`,
      },
    },
  },
  "python-sdk": {
    name: "Python SDK",
    description: "Python event consumer using Stellar SDK",
    files: {
      "main.py": {
        path: "main.py",
        language: "python",
        content: `#!/usr/bin/env python3
import os
import asyncio
from stellar_sdk import SorobanExplorer
from dotenv import load_dotenv

load_dotenv()

async def main():
    explorer = SorobanExplorer(
        network='testnet',
        rpc_url=os.getenv('SOROBAN_RPC_URL'),
    )

    print('Starting Soroban Event Listener...')
    print('Connecting to testnet...')

    async for event in explorer.listen():
        print(f'Event received:')
        print(f'  Type: {event.type}')
        print(f'  Contract: {event.contract_id}')
        print(f'  Function: {event.function_name}')
        print(f'  Data: {event.data}')

if __name__ == '__main__':
    asyncio.run(main())
`,
      },
      "requirements.txt": {
        path: "requirements.txt",
        language: "plaintext",
        content: `stellar-sdk==12.3.0
python-dotenv==1.0.0
aiohttp==3.9.0
`,
      },
      ".env": {
        path: ".env",
        language: "plaintext",
        content: `SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
EXPLORER_CONTRACT_ID=CABCD1234567890ABCD1234567890ABCD1234567890ABCD1234567890ABC
`,
      },
    },
  },
  hardhat: {
    name: "Hardhat",
    description: "Hardhat scripts for Solidity-compatible contracts",
    files: {
      "hardhat.config.js": {
        path: "hardhat.config.js",
        language: "javascript",
        content: `require('@nomicfoundation/hardhat-toolbox');

module.exports = {
  solidity: '0.8.20',
  networks: {
    testnet: {
      url: process.env.RPC_URL || 'http://localhost:8545',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
`,
      },
      "scripts/deploy.js": {
        path: "scripts/deploy.js",
        language: "javascript",
        content: `const hre = require('hardhat');

async function main() {
  console.log('Deploying contract...');

  const Contract = await hre.ethers.getContractFactory('Contract');
  const contract = await Contract.deploy();

  await contract.deployed();
  console.log('Contract deployed to:', contract.address);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
`,
      },
      "package.json": {
        path: "package.json",
        language: "json",
        content: `{
  "name": "hardhat-soroban",
  "version": "1.0.0",
  "scripts": {
    "deploy": "hardhat run scripts/deploy.js"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "4.0.0",
    "hardhat": "2.21.0"
  }
}
`,
      },
    },
  },
  foundry: {
    name: "Foundry",
    description: "Fast Rust-based toolkit for Soroban",
    files: {
      "foundry.toml": {
        path: "foundry.toml",
        language: "toml",
        content: `[profile.default]
src = "src"
out = "out"
libs = ["lib"]

[rpc_endpoints]
testnet = "https://soroban-testnet.stellar.org"
`,
      },
      "src/Counter.sol": {
        path: "src/Counter.sol",
        language: "solidity",
        content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Counter {
    uint256 public count = 0;

    event Incremented(uint256 newCount);

    function increment() public {
        count++;
        emit Incremented(count);
    }
}
`,
      },
      "script/Deploy.s.sol": {
        path: "script/Deploy.s.sol",
        language: "solidity",
        content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Counter.sol";

contract Deploy is Script {
    function run() public {
        vm.broadcast();
        new Counter();
    }
}
`,
      },
    },
  },
};

export function getTemplate(name: string): Template | undefined {
  return TEMPLATES[name];
}

export function listTemplates(): Array<{
  id: string;
  name: string;
  description: string;
}> {
  return Object.entries(TEMPLATES).map(([id, template]) => ({
    id,
    name: template.name,
    description: template.description,
  }));
}
