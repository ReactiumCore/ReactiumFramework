# Reactium Oracle

**An MCP (Model Context Protocol) Server for Intelligent Reactium Framework Knowledge Management**

Reactium Oracle is a persistent knowledge graph system that enables Claude to access, query, and leverage the entire Reactium framework documentation through an intelligent graph database. It transforms static documentation into queryable, discoverable knowledge with session memory and relationship-based exploration.

## Features

- 🧠 **Knowledge Graph Database** - 1,769+ framework concepts indexed and interconnected
- 🔍 **Intelligent Discovery** - Find related concepts through multi-hop relationship traversal
- 💾 **Session Memory** - Persist context, decisions, and discoveries across Claude interactions
- 🔗 **15 MCP Tools** - Query, add, and manage concepts and sessions
- 📚 **Automated Extraction** - Bootstrap script parses CLAUDEDB documentation
- ⚡ **Real-time Queries** - Cypher-based graph queries for precise knowledge access
- 🐳 **Docker Ready** - Containerized Memgraph database for reliable persistence

## Quick Start

### 1. Start Docker Environment

```bash
bun run docker:up
```

### 2. Bootstrap Knowledge Graph

```bash
bun scripts/bootstrap-from-claudedb.ts
```

### 3. Start MCP Server

```bash
npm start
```

Your Claude CLI now has access to 15 intelligent tools for querying the Reactium framework!

👉 **[Full Getting Started Guide](./GETTING_STARTED.md)**

---

## What is This?

Reactium Oracle solves a critical problem: **Claude's context limit means it can't hold all framework knowledge simultaneously**. This system provides:

1. **Persistent Knowledge Base** - All 1,769 framework concepts stored in Memgraph
2. **Smart Discovery** - Find concepts and their relationships instantly
3. **Session Continuity** - Remember decisions and context across multiple conversations
4. **Code Examples** - Access to patterns, code samples, and best practices

### The Problem

Without Reactium Oracle:

```
Claude: "How do I register a hooks DDD file?"
Response: Generic or incomplete (missing framework specifics)
Result: User searches documentation manually ❌
```

With Reactium Oracle:

```
Claude: "How do I register a hooks DDD file?"
Uses: kg_search_concept + kg_find_related
Response: Complete guide with code examples + related patterns
Result: User gets framework-specific answer immediately ✅
```

---

## Architecture

### System Components

```
Claude CLI / Copilot
        ↓
    MCP Protocol (stdio)
        ↓
Reactium Oracle MCP Server
  ├─ 7 Knowledge Graph Tools
  ├─ 8 Session Memory Tools
  └─ Neo4j Driver
        ↓
  Memgraph Graph Database
  ├─ 1,769 Concepts
  ├─ 1,470 Relationships
  └─ Session Memory
        ↓
  CLAUDEDB Documentation
  ├─ INDEX.md (589 concepts)
  ├─ CONCEPTS.md (44 learning paths)
  └─ Additional documentation files
```

### Knowledge Graph Structure

**Concept Node Example:**

```javascript
{
  id: "Hook.register",
  name: "Hook.register",
  category: "core-system",
  description: "Register a callback function to be executed...",
  docFile: "HOOK_DOMAINS_DEEP_DIVE.md",
  anchor: "#hook-registration-api",
  createdAt: "2025-12-09T16:34:04Z"
}
```

**Relationship Types:**

- `RELATES_TO` - General concept relationship (automatic)
- `DEPENDS_ON` - Concept requires knowledge of another
- `USES` - Concept uses another concept
- `PART_OF` - Hierarchical composition
- `EXTENDS` - Concept extends or builds on another

---

## Available Tools

### Knowledge Graph Tools (7)

```typescript
// Search for concepts by name or description
kg_search_concept(query: string, category?: string, limit?: number)

// Find related concepts through graph relationships
kg_find_related(conceptName: string, depth?: 1-3, limit?: number)

// Add new concept to graph
kg_add_concept(name: string, description: string, category: string, keywords?: string[])

// Create explicit relationships between concepts
kg_relate_concepts(from: string, to: string, type: 'DEPENDS_ON'|'USES'|'PART_OF'|'RELATES_TO'|'EXTENDS')

// Execute raw Cypher queries
kg_query(query: string, params?: object)

// List all concepts with optional filtering
kg_list_concepts(category?: string)

// Add function definitions (for API documentation)
kg_add_function(name: string, signature: string, description: string, parameters?: string[], returnType?: string, isAsync?: boolean)
```

### Session Memory Tools (8)

```typescript
// Begin a new session
session_start(sessionId: string, title: string, context?: string)

// Record a decision made during the session
session_record_decision(sessionId: string, decision: string, reasoning: string, alternatives?: string[])

// Record a blocker encountered
session_record_blocker(sessionId: string, blocker: string, impact: string, suggestedResolution?: string)

// Document code changes
session_record_change(sessionId: string, filePath: string, changeType: 'created'|'modified'|'deleted', description: string, relatedConcept?: string)

// Capture questions that arose
session_record_question(sessionId: string, question: string, context: string, relatedConcept?: string)

// Retrieve current session state
session_get_state(sessionId: string)

// List recent sessions
session_list(limit?: number, status?: 'active'|'completed'|'abandoned')

// Close a session
session_finalize(sessionId: string, status: 'completed'|'abandoned', summary: string)
```

---

## Usage Examples

### Example 1: Query Framework Pattern

```javascript
// Claude uses the MCP server
const results = await callTool('kg_search_concept', {
  query: 'component registration',
  limit: 10,
});

// Returns:
// [
//   { name: 'Component Registry', description: '...', category: 'core-system' },
//   { name: 'registerComponent', description: '...', category: 'core-system' },
//   ...
// ]
```

### Example 2: Discover Related Concepts

```javascript
// Find concepts related to "Hook System"
const related = await callTool('kg_find_related', {
  conceptName: 'Hook System',
  depth: 2, // 2 hops in the graph
  limit: 20,
});

// Returns concepts connected through relationship paths:
// - Hook.register (direct)
// - Hook.runSync (direct)
// - Hook domains (direct)
// - Plugin lifecycle (2 hops)
// - Component binding (2 hops)
// etc.
```

### Example 3: Record a Discovery Session

```javascript
// Start session
await callTool('session_start', {
  sessionId: 'pattern-discovery-20251209',
  title: 'Zone Registry Pattern Discovery',
});

// Record question
await callTool('session_record_question', {
  sessionId: 'pattern-discovery-20251209',
  question: 'How to register components to rendering zones?',
  context: 'Building a plugin that needs to add UI to multiple zones',
  relatedConcept: 'Zone System',
});

// Record decision
await callTool('session_record_decision', {
  sessionId: 'pattern-discovery-20251209',
  decision: 'Use ZoneRegistry.addComponent() in Hook.register("plugin-init")',
  reasoning: 'Hooks run at correct lifecycle phase for plugin initialization',
  alternatives: ['Direct component import', 'Zone subscribe pattern'],
});

// Finalize session
await callTool('session_finalize', {
  sessionId: 'pattern-discovery-20251209',
  status: 'completed',
  summary: 'Discovered optimal zone registry pattern with code examples',
});
```

---

## Installation & Setup

### Prerequisites

- **Docker & Docker Compose** - For running Memgraph
- **Bun** (or Node.js) - Runtime for MCP server
- **Git** - For cloning the project

### Step-by-Step Setup

#### 1. Clone and Navigate

```bash
cd reactium-framework/reactium-oracle
```

#### 2. Install Dependencies

```bash
npm install
# or
bun install
```

#### 3. Start Docker Environment

```bash
bun run docker:up
```

Wait 3-5 seconds for Memgraph to fully initialize.

#### 4. Bootstrap Knowledge Graph

```bash
bun scripts/bootstrap-from-claudedb.ts
```

Expected output:

```
🚀 Bootstrapping Knowledge Graph from CLAUDEDB files...
✓ Connected to Memgraph
📖 Processing INDEX.md: ✓ Found 589 concepts
💾 Inserting INDEX.md concepts: ✓ Inserted 589
📖 Processing CONCEPTS.md: ✓ Found 44 learning paths
🔗 Creating concept relationships: ✓ Created 1470 relationships
📈 Total in graph: Concepts (1769)
✅ Graph is ready for Claude CLI context queries!
```

#### 5. Start MCP Server

```bash
npm start
# or
bun run serve
```

The server is now ready for Claude CLI or Copilot to connect.

---

## Project Structure

```
reactium-oracle/
├── src/
│   ├── index.ts                 # MCP server implementation (15 tools)
│   ├── memgraph.ts              # Database connection and utilities
│   └── handlers/
│       ├── knowledge-graph.ts    # KG tool implementations
│       └── session-memory.ts     # Session tool implementations
├── scripts/
│   ├── bootstrap-from-claudedb.ts    # Knowledge extraction script
│   └── ...
├── memgraph/                    # Database storage (Docker volume)
│   ├── etc/                     # Configuration
│   └── var/                     # Data files
├── docker-compose.yml           # Memgraph container config
├── package.json
├── tsconfig.json
├── GETTING_STARTED.md           # Comprehensive getting started guide
└── README.md                    # This file
```

---

## Development

### Build

```bash
# Compile TypeScript
bun run build

# Watch mode (recompile on changes)
bun run dev
```

### Database Commands

```bash
# View Memgraph logs
docker logs memgraph-mage

# Connect to Memgraph CLI
docker exec -it memgraph-mage memgraph-cli

# Stop containers
bun run docker:down
```

### Adding New Concepts

You can add concepts in two ways:

**Option 1: Update CLAUDEDB and re-bootstrap**

```bash
# Edit documentation in ../CLAUDEDB/
# Then re-run:
bun scripts/bootstrap-from-claudedb.ts
```

**Option 2: Use the MCP tool directly**

```javascript
// Claude can add concepts on-demand
await callTool('kg_add_concept', {
  name: 'My New Pattern',
  description: 'What this pattern is and when to use it',
  category: 'pattern',
  keywords: ['tag1', 'tag2'],
});
```

---

## Knowledge Graph Statistics

**Current State:**

- **Total Concepts:** 1,769
- **Source Files:** INDEX.md (589), CONCEPTS.md (44 + auto-generated)
- **Relationships:** 1,470 (RELATES_TO edges)
- **Categories:** core-system, utility, pattern, tool, plugin
- **Documentation Links:** 589 anchor links to CLAUDEDB

**Growth:**

- Bootstrap adds 589 concepts from INDEX.md
- CONCEPTS.md adds 44 learning paths
- Automatic relationship generation creates 1,470 edges
- Session memory adds decision/question/change nodes

---

## Common Tasks

### Query for a Concept

```bash
# In Claude CLI, use the MCP server
kg_search_concept("your search term")
```

### Find Related Concepts

```bash
# Discover what's connected
kg_find_related("Component Registry", depth: 2)
```

### Save Discovery Session

```bash
# Record your work persistently
session_start("my-session-id")
session_record_question(...)
session_record_decision(...)
session_finalize(...)
```

### Browse All Concepts

```bash
# List everything
kg_list_concepts()

# Filter by category
kg_list_concepts(category: "pattern")
```

---

## Troubleshooting

### "Connection refused" error

**Cause:** Memgraph not running  
**Solution:**

```bash
bun run docker:up
# Wait 3-5 seconds
```

### Bootstrap fails with "File not found"

**Cause:** CLAUDEDB files missing  
**Solution:** Verify `../CLAUDEDB/INDEX.md` exists relative to this directory

### Permission denied on memgraph directory

**Cause:** Docker container user permissions  
**Solution:**

```bash
sudo chmod -R g+r ./memgraph/
find ./memgraph -type d -exec sudo chmod 2777 {} \;
```

### MCP Server won't start

**Cause:** Port already in use or database connection issue  
**Solution:**

```bash
# Check if Memgraph is running
docker ps | grep memgraph

# View MCP server logs
npm start  # Shows output directly
```

→ **[More troubleshooting in GETTING_STARTED.md](./GETTING_STARTED.md#troubleshooting)**

---

## Architecture Decisions

### Why Memgraph?

- **Graph-native:** Perfect for relationship-based knowledge
- **Cypher queries:** Standard graph query language
- **Fast:** In-memory + persistence for quick access
- **Docker-friendly:** Easy local development setup
- **Cost:** Open-source and self-hosted

### Why Bootstrap Script?

- **Automated extraction:** Keeps documentation in sync
- **Idempotent:** Safe to run multiple times
- **Relationship generation:** Creates discovery paths automatically
- **Flexible:** Easy to extend for new file types

### Why Session Memory?

- **Context continuity:** Remember decisions across interactions
- **Audit trail:** Track what was discovered and decided
- **Knowledge building:** Sessions themselves become documented
- **Persistent learning:** Build on previous work

---

## Contributing

### Adding Documentation to Graph

1. Update files in `../CLAUDEDB/`
2. Run bootstrap: `bun scripts/bootstrap-from-claudedb.ts`
3. Test queries against new content

### Extending MCP Tools

1. Add handler in `src/handlers/`
2. Register tool in `src/index.ts`
3. Test with `npm start`

### Improving Bootstrap Script

1. Edit `scripts/bootstrap-from-claudedb.ts`
2. Test with `bun scripts/bootstrap-from-claudedb.ts`
3. Verify statistics in output

---

## Resources

- 📖 **[Getting Started Guide](./GETTING_STARTED.md)** - Complete setup walkthrough
- 📚 **[CLAUDEDB](../CLAUDEDB/)** - Framework documentation source
- 🔗 **[Memgraph Docs](https://memgraph.com/docs/)** - Graph database documentation
- 🤖 **[MCP Specification](https://modelcontextprotocol.io/)** - Protocol details
- ⚙️ **[Reactium Framework](../README.md)** - Main framework documentation

---

## License

See the main Reactium project license.

---

## Support

For issues or questions:

1. **Server errors:** Check logs with `npm start`
2. **Database issues:** View Memgraph logs: `docker logs memgraph-mage`
3. **Bootstrap problems:** Ensure CLAUDEDB files exist
4. **Tool issues:** Review tool definitions in `src/index.ts`

---

**Ready to explore the Reactium framework with AI-powered knowledge discovery?**

[👉 Get Started Now →](./GETTING_STARTED.md)
