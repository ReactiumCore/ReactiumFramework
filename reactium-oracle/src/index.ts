/**
 * MCP Server for Reactium Oracle (TypeScript)
 *
 * Provides tools for Claude to:
 * 1. Query and build the Knowledge Graph
 * 2. Record and retrieve Session Memory
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { QueryResult } from 'neo4j-driver';
import { initializeMemgraph, closeMemgraph, executeQuery } from './memgraph.js';

// Create server with tools capability
const server = new Server(
  {
    name: 'reactium-oracle',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize Memgraph on startup
await initializeMemgraph();

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface ToolCallRequest {
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface ToolCallResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

// ============================================
// KNOWLEDGE GRAPH TOOLS
// ============================================

const knowledgeGraphTools: Tool[] = [
  {
    name: 'kg_add_concept',
    description: 'Add a concept to the knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Concept name (e.g., "Hook System")',
        },
        description: { type: 'string', description: 'What this concept is' },
        category: {
          type: 'string',
          enum: ['core-system', 'pattern', 'tool', 'plugin', 'utility'],
          description: 'Category of concept',
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Related keywords',
        },
      },
      required: ['name', 'description', 'category'],
    },
  },

  {
    name: 'kg_add_function',
    description: 'Add a function to the knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Function name (e.g., "Hook.register")',
        },
        signature: { type: 'string', description: 'Function signature' },
        description: { type: 'string', description: 'What the function does' },
        parameters: {
          type: 'array',
          items: { type: 'string' },
          description: 'Parameter descriptions',
        },
        returnType: { type: 'string', description: 'Return type' },
        isAsync: { type: 'boolean', description: 'Is this an async function?' },
      },
      required: ['name', 'signature', 'description'],
    },
  },

  {
    name: 'kg_relate_concepts',
    description: 'Create a relationship between concepts',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Source concept name' },
        to: { type: 'string', description: 'Target concept name' },
        type: {
          type: 'string',
          enum: ['DEPENDS_ON', 'USES', 'PART_OF', 'RELATES_TO', 'EXTENDS'],
          description: 'Type of relationship',
        },
      },
      required: ['from', 'to', 'type'],
    },
  },

  {
    name: 'kg_query',
    description: 'Query the knowledge graph with Cypher',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Cypher query' },
        params: { type: 'object', description: 'Query parameters' },
      },
      required: ['query'],
    },
  },

  {
    name: 'kg_list_concepts',
    description:
      'List all concepts in the knowledge graph with their categories',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description:
            'Optional filter by category (core-system, pattern, tool, plugin, utility)',
        },
      },
    },
  },
];

// ============================================
// SESSION MEMORY TOOLS
// ============================================

const sessionMemoryTools: Tool[] = [
  {
    name: 'session_start',
    description: 'Start a new session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Unique session identifier' },
        title: { type: 'string', description: 'Session title' },
        context: { type: 'string', description: 'Initial context' },
      },
      required: ['sessionId', 'title'],
    },
  },

  {
    name: 'session_record_decision',
    description: 'Record a decision made during the session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        decision: { type: 'string', description: 'The decision made' },
        reasoning: {
          type: 'string',
          description: 'Why this decision was made',
        },
        alternatives: {
          type: 'array',
          items: { type: 'string' },
          description: 'Other options considered',
        },
      },
      required: ['sessionId', 'decision', 'reasoning'],
    },
  },

  {
    name: 'session_record_blocker',
    description: 'Record a blocker encountered',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        blocker: { type: 'string', description: 'What is blocking progress' },
        impact: { type: 'string', description: 'Impact on work' },
        suggestedResolution: {
          type: 'string',
          description: 'Potential resolution (optional)',
        },
      },
      required: ['sessionId', 'blocker', 'impact'],
    },
  },

  {
    name: 'session_record_change',
    description: 'Record a code change or file modification',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        filePath: { type: 'string', description: 'File path modified' },
        changeType: {
          type: 'string',
          enum: ['created', 'modified', 'deleted'],
          description: 'Type of change',
        },
        description: { type: 'string', description: 'What changed and why' },
        relatedConcept: {
          type: 'string',
          description: 'Related concept from KG (optional)',
        },
      },
      required: ['sessionId', 'filePath', 'changeType', 'description'],
    },
  },

  {
    name: 'session_record_question',
    description: 'Record a question that arose',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        question: { type: 'string', description: 'The question' },
        context: { type: 'string', description: 'Context and details' },
        relatedConcept: {
          type: 'string',
          description: 'Related concept from KG (optional)',
        },
      },
      required: ['sessionId', 'question', 'context'],
    },
  },

  {
    name: 'session_get_state',
    description: 'Get the current session state',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
      },
      required: ['sessionId'],
    },
  },

  {
    name: 'session_finalize',
    description: 'Finalize and close a session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        summary: { type: 'string', description: 'Session summary' },
        status: {
          type: 'string',
          enum: ['completed', 'abandoned'],
          description: 'Final status',
        },
      },
      required: ['sessionId', 'status'],
    },
  },

  {
    name: 'session_list',
    description: 'List recent sessions, optionally filtered by status',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'completed', 'abandoned'],
          description: 'Optional filter by session status',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of sessions to return (default 10)',
        },
      },
    },
  },
];

// ============================================
// CONCEPT DISCOVERY TOOLS (NEW)
// ============================================

const conceptDiscoveryTools: Tool[] = [
  {
    name: 'kg_find_related',
    description:
      'Find concepts related to a given concept through relationships',
    inputSchema: {
      type: 'object',
      properties: {
        conceptName: {
          type: 'string',
          description: 'The concept to find relations for',
        },
        depth: {
          type: 'number',
          description:
            'How many relationship hops to traverse (default 1, max 3)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 20)',
        },
      },
      required: ['conceptName'],
    },
  },

  {
    name: 'kg_search_concept',
    description: 'Search for concepts by name or description',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term (matches names and descriptions)',
        },
        category: {
          type: 'string',
          enum: ['core-system', 'pattern', 'tool', 'plugin', 'utility'],
          description: 'Optional category filter',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 10)',
        },
      },
      required: ['query'],
    },
  },
];

// ============================================
// TOOL HANDLERS
// ============================================

async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    switch (name) {
      // Knowledge Graph tools
      case 'kg_add_concept': {
        const query = `
          CREATE (c:Concept {
            name: $name,
            description: $description,
            category: $category,
            keywords: $keywords,
            createdAt: datetime()
          })
          RETURN c
        `;
        const result = await executeQuery(query, {
          name: args.name,
          description: args.description,
          category: args.category,
          keywords: args.keywords || [],
        });
        const conceptId = result.records[0]?.get('c').identity.toString();
        return { success: true, conceptId, name: args.name };
      }

      case 'kg_add_function': {
        const query = `
          CREATE (f:Function {
            name: $name,
            signature: $signature,
            description: $description,
            parameters: $parameters,
            returnType: $returnType,
            isAsync: $isAsync,
            createdAt: datetime()
          })
          RETURN f
        `;
        const result = await executeQuery(query, {
          name: args.name,
          signature: args.signature,
          description: args.description,
          parameters: args.parameters || [],
          returnType: args.returnType || 'unknown',
          isAsync: args.isAsync || false,
        });
        const functionId = result.records[0]?.get('f').identity.toString();
        return { success: true, functionId, name: args.name };
      }

      case 'kg_relate_concepts': {
        const query = `
          MATCH (from:Concept {name: $from})
          MATCH (to:Concept {name: $to})
          CREATE (from)-[r:${args.type}]->(to)
          RETURN r
        `;
        await executeQuery(query, { from: args.from, to: args.to });
        return {
          success: true,
          relationship: `${args.from} -[${args.type}]-> ${args.to}`,
        };
      }

      case 'kg_query': {
        const result = await executeQuery(
          args.query as string,
          (args.params as Record<string, unknown>) || {}
        );
        return {
          records: result.records.map((r) => r.toObject()),
          summary: result.summary.counters.updates(),
        };
      }

      case 'kg_list_concepts': {
        let query =
          'MATCH (c:Concept) RETURN c.name as name, c.category as category, c.description as description ORDER BY c.category, c.name';
        const params: Record<string, unknown> = {};

        if (args.category) {
          query =
            'MATCH (c:Concept {category: $category}) RETURN c.name as name, c.category as category, c.description as description ORDER BY c.name';
          params.category = args.category;
        }

        const result = await executeQuery(query, params);
        return {
          concepts: result.records.map((r) => ({
            name: r.get('name'),
            category: r.get('category'),
            description: r.get('description'),
          })),
          count: result.records.length,
        };
      }

      // Session Memory tools
      case 'session_start': {
        const query = `
          CREATE (s:Session {
            id: $sessionId,
            title: $title,
            context: $context,
            startTime: datetime(),
            status: 'active'
          })
          RETURN s
        `;
        await executeQuery(query, {
          sessionId: args.sessionId,
          title: args.title,
          context: args.context || '',
        });
        return { success: true, sessionId: args.sessionId };
      }

      case 'session_record_decision': {
        const query = `
          MATCH (s:Session {id: $sessionId})
          CREATE (d:Decision {
            text: $decision,
            reasoning: $reasoning,
            alternatives: $alternatives,
            timestamp: datetime()
          })
          CREATE (s)-[:MADE_DECISION]->(d)
          RETURN d.id
        `;
        const result = await executeQuery(query, {
          sessionId: args.sessionId,
          decision: args.decision,
          reasoning: args.reasoning,
          alternatives: args.alternatives || [],
        });
        const decisionId = result.records[0]?.get('d.id');
        return { success: true, decisionId };
      }

      case 'session_record_blocker': {
        const query = `
          MATCH (s:Session {id: $sessionId})
          CREATE (b:Blocker {
            text: $blocker,
            impact: $impact,
            suggestedResolution: $suggestedResolution,
            timestamp: datetime(),
            resolved: false
          })
          CREATE (s)-[:BLOCKED_ON]->(b)
          RETURN b.id
        `;
        const result = await executeQuery(query, {
          sessionId: args.sessionId,
          blocker: args.blocker,
          impact: args.impact,
          suggestedResolution: args.suggestedResolution || '',
        });
        const blockerId = result.records[0]?.get('b.id');
        return { success: true, blockerId };
      }

      case 'session_record_change': {
        const query = `
          MATCH (s:Session {id: $sessionId})
          CREATE (c:Change {
            filePath: $filePath,
            changeType: $changeType,
            description: $description,
            timestamp: datetime()
          })
          CREATE (s)-[:CHANGED]->(c)
          RETURN c.id
        `;
        const result = await executeQuery(query, {
          sessionId: args.sessionId,
          filePath: args.filePath,
          changeType: args.changeType,
          description: args.description,
        });
        const changeId = result.records[0]?.get('c.id');
        return { success: true, changeId };
      }

      case 'session_record_question': {
        const query = `
          MATCH (s:Session {id: $sessionId})
          CREATE (q:Question {
            text: $question,
            context: $context,
            timestamp: datetime()
          })
          CREATE (s)-[:QUESTIONED]->(q)
          RETURN q.id
        `;
        const result = await executeQuery(query, {
          sessionId: args.sessionId,
          question: args.question,
          context: args.context,
        });
        const questionId = result.records[0]?.get('q.id');
        return { success: true, questionId };
      }

      case 'session_get_state': {
        const query = `
          MATCH (s:Session {id: $sessionId})
          OPTIONAL MATCH (s)-[:MADE_DECISION]->(d:Decision)
          OPTIONAL MATCH (s)-[:BLOCKED_ON]->(b:Blocker)
          OPTIONAL MATCH (s)-[:CHANGED]->(c:Change)
          OPTIONAL MATCH (s)-[:QUESTIONED]->(q:Question)
          RETURN {
            session: s,
            decisions: collect(d),
            blockers: collect(b),
            changes: collect(c),
            questions: collect(q)
          } as state
        `;
        const result = await executeQuery(query, { sessionId: args.sessionId });
        if (result.records.length === 0) {
          return { error: 'Session not found' };
        }
        return result.records[0].toObject();
      }

      case 'session_finalize': {
        const query = `
          MATCH (s:Session {id: $sessionId})
          SET s.status = $status, s.endTime = datetime(), s.summary = $summary
          RETURN s
        `;
        await executeQuery(query, {
          sessionId: args.sessionId,
          status: args.status,
          summary: args.summary || '',
        });
        return { success: true, status: args.status };
      }

      case 'session_list': {
        const limit = Math.max(1, parseInt(String(args.limit || 10), 10));
        let query = `
          MATCH (s:Session)
          RETURN s.id as id, s.title as title, s.status as status, s.startTime as startTime, s.summary as summary
          ORDER BY s.startTime DESC
          LIMIT ${limit}
        `;
        const params: Record<string, unknown> = {};

        if (args.status) {
          query = `
            MATCH (s:Session {status: $status})
            RETURN s.id as id, s.title as title, s.status as status, s.startTime as startTime, s.summary as summary
            ORDER BY s.startTime DESC
            LIMIT ${limit}
          `;
          params.status = args.status;
        }

        const result = await executeQuery(query, params);
        return {
          sessions: result.records.map((r) => ({
            id: r.get('id'),
            title: r.get('title'),
            status: r.get('status'),
            startTime: r.get('startTime'),
            summary: r.get('summary'),
          })),
          count: result.records.length,
        };
      }

      // Concept Discovery Tools
      case 'kg_find_related': {
        const depth = Math.min((args.depth as number) || 1, 3);
        const limit = Math.max(1, parseInt(String(args.limit || 20), 10));
        let relationPath = '-[*1..1]-';
        if (depth > 1) {
          relationPath = `-[*1..${depth}]-`;
        }

        const query = `
          MATCH (c1:Concept)
          WHERE toLower(c1.name) = toLower($conceptName)
          MATCH (c1)${relationPath}(c2:Concept)
          WHERE c1 <> c2
          RETURN DISTINCT
            c2.name as name,
            c2.description as description,
            c2.category as category
          LIMIT ${limit}
        `;

        try {
          const result = await executeQuery(query, {
            conceptName: args.conceptName,
          });

          return {
            conceptName: args.conceptName,
            relatedConcepts: result.records.map((r) => ({
              name: r.get('name'),
              description: r.get('description'),
              category: r.get('category'),
            })),
            count: result.records.length,
          };
        } catch {
          return { error: `Concept "${args.conceptName}" not found` };
        }
      }

      case 'kg_search_concept': {
        const limit = Math.max(1, parseInt(String(args.limit || 10), 10));
        let query = `
          MATCH (c:Concept)
          WHERE 
            toLower(c.name) CONTAINS toLower($query)
            OR toLower(c.description) CONTAINS toLower($query)
        `;

        const params: Record<string, unknown> = {
          query: args.query,
        };

        if (args.category) {
          query += ` AND c.category = $category`;
          params.category = args.category;
        }

        query += `
          RETURN
            c.name as name,
            c.description as description,
            c.category as category,
            c.docFile as docFile,
            c.anchor as anchor
          LIMIT ${limit}
        `;

        const result = await executeQuery(query, params);

        return {
          query: args.query,
          results: result.records.map((r) => ({
            name: r.get('name'),
            description: r.get('description'),
            category: r.get('category'),
            docFile: r.get('docFile'),
            anchor: r.get('anchor'),
          })),
          count: result.records.length,
        };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Error in ${name}:`, msg);
    return { error: msg };
  }
}

// ============================================
// MCP SERVER SETUP
// ============================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      ...knowledgeGraphTools,
      ...sessionMemoryTools,
      ...conceptDiscoveryTools,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const result = await handleToolCall(
    request.params.name,
    request.params.arguments || {}
  );
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});

// ============================================
// START SERVER
// ============================================

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Reactium Oracle MCP Server started on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down...');
  await closeMemgraph();
  process.exit(0);
});
