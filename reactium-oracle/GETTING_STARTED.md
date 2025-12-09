# Reactium Oracle - Getting Started Guide

Welcome to **Reactium Oracle**, an MCP (Model Context Protocol) server that provides intelligent access to the Reactium framework's knowledge graph. This guide will help you set up and start using the system.

## What is Reactium Oracle?

Reactium Oracle is a persistent knowledge management system that:

- **Extracts framework knowledge** from CLAUDEDB documentation files into a graph database
- **Provides MCP tools** that Claude can use to query framework concepts, patterns, and best practices
- **Maintains session memory** to persist context and decisions across multiple Claude interactions
- **Enables intelligent discovery** of related concepts through relationship traversal

## Quick Start (5 minutes)

### Prerequisites

- Docker & Docker Compose
- Bun runtime (or Node.js)
- Git

### 1. Start the Memgraph Database

```bash
cd reactium-oracle
bun run docker:up
```

This starts a Memgraph container that stores the knowledge graph.

**Verify it's running:**

```bash
docker ps | grep memgraph
```

You should see the `memgraph-mage` container running.

### 2. Bootstrap the Knowledge Graph

Populate Memgraph with concepts from CLAUDEDB:

```bash
bun scripts/bootstrap-from-claudedb.ts
```

**Expected output:**

```
🚀 Bootstrapping Knowledge Graph from CLAUDEDB files...
✓ Connected to Memgraph
📖 Processing INDEX.md: ✓ Found 589 concepts
💾 Inserting INDEX.md concepts: ✓ Inserted 589, skipped 0 duplicates
📖 Processing CONCEPTS.md: ✓ Found 44 learning paths, 321 total steps
🔗 Creating concept relationships: ✓ Created 1470 concept relationships
📈 Total in graph: Concepts (1769), Sessions (1)
✅ Graph is ready for Claude CLI context queries!
```

### 3. Start the MCP Server

In a new terminal:

```bash
cd reactium-oracle
npm start
# or: bun run serve
```

The MCP server is now listening and ready to accept requests from Claude CLI.

---

## Claude Code CLI Integration

### Add the Reactium Oracle MCP Server

Use the `claude mcp add` command to register the Reactium Oracle MCP server with Claude Code:

```bash
# Basic command
claude mcp add --transport stdio reactium-oracle -- bash -c "cd $HOME/reactium-framework/reactium-oracle && bun start"
```

**Options:**

```bash
# Add to user scope (available across all projects)
claude mcp add --transport stdio reactium-oracle --scope user \
  -- bash -c "cd $HOME/reactium-framework/reactium-oracle && bun start"

# Add to project scope (saved in .mcp.json, shared with team)
claude mcp add --transport stdio reactium-oracle --scope project \
  -- bash -c "cd $HOME/reactium-framework/reactium-oracle && bun start"
```

### Verify the Server was Added

```bash
# List all configured MCP servers
claude mcp list

# Get details for reactium-oracle
claude mcp get reactium-oracle
```

### Start Claude Code

Once configured, simply start Claude Code:

```bash
claude code
```

The Reactium Oracle MCP server will automatically connect.

### Verify Connection

Once Claude Code starts, ask:

```
"What MCP tools do you have available?"
```

Claude should respond with the 15 tools (Knowledge Graph + Session Memory tools).

### Managing the Server

```bash
# Remove the server
claude mcp remove reactium-oracle

# View server status within Claude Code
> /mcp
```

---

## Setup Details

### Docker Environment Setup

#### What Gets Installed

The docker setup creates a **Memgraph instance** with:

- Graph database for storing concepts and relationships
- Persistent storage in `./memgraph/` directory
- Network isolation for security

#### Docker Commands

```bash
# Start services
bun run docker:up

# Stop services
bun run docker:down

# View logs
docker logs memgraph-mage

# Connect to Memgraph CLI
docker exec -it memgraph-mage memgraph-cli
```

#### File Permissions

If you encounter permission issues with the memgraph directory:

```bash
# Add group read permissions
sudo chmod -R g+r ./memgraph

# Set group permissions on directories
find ./memgraph -type d -exec sudo chmod 2777 {} \;

# Add yourself to systemd-resolve group (WSL)
sudo usermod -aG systemd-resolve $USER
```

### Knowledge Graph Bootstrap

#### What the Bootstrap Script Does

The `bootstrap-from-claudedb.ts` script:

1. **Parses INDEX.md** - Extracts 589 core framework concepts

   - Categories: core-system, utility, pattern, tool, plugin
   - Links to documentation files and anchors
   - Metadata: name, description, category

2. **Parses CONCEPTS.md** - Identifies 44 learning paths

   - Learning sequences for complex topics
   - Related concept linkages
   - 321 individual learning steps

3. **Creates Relationships** - Generates 1,470 concept connections

   - RELATES_TO edges (automatic, name-based matching)
   - Enables intelligent concept discovery
   - Supports multi-hop traversal

4. **Stores in Memgraph** - Persists all data
   - Idempotent (safe to run multiple times)
   - Skips duplicate concepts automatically
   - Timestamps all entries

#### Running Bootstrap

```bash
# Full bootstrap
bun scripts/bootstrap-from-claudedb.ts

# The script will:
# 1. Connect to Memgraph (must be running)
# 2. Read CLAUDEDB files from ../CLAUDEDB/
# 3. Parse and extract concepts
# 4. Insert into graph database
# 5. Create relationships
# 6. Report statistics
```

#### Understanding the Output

```
📖 Processing INDEX.md: ✓ Found 589 concepts
  └─ Scanned markdown index file, extracted concept definitions

💾 Inserting INDEX.md concepts: ✓ Inserted 589, skipped 0 duplicates
  └─ Added concepts to database (skipped any pre-existing ones)

🔗 Creating concept relationships: ✓ Created 1470 concept relationships
  └─ Generated RELATES_TO edges between related concepts

📈 Total in graph: Concepts (1769)
  └─ Final count includes 589 INDEX + 44 CONCEPTS.md + auto-generated concept chains
```

---

## MCP Server Tools

Once the server is running, the following tools are available to Claude:

### Knowledge Graph Tools (7 tools)

| Tool                 | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `kg_add_concept`     | Add new concepts dynamically to the graph                    |
| `kg_add_function`    | Document functions with signatures and parameters            |
| `kg_relate_concepts` | Create explicit relationships between concepts               |
| `kg_query`           | Execute raw Cypher queries for advanced exploration          |
| `kg_list_concepts`   | Browse all concepts with optional category filtering         |
| `kg_find_related`    | Find concepts related through graph relationships (1-3 hops) |
| `kg_search_concept`  | Full-text search on concept names and descriptions           |

### Session Memory Tools (8 tools)

| Tool                      | Purpose                                        |
| ------------------------- | ---------------------------------------------- |
| `session_start`           | Begin a new session with context               |
| `session_record_decision` | Log a decision with reasoning and alternatives |
| `session_record_blocker`  | Record obstacles encountered                   |
| `session_record_change`   | Document code modifications and rationale      |
| `session_record_question` | Capture questions that arose during work       |
| `session_get_state`       | Retrieve current session context               |
| `session_list`            | Browse recent sessions                         |
| `session_finalize`        | Close a session and capture summary            |

---

## Common Workflows

### Workflow 1: Ask Claude About Framework Patterns

```
User: "How do I register a new Reactium hooks DDD file with component and zone registry?"

Claude uses MCP:
1. kg_search_concept("hook registration")
2. kg_search_concept("zone registry")
3. kg_find_related("Hook System", depth: 2)
4. Returns comprehensive guide with code examples
```

### Workflow 2: Document a Session

```
User: "I discovered a cool pattern today. Store this session!"

Claude uses MCP:
1. session_start(sessionId: "pattern-discovery-20251209")
2. session_record_question(question: "How to implement X?")
3. session_record_decision(decision: "Use pattern Y")
4. session_record_change(filePath: "component.ts", changeType: "created")
5. Entire discovery process is persisted in graph
```

### Workflow 3: Explore Concept Relationships

```
Claude uses MCP:
1. kg_search_concept("Component Binding")
2. kg_find_related("Component Binding", depth: 2, limit: 20)
3. Returns related concepts like "Component Registry", "Hook System", "DDD Pattern"
4. Provides context for understanding how concepts interconnect
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Claude CLI / Copilot                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    MCP Protocol (stdio)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Reactium Oracle MCP Server                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Knowledge Graph Tools (7)  │  Session Memory (8)    │   │
│  │  - kg_search_concept        │  - session_start       │   │
│  │  - kg_find_related          │  - session_record_*    │   │
│  │  - kg_add_concept           │  - session_get_state   │   │
│  │  - kg_query                 │  - session_finalize    │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                   Neo4j Driver (Cypher)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Memgraph Database                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1,769 Concepts  │  1,470 Relationships  │ Sessions  │   │
│  │  - Nodes         │  - RELATES_TO edges   │ - Memory  │   │
│  │  - Properties    │  - DEPENDS_ON edges   │ - History │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
                           │
                   Source: CLAUDEDB files
                           │
                    (INDEX.md, CONCEPTS.md, etc.)
```

---

## Troubleshooting

### Issue: "Connection refused" when starting server

**Solution:** Ensure Memgraph is running

```bash
bun run docker:up
# Wait ~3-5 seconds for container to fully start
```

### Issue: Bootstrap script hangs or times out

**Solution:** Check Memgraph logs

```bash
docker logs memgraph-mage
# Look for error messages
```

### Issue: Permission denied on memgraph directory

**Solution:** Fix ownership and permissions

```bash
sudo chown -R john:john ./memgraph/
sudo chmod -R g+r ./memgraph/
```

### Issue: "Operation not permitted" during bootstrap

**Solution:** Ensure Docker container user can write

```bash
# Check ownership
ls -la ./memgraph/

# Fix if needed
sudo chown -R 0:0 ./memgraph/
sudo chmod -R 777 ./memgraph/
```

---

## Development

### Project Structure

```
reactium-oracle/
├── src/
│   ├── index.ts              # MCP server implementation
│   ├── memgraph.ts           # Database connection
│   └── ...
├── scripts/
│   ├── bootstrap-from-claudedb.ts  # Knowledge extraction
│   └── ...
├── memgraph/                 # Database storage (Docker volume)
├── docker-compose.yml        # Container configuration
├── package.json
└── tsconfig.json
```

### Building

```bash
# Build TypeScript
bun run build

# Watch mode (rebuilds on file changes)
bun run dev
```

### Adding New Concepts

```typescript
// Use the MCP server directly or bootstrap script

// Option 1: Via MCP (programmatic)
const response = await mcp.callTool('kg_add_concept', {
  name: 'My New Concept',
  description: 'What it does',
  category: 'pattern',
});

// Option 2: Update bootstrap script to parse new documentation files
// Then re-run: bun scripts/bootstrap-from-claudedb.ts
```

---

## Next Steps

1. **[Start the server](#quick-start)** - Get your MCP server running
2. **Ask Claude questions** - Use the framework knowledge in your workflow
3. **Record sessions** - Persist discoveries in the graph database
4. **Explore relationships** - Use `kg_find_related` to discover patterns
5. **Extend documentation** - Add new concepts to CLAUDEDB for future discovery

---

## Resources

- **MCP Documentation**: [Model Context Protocol](https://modelcontextprotocol.io/)
- **Reactium Framework**: [Framework Documentation](../README.md)
- **CLAUDEDB**: Framework knowledge base in `../CLAUDEDB/`
- **Memgraph**: [Graph Database Documentation](https://memgraph.com/docs/)

---

## Questions & Support

For issues with:

- **MCP Server**: Check logs with `npm start` and review `src/index.ts`
- **Database**: Examine Memgraph logs: `docker logs memgraph-mage`
- **Bootstrap**: Verify CLAUDEDB files exist in `../CLAUDEDB/`
- **Framework Knowledge**: Browse `../CLAUDE/` documentation files

---

**Happy exploring! 🚀**
