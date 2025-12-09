/**
 * Schema Definition for Reactium Oracle
 *
 * Two separate graphs:
 * 1. Knowledge Graph - persistent framework knowledge
 * 2. Session Memory Graph - ephemeral session-specific memory
 */

interface PropertySchema {
  type: string;
  required?: boolean;
  unique?: boolean;
  enum?: string[];
  default?: string | boolean;
}

interface NodeSchema {
  label: string;
  properties: Record<string, PropertySchema>;
  indexes: string[];
}

export const SCHEMA: {
  nodes: Record<string, NodeSchema>;
  relationships: Record<string, string>;
} = {
  // ============================================
  // KNOWLEDGE GRAPH NODES
  // ============================================
  nodes: {
    Concept: {
      label: 'Concept',
      properties: {
        name: { type: 'String', required: true, unique: true },
        description: { type: 'String', required: true },
        category: { type: 'String' },
        relatedKeywords: { type: 'String[]' },
        createdAt: { type: 'DateTime', default: 'now()' },
        updatedAt: { type: 'DateTime', default: 'now()' },
      },
      indexes: ['name', 'category'],
    },

    Function: {
      label: 'Function',
      properties: {
        name: { type: 'String', required: true, unique: true },
        signature: { type: 'String', required: true },
        description: { type: 'String' },
        parameters: { type: 'String[]' },
        returnType: { type: 'String' },
        isAsync: { type: 'Boolean', default: false },
        examples: { type: 'String[]' },
        createdAt: { type: 'DateTime', default: 'now()' },
      },
      indexes: ['name'],
    },

    File: {
      label: 'File',
      properties: {
        path: { type: 'String', required: true, unique: true },
        type: { type: 'String' },
        lastModified: { type: 'DateTime' },
        lineCount: { type: 'Integer' },
        isDocumentation: { type: 'Boolean', default: false },
      },
      indexes: ['path', 'type'],
    },

    Section: {
      label: 'Section',
      properties: {
        anchor: { type: 'String', required: true },
        title: { type: 'String', required: true },
        startLine: { type: 'Integer' },
        endLine: { type: 'Integer' },
        description: { type: 'String' },
      },
      indexes: ['anchor'],
    },

    // ============================================
    // SESSION MEMORY GRAPH NODES
    // ============================================
    Session: {
      label: 'Session',
      properties: {
        id: { type: 'String', required: true, unique: true },
        startTime: { type: 'DateTime', required: true, default: 'now()' },
        endTime: { type: 'DateTime' },
        focus: { type: 'String', required: true },
        status: {
          type: 'String',
          enum: ['active', 'completed', 'abandoned'],
          default: 'active',
        },
        summary: { type: 'String' },
        tags: { type: 'String[]' },
      },
      indexes: ['id', 'status', 'startTime'],
    },

    Decision: {
      label: 'Decision',
      properties: {
        id: { type: 'String', required: true, unique: true },
        decision: { type: 'String', required: true },
        reasoning: { type: 'String', required: true },
        alternatives: { type: 'String[]' },
        confidence: { type: 'Float' },
        timestamp: { type: 'DateTime', default: 'now()' },
      },
      indexes: ['id'],
    },

    Blocker: {
      label: 'Blocker',
      properties: {
        id: { type: 'String', required: true, unique: true },
        issue: { type: 'String', required: true },
        context: { type: 'String', required: true },
        severity: {
          type: 'String',
          enum: ['low', 'medium', 'high'],
          default: 'medium',
        },
        timestamp: { type: 'DateTime', default: 'now()' },
        resolved: { type: 'Boolean', default: false },
        resolution: { type: 'String' },
      },
      indexes: ['id', 'resolved'],
    },

    Change: {
      label: 'Change',
      properties: {
        id: { type: 'String', required: true, unique: true },
        file: { type: 'String', required: true },
        description: { type: 'String', required: true },
        reason: { type: 'String', required: true },
        linesModified: { type: 'String' },
        timestamp: { type: 'DateTime', default: 'now()' },
      },
      indexes: ['id', 'file'],
    },

    Question: {
      label: 'Question',
      properties: {
        id: { type: 'String', required: true, unique: true },
        question: { type: 'String', required: true },
        context: { type: 'String', required: true },
        timestamp: { type: 'DateTime', default: 'now()' },
        answered: { type: 'Boolean', default: false },
        answer: { type: 'String' },
      },
      indexes: ['id', 'answered'],
    },

    Focus: {
      label: 'Focus',
      properties: {
        id: { type: 'String', required: true, unique: true },
        area: { type: 'String', required: true },
        priority: { type: 'Integer' },
        description: { type: 'String' },
      },
      indexes: ['id'],
    },
  },

  // ============================================
  // RELATIONSHIP TYPES
  // ============================================
  relationships: {
    PART_OF: 'Function or Concept is part of another Concept',
    DEPENDS_ON: 'Concept or Function depends on another',
    USES: 'Concept or Function uses another',
    DOCUMENTED_IN: 'Node is documented in a File/Section',
    DEFINED_IN: 'Function is defined in a File at specific lines',
    EXAMPLE_IN: 'Example of Concept/Function exists in File',
    RELATES_TO: 'General relationship between Concepts',
    EXTENDS: 'Concept extends another',
    IMPLEMENTS: 'Concept implements a pattern',

    DISCOVERED: 'Session discovered a KG node',
    MODIFIED: 'Session modified a KG node or File',
    MADE_DECISION: 'Session made a Decision about a KG node',
    BLOCKED_ON: 'Session is blocked by an issue',
    CHANGED: 'Session changed a File',
    QUESTIONED: 'Session raised a Question about a KG node',
    IS_FOCUSED_ON: 'Session is focused on a node/area',
    RELATED_TO: 'Session artifacts are related',
    RESOLVED: 'Session resolved a Blocker',
  },
};

// ============================================
// CYPHER INITIALIZATION QUERIES
// ============================================
export const INITIALIZATION_QUERIES: string[] = [
  `CREATE CONSTRAINT ON (c:Concept) ASSERT c.name IS UNIQUE;`,
  `CREATE CONSTRAINT ON (f:Function) ASSERT f.name IS UNIQUE;`,
  `CREATE CONSTRAINT ON (file:File) ASSERT file.path IS UNIQUE;`,
  `CREATE CONSTRAINT ON (s:Session) ASSERT s.id IS UNIQUE;`,
  `CREATE CONSTRAINT ON (d:Decision) ASSERT d.id IS UNIQUE;`,
  `CREATE CONSTRAINT ON (b:Blocker) ASSERT b.id IS UNIQUE;`,
  `CREATE CONSTRAINT ON (c:Change) ASSERT c.id IS UNIQUE;`,
  `CREATE CONSTRAINT ON (q:Question) ASSERT q.id IS UNIQUE;`,

  `CREATE INDEX ON :Concept(category);`,
  `CREATE INDEX ON :Concept(createdAt);`,
  `CREATE INDEX ON :Function(name);`,
  `CREATE INDEX ON :File(type);`,
  `CREATE INDEX ON :Session(status);`,
  `CREATE INDEX ON :Session(startTime);`,
  `CREATE INDEX ON :Blocker(resolved);`,
  `CREATE INDEX ON :Question(answered);`,
];

export const BOOTSTRAP_QUERIES: string[] = [];
