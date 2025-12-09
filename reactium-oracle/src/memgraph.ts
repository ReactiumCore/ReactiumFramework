/**
 * Memgraph connection and query utilities
 */

import neo4j, { Driver, Session, QueryResult } from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

let driver: Driver | null = null;

export async function initializeMemgraph(): Promise<Driver> {
  try {
    const host = process.env.MEMGRAPH_HOST || 'localhost';
    const port = process.env.MEMGRAPH_PORT || '7687';
    const user = process.env.MEMGRAPH_USER || '';
    const password = process.env.MEMGRAPH_PASSWORD || '';

    const uri = `bolt://${host}:${port}`;

    const auth =
      user && password ? neo4j.auth.basic(user, password) : undefined;

    driver = neo4j.driver(uri, auth, {
      maxConnectionPoolSize: 10,
      connectionAcquisitionTimeout: 5000,
    });

    // Test connection
    await driver.verifyConnectivity();
    console.log('✓ Connected to Memgraph');

    return driver;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('✗ Failed to connect to Memgraph:', msg);
    throw error;
  }
}

export async function closeMemgraph(): Promise<void> {
  if (driver) {
    await driver.close();
    console.log('✓ Closed Memgraph connection');
  }
}

export async function executeQuery(
  query: string,
  params: Record<string, unknown> = {}
): Promise<QueryResult> {
  if (!driver) {
    throw new Error(
      'Memgraph not initialized. Call initializeMemgraph() first.'
    );
  }

  const session = driver.session();
  try {
    const result = await session.run(query, params);
    return result;
  } finally {
    await session.close();
  }
}

export async function executeQueries(
  queries: string[]
): Promise<QueryResult[]> {
  if (!driver) {
    throw new Error(
      'Memgraph not initialized. Call initializeMemgraph() first.'
    );
  }

  const session = driver.session();
  try {
    const results: QueryResult[] = [];
    for (const query of queries) {
      const result = await session.run(query);
      results.push(result);
    }
    return results;
  } finally {
    await session.close();
  }
}

export { driver };
