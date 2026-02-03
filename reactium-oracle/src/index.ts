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
// APPLICATION TRACKING TOOLS
// ============================================

const applicationTools: Tool[] = [
  {
    name: 'app_create',
    description: 'Create or register an application for tracking',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique app ID (e.g., "ai-tradebot")' },
        name: { type: 'string', description: 'Application name' },
        description: { type: 'string', description: 'Application description' },
        rootPath: { type: 'string', description: 'Root directory path' },
      },
      required: ['id', 'name', 'description', 'rootPath'],
    },
  },

  {
    name: 'app_add_artifact',
    description: 'Add or update an artifact (file/component) in the application',
    inputSchema: {
      type: 'object',
      properties: {
        appId: { type: 'string', description: 'Application ID' },
        path: { type: 'string', description: 'File path (unique identifier)' },
        name: { type: 'string', description: 'Artifact name' },
        type: {
          type: 'string',
          enum: ['script', 'config', 'test', 'documentation', 'model', 'schema', 'service', 'component', 'utility', 'archive'],
          description: 'Type of artifact',
        },
        purpose: { type: 'string', description: 'Purpose/role of this artifact' },
        language: { type: 'string', description: 'Programming language (optional)' },
        status: {
          type: 'string',
          enum: ['active', 'deprecated', 'archived', 'test', 'temporary'],
          description: 'Current status (default: active)',
        },
        phaseId: { type: 'string', description: 'Phase this belongs to (optional)' },
        dependencies: { type: 'array', items: { type: 'string' }, description: 'List of file paths this depends on (optional)' },
        notes: { type: 'string', description: 'Additional notes (optional)' },
      },
      required: ['appId', 'path', 'name', 'type', 'purpose'],
    },
  },

  {
    name: 'app_update_artifact',
    description: 'Update an existing artifact status or properties',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Artifact path to update' },
        status: {
          type: 'string',
          enum: ['active', 'deprecated', 'archived', 'test', 'temporary'],
          description: 'New status',
        },
        purpose: { type: 'string', description: 'Updated purpose' },
        notes: { type: 'string', description: 'Updated notes' },
      },
      required: ['path'],
    },
  },

  {
    name: 'app_list_artifacts',
    description: 'List artifacts for an application with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        appId: { type: 'string', description: 'Application ID' },
        type: { type: 'string', description: 'Filter by artifact type (optional)' },
        status: { type: 'string', description: 'Filter by status (optional)' },
        phaseId: { type: 'string', description: 'Filter by phase (optional)' },
      },
      required: ['appId'],
    },
  },

  {
    name: 'app_add_phase',
    description: 'Add a development phase to the application',
    inputSchema: {
      type: 'object',
      properties: {
        appId: { type: 'string', description: 'Application ID' },
        id: { type: 'string', description: 'Phase ID' },
        name: { type: 'string', description: 'Phase name' },
        description: { type: 'string', description: 'Phase description' },
        order: { type: 'number', description: 'Order/sequence number' },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed', 'blocked'],
          description: 'Phase status',
        },
      },
      required: ['appId', 'id', 'name', 'description', 'order'],
    },
  },

  {
    name: 'app_get_overview',
    description: 'Get complete overview of application with all artifacts, phases, and stats',
    inputSchema: {
      type: 'object',
      properties: {
        appId: { type: 'string', description: 'Application ID' },
      },
      required: ['appId'],
    },
  },

  {
    name: 'app_find_outdated',
    description: 'Find potentially outdated or deprecated artifacts based on status and age',
    inputSchema: {
      type: 'object',
      properties: {
        appId: { type: 'string', description: 'Application ID' },
        olderThanDays: { type: 'number', description: 'Find artifacts older than N days (optional)' },
      },
      required: ['appId'],
    },
  },

  {
    name: 'app_add_component',
    description: 'Add an architectural component to the application',
    inputSchema: {
      type: 'object',
      properties: {
        appId: { type: 'string', description: 'Application ID' },
        id: { type: 'string', description: 'Component ID' },
        name: { type: 'string', description: 'Component name' },
        type: {
          type: 'string',
          enum: ['model', 'pipeline', 'service', 'api', 'database', 'feature', 'algorithm'],
          description: 'Component type',
        },
        description: { type: 'string', description: 'Component description' },
        status: {
          type: 'string',
          enum: ['planned', 'in_progress', 'implemented', 'deprecated'],
          description: 'Implementation status',
        },
      },
      required: ['appId', 'id', 'name', 'type', 'description'],
    },
  },

  // ============================================
  // GRAPH NAVIGATION TOOLS
  // ============================================

  {
    name: 'app_get_phase',
    description: 'Get single phase with its artifacts, components, and relationships',
    inputSchema: {
      type: 'object',
      properties: {
        phaseId: { type: 'string', description: 'Phase ID' },
      },
      required: ['phaseId'],
    },
  },

  {
    name: 'app_get_component',
    description: 'Get single component with implementing artifacts and relationships',
    inputSchema: {
      type: 'object',
      properties: {
        componentId: { type: 'string', description: 'Component ID' },
      },
      required: ['componentId'],
    },
  },

  {
    name: 'app_get_artifact',
    description: 'Get single artifact with dependencies, phases, components, and relationships',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Artifact path' },
      },
      required: ['path'],
    },
  },

  {
    name: 'app_search_artifacts',
    description: 'Search artifacts by keyword in name or purpose',
    inputSchema: {
      type: 'object',
      properties: {
        appId: { type: 'string', description: 'Application ID' },
        query: { type: 'string', description: 'Search term' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['appId', 'query'],
    },
  },

  {
    name: 'app_add_sequence',
    description: 'Add an execution/learning sequence to the application',
    inputSchema: {
      type: 'object',
      properties: {
        appId: { type: 'string', description: 'Application ID' },
        id: { type: 'string', description: 'Sequence ID' },
        name: { type: 'string', description: 'Sequence name' },
        description: { type: 'string', description: 'Sequence description' },
        type: {
          type: 'string',
          enum: ['execution', 'learning', 'implementation', 'troubleshooting'],
          description: 'Sequence type',
        },
        steps: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordered array of artifact paths or phase IDs',
        },
      },
      required: ['appId', 'id', 'name', 'description', 'type', 'steps'],
    },
  },

  {
    name: 'app_add_happy_path',
    description: 'Add a curated navigation path for specific intent',
    inputSchema: {
      type: 'object',
      properties: {
        appId: { type: 'string', description: 'Application ID' },
        id: { type: 'string', description: 'Happy path ID' },
        name: { type: 'string', description: 'Happy path name' },
        description: { type: 'string', description: 'Happy path description' },
        intent: { type: 'string', description: 'User intent this path serves' },
        artifacts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordered array of artifact paths',
        },
        estimatedTime: { type: 'string', description: 'Estimated time (optional)' },
      },
      required: ['appId', 'id', 'name', 'description', 'intent', 'artifacts'],
    },
  },

  {
    name: 'app_get_sequence',
    description: 'Get sequence with ordered steps and relationships',
    inputSchema: {
      type: 'object',
      properties: {
        sequenceId: { type: 'string', description: 'Sequence ID' },
      },
      required: ['sequenceId'],
    },
  },

  {
    name: 'app_get_happy_path',
    description: 'Get happy path with ordered artifacts and intent',
    inputSchema: {
      type: 'object',
      properties: {
        happyPathId: { type: 'string', description: 'Happy path ID' },
      },
      required: ['happyPathId'],
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

      // Application tracking tools
      case 'app_create': {
        const query = `
          MERGE (a:Application {id: $id})
          SET a.name = $name,
              a.description = $description,
              a.rootPath = $rootPath,
              a.status = 'active',
              a.createdAt = datetime(),
              a.updatedAt = datetime()
          RETURN a
        `;
        await executeQuery(query, {
          id: args.id,
          name: args.name,
          description: args.description,
          rootPath: args.rootPath,
        });
        return { success: true, appId: args.id };
      }

      case 'app_add_artifact': {
        const query = `
          MATCH (a:Application {id: $appId})
          MERGE (art:Artifact {path: $path})
          SET art.name = $name,
              art.type = $type,
              art.purpose = $purpose,
              art.language = $language,
              art.status = $status,
              art.dependencies = $dependencies,
              art.notes = $notes,
              art.updatedAt = datetime()
          MERGE (a)-[:HAS_ARTIFACT]->(art)
          WITH art, a
          OPTIONAL MATCH (p:Phase {id: $phaseId})<-[:HAS_PHASE]-(a)
          FOREACH (phase IN CASE WHEN p IS NOT NULL THEN [p] ELSE [] END |
            MERGE (art)-[:BELONGS_TO_PHASE]->(phase)
          )
          RETURN art
        `;
        await executeQuery(query, {
          appId: args.appId,
          path: args.path,
          name: args.name,
          type: args.type,
          purpose: args.purpose,
          language: args.language || null,
          status: args.status || 'active',
          dependencies: args.dependencies || [],
          notes: args.notes || '',
          phaseId: args.phaseId || null,
        });

        // Create DEPENDS_ON_ARTIFACT relationships from dependencies array
        const deps = args.dependencies || [];
        if (deps.length > 0) {
          const depQuery = `
            MATCH (art:Artifact {path: $path})
            OPTIONAL MATCH (art)-[oldDep:DEPENDS_ON_ARTIFACT]->()
            DELETE oldDep
            WITH art
            UNWIND $deps AS depPath
            MATCH (dep:Artifact {path: depPath})
            MERGE (art)-[:DEPENDS_ON_ARTIFACT]->(dep)
          `;
          await executeQuery(depQuery, { path: args.path, deps });
        }

        return { success: true, path: args.path };
      }

      case 'app_update_artifact': {
        const setParts: string[] = [];
        const params: Record<string, unknown> = { path: args.path };

        if (args.status) {
          setParts.push('art.status = $status');
          params.status = args.status;
        }
        if (args.purpose) {
          setParts.push('art.purpose = $purpose');
          params.purpose = args.purpose;
        }
        if (args.notes) {
          setParts.push('art.notes = $notes');
          params.notes = args.notes;
        }
        setParts.push('art.updatedAt = datetime()');

        const query = `
          MATCH (art:Artifact {path: $path})
          SET ${setParts.join(', ')}
          RETURN art
        `;
        await executeQuery(query, params);
        return { success: true, path: args.path };
      }

      case 'app_list_artifacts': {
        let query = 'MATCH (a:Application {id: $appId})-[:HAS_ARTIFACT]->(art:Artifact)';
        const params: Record<string, unknown> = { appId: args.appId };

        const whereClauses: string[] = [];
        if (args.type) {
          whereClauses.push('art.type = $type');
          params.type = args.type;
        }
        if (args.status) {
          whereClauses.push('art.status = $status');
          params.status = args.status;
        }
        if (args.phaseId) {
          query += ' MATCH (art)-[:BELONGS_TO_PHASE]->(p:Phase {id: $phaseId})';
          params.phaseId = args.phaseId;
        }

        if (whereClauses.length > 0) {
          query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ` RETURN art ORDER BY art.type, art.name`;

        const result = await executeQuery(query, params);
        return {
          artifacts: result.records.map((r) => r.get('art').properties),
          count: result.records.length,
        };
      }

      case 'app_add_phase': {
        const query = `
          MATCH (a:Application {id: $appId})
          CREATE (p:Phase {
            id: $id,
            name: $name,
            description: $description,
            order: $order,
            status: $status
          })
          CREATE (a)-[:HAS_PHASE]->(p)
          RETURN p
        `;
        await executeQuery(query, {
          appId: args.appId,
          id: args.id,
          name: args.name,
          description: args.description,
          order: args.order,
          status: args.status || 'pending',
        });
        return { success: true, phaseId: args.id };
      }

      case 'app_get_overview': {
        // Breadcrumb-based overview - returns links to graph nodes, not full data
        const query = `
          MATCH (a:Application {id: $appId})
          OPTIONAL MATCH (a)-[:HAS_PHASE]->(currentPhase:Phase {status: 'in_progress'})
          OPTIONAL MATCH (a)-[:HAS_PHASE]->(completedPhase:Phase {status: 'completed'})
          OPTIONAL MATCH (a)-[:HAS_PHASE]->(pendingPhase:Phase {status: 'pending'})
          OPTIONAL MATCH (a)-[:HAS_ARTIFACT]->(art:Artifact)
          OPTIONAL MATCH (a)-[:HAS_COMPONENT]->(comp:ArchitectureComponent {status: 'implemented'})
          OPTIONAL MATCH (a)-[:HAS_COMPONENT]->(plannedComp:ArchitectureComponent {status: 'planned'})
          OPTIONAL MATCH (a)-[:HAS_ARTIFACT]->(tempArt:Artifact {status: 'temporary'})
          OPTIONAL MATCH (a)-[:HAS_ARTIFACT]->(depArt:Artifact {status: 'deprecated'})
          OPTIONAL MATCH (a)-[:HAS_SEQUENCE]->(seq:Sequence)
          OPTIONAL MATCH (a)-[:HAS_HAPPY_PATH]->(hp:HappyPath)
          WITH a, currentPhase,
               collect(DISTINCT completedPhase.id) as completedPhaseIds,
               collect(DISTINCT pendingPhase.id) as pendingPhaseIds,
               collect(DISTINCT art) as allArtifacts,
               collect(DISTINCT comp.id) as implementedCompIds,
               collect(DISTINCT plannedComp.id) as plannedCompIds,
               collect(DISTINCT tempArt.path) as temporaryPaths,
               collect(DISTINCT depArt.path) as deprecatedPaths,
               collect(DISTINCT seq.id) as sequenceIds,
               collect(DISTINCT hp.id) as happyPathIds
          WITH a, currentPhase, completedPhaseIds, pendingPhaseIds, allArtifacts,
               implementedCompIds, plannedCompIds, temporaryPaths, deprecatedPaths,
               sequenceIds, happyPathIds
          OPTIONAL MATCH (a)-[:HAS_ARTIFACT]->(masterPlan:Artifact)
            WHERE masterPlan.name CONTAINS 'MASTER_PLAN'
          OPTIONAL MATCH (a)-[:HAS_ARTIFACT]->(archDoc:Artifact {name: 'CLAUDE.md'})
          RETURN
            a,
            currentPhase.id as currentPhaseId,
            currentPhase.name as currentPhaseName,
            currentPhase.order as currentPhaseOrder,
            completedPhaseIds,
            pendingPhaseIds,
            size([x IN allArtifacts WHERE x.status = 'active']) as activeCount,
            size([x IN allArtifacts WHERE x.status = 'archived']) as archivedCount,
            size([x IN allArtifacts WHERE x.type = 'documentation']) as docCount,
            size([x IN allArtifacts WHERE x.type = 'test']) as testCount,
            implementedCompIds,
            plannedCompIds,
            temporaryPaths,
            deprecatedPaths,
            masterPlan.path as masterPlanPath,
            archDoc.path as architecturePath,
            sequenceIds,
            happyPathIds
        `;
        const result = await executeQuery(query, { appId: args.appId });

        if (result.records.length === 0) {
          return { error: 'Application not found' };
        }

        const r = result.records[0];
        const app = r.get('a').properties;

        return {
          app: {
            id: app.id,
            name: app.name,
            currentPhase: r.get('currentPhaseId'),
            rootPath: app.rootPath,
          },
          phases: {
            current: r.get('currentPhaseId') ? [r.get('currentPhaseId')] : [],
            completed: r.get('completedPhaseIds').filter(Boolean),
            pending: r.get('pendingPhaseIds').filter(Boolean),
            currentName: r.get('currentPhaseName'),
            currentOrder: typeof r.get('currentPhaseOrder') === 'object' ? r.get('currentPhaseOrder').low : r.get('currentPhaseOrder'),
          },
          components: {
            implemented: r.get('implementedCompIds').filter(Boolean),
            planned: r.get('plannedCompIds').filter(Boolean),
          },
          artifacts: {
            active: typeof r.get('activeCount') === 'object' ? r.get('activeCount').low : r.get('activeCount'),
            archived: typeof r.get('archivedCount') === 'object' ? r.get('archivedCount').low : r.get('archivedCount'),
            documentation: typeof r.get('docCount') === 'object' ? r.get('docCount').low : r.get('docCount'),
            tests: typeof r.get('testCount') === 'object' ? r.get('testCount').low : r.get('testCount'),
          },
          keyArtifacts: {
            masterPlan: r.get('masterPlanPath'),
            architecture: r.get('architecturePath'),
          },
          concerns: {
            temporary: r.get('temporaryPaths').filter(Boolean),
            deprecated: r.get('deprecatedPaths').filter(Boolean),
          },
          navigation: {
            sequences: r.get('sequenceIds').filter(Boolean),
            happyPaths: r.get('happyPathIds').filter(Boolean),
          },
        };
      }

      case 'app_find_outdated': {
        let query = `
          MATCH (a:Application {id: $appId})-[:HAS_ARTIFACT]->(art:Artifact)
          WHERE art.status IN ['deprecated', 'test', 'temporary']
        `;
        const params: Record<string, unknown> = { appId: args.appId };

        if (args.olderThanDays) {
          query += ` AND art.updatedAt < datetime() - duration({days: $days})`;
          params.days = args.olderThanDays;
        }

        query += ` RETURN art ORDER BY art.updatedAt`;

        const result = await executeQuery(query, params);
        return {
          outdated: result.records.map((r) => r.get('art').properties),
          count: result.records.length,
        };
      }

      case 'app_add_component': {
        const query = `
          MATCH (a:Application {id: $appId})
          CREATE (c:ArchitectureComponent {
            id: $id,
            name: $name,
            type: $type,
            description: $description,
            status: $status,
            createdAt: datetime()
          })
          CREATE (a)-[:HAS_COMPONENT]->(c)
          RETURN c
        `;
        await executeQuery(query, {
          appId: args.appId,
          id: args.id,
          name: args.name,
          type: args.type,
          description: args.description,
          status: args.status || 'planned',
        });
        return { success: true, componentId: args.id };
      }

      // ============================================
      // GRAPH NAVIGATION HANDLERS
      // ============================================

      case 'app_get_phase': {
        const query = `
          MATCH (p:Phase {id: $phaseId})
          OPTIONAL MATCH (p)<-[:HAS_PHASE]-(a:Application)
          OPTIONAL MATCH (p)<-[:BELONGS_TO_PHASE]-(art:Artifact)
          OPTIONAL MATCH (p)-[:NEXT_PHASE]->(nextPhase:Phase)
          OPTIONAL MATCH (prevPhase:Phase)-[:NEXT_PHASE]->(p)
          OPTIONAL MATCH (art)-[:IMPLEMENTS_COMPONENT]->(comp:ArchitectureComponent)
          RETURN
            p,
            a.id as appId,
            collect(DISTINCT art.path) as artifactPaths,
            collect(DISTINCT comp.id) as componentIds,
            nextPhase.id as nextPhaseId,
            prevPhase.id as prevPhaseId
        `;
        const result = await executeQuery(query, { phaseId: args.phaseId });

        if (result.records.length === 0) {
          return { error: 'Phase not found' };
        }

        const r = result.records[0];
        const phase = r.get('p').properties;

        return {
          phase: {
            id: phase.id,
            name: phase.name,
            description: phase.description,
            order: typeof phase.order === 'object' ? phase.order.low : phase.order,
            status: phase.status,
          },
          appId: r.get('appId'),
          artifacts: r.get('artifactPaths').filter(Boolean),
          components: r.get('componentIds').filter(Boolean),
          navigation: {
            next: r.get('nextPhaseId'),
            prev: r.get('prevPhaseId'),
          },
        };
      }

      case 'app_get_component': {
        const query = `
          MATCH (c:ArchitectureComponent {id: $componentId})
          OPTIONAL MATCH (c)<-[:HAS_COMPONENT]-(a:Application)
          OPTIONAL MATCH (art:Artifact)-[:IMPLEMENTS_COMPONENT]->(c)
          OPTIONAL MATCH (c)<-[:PART_OF_SEQUENCE]-(seq:Sequence)
          OPTIONAL MATCH (dec:Decision)<-[:IMPLEMENTS_DECISION]-(c)
          OPTIONAL MATCH (doc:Artifact)-[:EXPLAINS]->(c)
          WHERE doc.type = 'documentation'
          RETURN
            c,
            a.id as appId,
            collect(DISTINCT art.path) as implementingPaths,
            collect(DISTINCT seq.id) as sequenceIds,
            collect(DISTINCT dec.id) as decisionIds,
            collect(DISTINCT doc.path) as documentationPaths
        `;
        const result = await executeQuery(query, { componentId: args.componentId });

        if (result.records.length === 0) {
          return { error: 'Component not found' };
        }

        const r = result.records[0];
        const comp = r.get('c').properties;

        return {
          component: {
            id: comp.id,
            name: comp.name,
            type: comp.type,
            description: comp.description,
            status: comp.status,
          },
          appId: r.get('appId'),
          implementedBy: r.get('implementingPaths').filter(Boolean),
          partOfSequences: r.get('sequenceIds').filter(Boolean),
          implementsDecisions: r.get('decisionIds').filter(Boolean),
          documentation: r.get('documentationPaths').filter(Boolean),
        };
      }

      case 'app_get_artifact': {
        const query = `
          MATCH (art:Artifact {path: $path})
          OPTIONAL MATCH (art)<-[:HAS_ARTIFACT]-(a:Application)
          OPTIONAL MATCH (art)-[:BELONGS_TO_PHASE]->(p:Phase)
          OPTIONAL MATCH (art)-[:IMPLEMENTS_COMPONENT]->(comp:ArchitectureComponent)
          OPTIONAL MATCH (art)-[:PART_OF_SEQUENCE]->(seq:Sequence)
          OPTIONAL MATCH (art)-[:PART_OF_HAPPY_PATH]->(hp:HappyPath)
          OPTIONAL MATCH (art)-[:DEPENDS_ON_ARTIFACT]->(dep:Artifact)
          OPTIONAL MATCH (dependent:Artifact)-[:DEPENDS_ON_ARTIFACT]->(art)
          OPTIONAL MATCH (art)-[:SUPERSEDES]->(old:Artifact)
          OPTIONAL MATCH (newer:Artifact)-[:SUPERSEDES]->(art)
          RETURN
            art,
            a.id as appId,
            p.id as phaseId,
            collect(DISTINCT comp.id) as componentIds,
            collect(DISTINCT seq.id) as sequenceIds,
            collect(DISTINCT hp.id) as happyPathIds,
            collect(DISTINCT dep.path) as dependencyPaths,
            collect(DISTINCT dependent.path) as dependentPaths,
            old.path as supersededPath,
            newer.path as supersededByPath
        `;
        const result = await executeQuery(query, { path: args.path });

        if (result.records.length === 0) {
          return { error: 'Artifact not found' };
        }

        const r = result.records[0];
        const art = r.get('art').properties;

        return {
          artifact: {
            path: art.path,
            name: art.name,
            type: art.type,
            purpose: art.purpose,
            status: art.status,
            language: art.language,
            notes: art.notes,
          },
          appId: r.get('appId'),
          phase: r.get('phaseId'),
          implements: r.get('componentIds').filter(Boolean),
          partOfSequences: r.get('sequenceIds').filter(Boolean),
          partOfHappyPaths: r.get('happyPathIds').filter(Boolean),
          dependencies: r.get('dependencyPaths').filter(Boolean),
          dependents: r.get('dependentPaths').filter(Boolean),
          superseded: r.get('supersededPath'),
          supersededBy: r.get('supersededByPath'),
        };
      }

      case 'app_search_artifacts': {
        const limit = parseInt(args.limit || 10, 10);
        const query = `
          MATCH (a:Application {id: $appId})-[:HAS_ARTIFACT]->(art:Artifact)
          WHERE toLower(art.name) CONTAINS toLower($query)
             OR toLower(art.purpose) CONTAINS toLower($query)
          RETURN art.path as path, art.name as name, art.purpose as purpose, art.type as type, art.status as status
          ORDER BY
            CASE WHEN toLower(art.name) CONTAINS toLower($query) THEN 1 ELSE 2 END,
            art.name
          LIMIT toInteger($limit)
        `;
        const result = await executeQuery(query, {
          appId: args.appId,
          query: args.query,
          limit,
        });

        return {
          results: result.records.map((r) => ({
            path: r.get('path'),
            name: r.get('name'),
            purpose: r.get('purpose'),
            type: r.get('type'),
            status: r.get('status'),
          })),
          count: result.records.length,
        };
      }

      case 'app_add_sequence': {
        const query = `
          MATCH (a:Application {id: $appId})
          CREATE (s:Sequence {
            id: $id,
            name: $name,
            description: $description,
            type: $type,
            createdAt: datetime()
          })
          CREATE (a)-[:HAS_SEQUENCE]->(s)
          WITH s
          UNWIND range(0, size($steps) - 1) as idx
          WITH s, idx, $steps[idx] as stepPath
          OPTIONAL MATCH (art:Artifact {path: stepPath})
          OPTIONAL MATCH (p:Phase {id: stepPath})
          WITH s, idx, art, p
          WHERE art IS NOT NULL OR p IS NOT NULL
          FOREACH (_ IN CASE WHEN art IS NOT NULL THEN [1] ELSE [] END |
            CREATE (s)<-[:PART_OF_SEQUENCE {order: idx}]-(art)
          )
          FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
            CREATE (s)<-[:PART_OF_SEQUENCE {order: idx}]-(p)
          )
          RETURN s
        `;
        await executeQuery(query, {
          appId: args.appId,
          id: args.id,
          name: args.name,
          description: args.description,
          type: args.type,
          steps: args.steps,
        });
        return { success: true, sequenceId: args.id };
      }

      case 'app_add_happy_path': {
        const query = `
          MATCH (a:Application {id: $appId})
          CREATE (hp:HappyPath {
            id: $id,
            name: $name,
            description: $description,
            intent: $intent,
            estimatedTime: $estimatedTime,
            createdAt: datetime()
          })
          CREATE (a)-[:HAS_HAPPY_PATH]->(hp)
          WITH hp
          UNWIND range(0, size($artifacts) - 1) as idx
          WITH hp, idx, $artifacts[idx] as artPath
          MATCH (art:Artifact {path: artPath})
          CREATE (art)-[:PART_OF_HAPPY_PATH {order: idx}]->(hp)
          RETURN hp
        `;
        await executeQuery(query, {
          appId: args.appId,
          id: args.id,
          name: args.name,
          description: args.description,
          intent: args.intent,
          estimatedTime: args.estimatedTime || null,
          artifacts: args.artifacts,
        });
        return { success: true, happyPathId: args.id };
      }

      case 'app_get_sequence': {
        const query = `
          MATCH (s:Sequence {id: $sequenceId})
          OPTIONAL MATCH (s)<-[:HAS_SEQUENCE]-(a:Application)
          OPTIONAL MATCH (step)-[r:PART_OF_SEQUENCE]->(s)
          WITH s, a, step, r
          ORDER BY r.order
          WITH s, a, collect({
            type: labels(step)[0],
            id: CASE
              WHEN step:Artifact THEN step.path
              WHEN step:Phase THEN step.id
              ELSE null
            END,
            order: toInteger(r.order)
          }) as steps
          RETURN s, a.id as appId, steps
        `;
        const result = await executeQuery(query, { sequenceId: args.sequenceId });

        if (result.records.length === 0) {
          return { error: 'Sequence not found' };
        }

        const r = result.records[0];
        const seq = r.get('s').properties;
        const steps = r.get('steps').filter((s: any) => s.id);

        return {
          sequence: {
            id: seq.id,
            name: seq.name,
            description: seq.description,
            type: seq.type,
          },
          appId: r.get('appId'),
          steps: steps.map((s: any) => ({
            type: s.type,
            id: s.id,
            order: typeof s.order === 'object' ? s.order.low : s.order,
          })),
        };
      }

      case 'app_get_happy_path': {
        const query = `
          MATCH (hp:HappyPath {id: $happyPathId})
          OPTIONAL MATCH (hp)<-[:HAS_HAPPY_PATH]-(a:Application)
          OPTIONAL MATCH (art:Artifact)-[r:PART_OF_HAPPY_PATH]->(hp)
          WITH hp, a, art, r
          ORDER BY r.order
          WITH hp, a, collect({
            path: art.path,
            name: art.name,
            order: toInteger(r.order)
          }) as artifacts
          RETURN hp, a.id as appId, artifacts
        `;
        const result = await executeQuery(query, { happyPathId: args.happyPathId });

        if (result.records.length === 0) {
          return { error: 'Happy path not found' };
        }

        const r = result.records[0];
        const hp = r.get('hp').properties;
        const artifacts = r.get('artifacts').filter((a: any) => a.path);

        return {
          happyPath: {
            id: hp.id,
            name: hp.name,
            description: hp.description,
            intent: hp.intent,
            estimatedTime: hp.estimatedTime,
          },
          appId: r.get('appId'),
          artifacts: artifacts.map((a: any) => ({
            path: a.path,
            name: a.name,
            order: typeof a.order === 'object' ? a.order.low : a.order,
          })),
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
      ...applicationTools,
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
