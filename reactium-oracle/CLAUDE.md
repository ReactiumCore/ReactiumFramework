# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Reactium Oracle** is an MCP (Model Context Protocol) server that provides intelligent access to Reactium framework knowledge through a graph database. It transforms static CLAUDEDB documentation into a queryable knowledge graph with session memory capabilities.

**Core Purpose**: Enable Claude to query 1,769+ framework concepts through 15 MCP tools instead of loading entire documentation into context.

## Key Technologies

- **Runtime**: Bun (primary) or Node.js
- **Database**: Memgraph (Neo4j-compatible graph database via Docker)
- **Protocol**: MCP (Model Context Protocol) via stdio transport
- **Query Language**: Cypher (graph queries)
- **Type System**: TypeScript with ES2022 modules

## Development Commands

### Docker Database Management

```bash
bun run docker:up        # Start Memgraph container
bun run docker:down      # Stop Memgraph container
bun run docker:logs      # View Memgraph logs
docker logs memgraph-mage    # Direct container logs
```

### Knowledge Graph Bootstrap

```bash
bun scripts/bootstrap-from-claudedb.ts    # Populate graph from CLAUDEDB files
```

This script parses `../CLAUDEDB/` markdown files and populates Memgraph with concepts, functions, and relationships.

### MCP Server

```bash
npm start                # Start MCP server (production)
bun run serve           # Alternative start command
bun run dev             # Watch mode (auto-restart on changes)
```

The server runs in stdio mode for MCP protocol communication.

### TypeScript Build

```bash
bun run build           # Compile TypeScript to dist/
```

Note: Building to dist/ is optional - Bun can run TypeScript directly.

## Architecture

### System Flow

```
Claude CLI
    ↓ (MCP stdio)
src/index.ts (MCP Server)
    ↓ (Neo4j driver)
Memgraph Docker Container
    ↓ (bootstrap script)
../CLAUDEDB/*.md files
```

### Core Files

- **src/index.ts** - MCP server with 15 tool definitions and handlers
- **src/memgraph.ts** - Neo4j driver wrapper for Memgraph connection
- **scripts/bootstrap-from-claudedb.ts** - Markdown parser that extracts concepts from CLAUDEDB
- **docker-compose.yml** - Memgraph + Lab containers (ports 7687, 7444, 3080)

### Graph Database Schema

**Node Types:**
- `Concept` - Framework concepts (name, description, category, docFile, anchor)
- `Function` - API function definitions (signature, parameters, returnType, isAsync)
- `Session` - Claude interaction sessions (id, title, context, status, startTime)
- `Decision` - Session decisions (text, reasoning, alternatives)
- `Blocker` - Session blockers (text, impact, suggestedResolution)
- `Change` - Code changes (filePath, changeType, description)
- `Question` - Session questions (text, context)

**Relationship Types:**
- `RELATES_TO` - General concept relationship (auto-generated)
- `DEPENDS_ON` - Concept requires another
- `USES` - Concept uses another
- `PART_OF` - Hierarchical composition
- `EXTENDS` - Concept extends another
- `MADE_DECISION`, `BLOCKED_ON`, `CHANGED`, `QUESTIONED` - Session relationships

**Categories:**
- `core-system` - Hook system, registries, architecture
- `pattern` - Lifecycle patterns, workflows
- `tool` - CLI commands, build tools
- `plugin` - Plugin system, extensions
- `utility` - Helper functions, utilities

### MCP Tools (15 Total)

**Knowledge Graph Tools (7):**
1. `kg_add_concept` - Add new concept node
2. `kg_add_function` - Add function definition
3. `kg_relate_concepts` - Create explicit relationship
4. `kg_query` - Execute raw Cypher query
5. `kg_list_concepts` - List all concepts with optional category filter
6. `kg_find_related` - Traverse relationships (1-3 hops)
7. `kg_search_concept` - Full-text search on names/descriptions

**Session Memory Tools (8):**
1. `session_start` - Begin new session
2. `session_record_decision` - Log decision with reasoning
3. `session_record_blocker` - Log blockers with impact
4. `session_record_change` - Log file modifications
5. `session_record_question` - Log questions
6. `session_get_state` - Retrieve session state
7. `session_list` - List recent sessions
8. `session_finalize` - Close session

## Bootstrap Script Architecture

The bootstrap script (`scripts/bootstrap-from-claudedb.ts`) uses **remark** to parse markdown AST:

**Parsing Strategy:**
- **INDEX.md**: Extracts list items with bold names and links → Creates Concept nodes
- **CONCEPTS.md**: Extracts H3 headers as learning paths → Creates related concepts
- **API.md**: Extracts function signatures from code blocks → Creates Function nodes

**Relationship Generation:**
- Automatic `RELATES_TO` edges created when concept names contain other concept names (length > 5)
- Results in ~1,470 relationships for 1,769 concepts

**Category Inference:**
- Pattern matching on name + description + docFile
- Keywords: "hook", "system" → core-system; "pattern", "lifecycle" → pattern; etc.

## Environment Variables

Create `.env` from `.env.example`:

```bash
MEMGRAPH_HOST=localhost
MEMGRAPH_PORT=7687
MEMGRAPH_USER=
MEMGRAPH_PASSWORD=
```

Default values work for local Docker setup (no auth required).

## Database Access

### Memgraph CLI

```bash
docker exec -it memgraph-mage memgraph-cli
```

Run Cypher queries directly:

```cypher
MATCH (c:Concept) RETURN c.name, c.category LIMIT 10;
MATCH (c1:Concept)-[r]->(c2:Concept) RETURN c1.name, type(r), c2.name LIMIT 20;
```

### Memgraph Lab (GUI)

Open browser: `http://localhost:3080`

Visual query builder and graph visualization.

## Common Development Tasks

### Adding New MCP Tools

1. Add tool definition to appropriate array in `src/index.ts`:
   - `knowledgeGraphTools`
   - `sessionMemoryTools`
   - `conceptDiscoveryTools`

2. Add handler case in `handleToolCall()` function

3. Test with `npm start` and trigger from Claude CLI

### Modifying Bootstrap Logic

1. Edit `scripts/bootstrap-from-claudedb.ts`
2. Update parsing functions: `parseIndexFile()`, `parseConceptsFile()`, `parseApiFile()`
3. Test: `bun scripts/bootstrap-from-claudedb.ts`
4. Verify in Memgraph Lab or CLI

### Adding New Node/Relationship Types

1. Create/modify Cypher queries in tool handlers
2. Update type definitions at top of `src/index.ts`
3. Consider adding to bootstrap script if sourced from CLAUDEDB

### Re-bootstrapping Graph

**Warning**: This clears all data.

```bash
# Option 1: Drop all nodes in Cypher
docker exec -it memgraph-mage memgraph-cli
> MATCH (n) DETACH DELETE n;

# Option 2: Restart with fresh volume
bun run docker:down
rm -rf memgraph/var/lib/*
bun run docker:up

# Then re-bootstrap
bun scripts/bootstrap-from-claudedb.ts
```

## Key Implementation Patterns

### Cypher Query Execution

All database queries go through `executeQuery()` from `src/memgraph.ts`:

```typescript
const result = await executeQuery(query, params);
const records = result.records.map(r => r.toObject());
```

### Error Handling

- Duplicate concept insertions silently skip (UNIQUE constraint)
- Connection failures throw and exit
- Tool errors return `{ error: "message" }` instead of throwing

### MCP Response Format

All tool handlers return objects that get stringified:

```typescript
return {
  content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
};
```

### Graph Traversal Patterns

Variable-length relationships for multi-hop discovery:

```cypher
MATCH (c1:Concept {name: $name})
MATCH (c1)-[*1..2]-(c2:Concept)
WHERE c1 <> c2
RETURN DISTINCT c2
```

## Testing & Verification

### Verify Database Connection

```bash
docker exec memgraph-mage bash -c "echo 'MATCH (n) RETURN count(n);' | memgraph-cli"
```

### Check Concept Count

```cypher
MATCH (c:Concept) RETURN count(c) as total;
// Should return ~1769
```

### Test MCP Server

Start server with `npm start`, then from Claude CLI use:

```
kg_search_concept("Hook System")
kg_find_related("Component Registry", depth: 2)
session_start("test-session", "Testing")
```

## Troubleshooting

### "Connection refused" to Memgraph

- Ensure Docker is running: `docker ps`
- Wait 3-5 seconds after `docker:up` for initialization
- Check logs: `bun run docker:logs`

### Bootstrap finds 0 concepts

- Verify CLAUDEDB path: `/home/john/reactium-framework/CLAUDEDB/INDEX.md`
- Check file exists: `ls ../CLAUDEDB/INDEX.md`
- Review bootstrap output for parsing errors

### MCP server won't start

- Check Memgraph is running first
- Verify port 7687 is not in use: `lsof -i :7687`
- Check stderr output for connection errors

### TypeScript compilation errors

- Run `bun install` to ensure dependencies
- Check `tsconfig.json` module resolution (currently "bundler")
- Bun bypasses compilation, so errors only appear in editor

## File Locations

- **Source Code**: `src/index.ts`, `src/memgraph.ts`
- **Bootstrap Scripts**: `scripts/bootstrap-from-claudedb.ts`
- **Database Storage**: `memgraph/var/lib/` (Docker volume)
- **Documentation Source**: `../CLAUDEDB/` (one directory up)
- **Package Config**: `package.json`, `tsconfig.json`

## Important Notes

- The server runs via **stdio transport** (not HTTP), so you can't curl it
- Memgraph data persists in local `memgraph/` directory across restarts
- Bootstrap is **idempotent** - safe to run multiple times (skips duplicates)
- Graph queries use **Cypher syntax**, not SQL
- MCP tools are **synchronous** from Claude's perspective (async internally)
