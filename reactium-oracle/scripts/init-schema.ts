/**
 * Initialize schema in Memgraph
 *
 * Usage: bun run scripts/init-schema.ts
 */

import {
  initializeMemgraph,
  closeMemgraph,
  executeQueries,
} from '../src/memgraph.js';
import { INITIALIZATION_QUERIES } from '../src/schema.js';

async function main(): Promise<void> {
  try {
    console.log('Initializing Memgraph schema...\n');

    await initializeMemgraph();

    console.log('Executing initialization queries...');
    await executeQueries(INITIALIZATION_QUERIES);

    console.log(
      `✓ Successfully executed ${INITIALIZATION_QUERIES.length} initialization queries`
    );
    console.log('\nSchema initialized successfully!');
    console.log('Ready to populate with data.');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('✗ Error initializing schema:', msg);
    process.exit(1);
  } finally {
    await closeMemgraph();
  }
}

main();
