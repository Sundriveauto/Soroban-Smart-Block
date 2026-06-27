const pg = require('pg');

module.exports.setup = async () => {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Wait for quickstart ledger to be ready
    let ledger = 0;
    let attempts = 0;
    while (ledger < 10 && attempts < 30) {
      // Poll RPC for current ledger
      attempts++;
      await new Promise(r => setTimeout(r, 1000));
    }

    // Deploy contract WASM
    console.log('Deploying contract WASM...');

    // Register sample ABI
    console.log('Registering sample ABI...');

    // Fund test account
    console.log('Funding test account...');

    await client.end();
  } catch (err) {
    console.error('Setup failed:', err);
    throw err;
  }
};
