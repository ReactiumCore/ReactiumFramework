/**
 * Reset schema (WARNING: deletes all data)
 *
 * Usage: bun run scripts/reset-schema.ts
 */

import {
  initializeMemgraph,
  closeMemgraph,
  executeQuery,
  executeQueries,
} from '../src/memgraph.js';
import { INITIALIZATION_QUERIES } from '../src/schema.js';

async function main(): Promise<void> {
  try {
    console.log('⚠️  WARNING: This will delete ALL data in Memgraph');
    console.log('Proceeding in 5 seconds... (Ctrl+C to cancel)\n');

    await new Promise((resolve) => setTimeout(resolve, 5000));

    await initializeMemgraph();

    console.log('Deleting all nodes and relationships...');
    await executeQuery('MATCH (n) DETACH DELETE n;');
    console.log('✓ Deleted all data');

    console.log('\nRe-initializing schema...');
    await executeQueries(INITIALIZATION_QUERIES);
    console.log(
      `✓ Re-created ${INITIALIZATION_QUERIES.length} constraints and indexes`
    );

    console.log('\nSchema reset successfully!');
    console.log('Ready to populate with fresh data.');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('✗ Error resetting schema:', msg);
    process.exit(1);
  } finally {
    await closeMemgraph();
  }
}

main();
