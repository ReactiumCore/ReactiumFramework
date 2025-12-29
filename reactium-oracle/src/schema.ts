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

    // ============================================
    // APPLICATION TRACKING NODES
    // ============================================
    Application: {
      label: 'Application',
      properties: {
        id: { type: 'String', required: true, unique: true },
        name: { type: 'String', required: true },
        description: { type: 'String', required: true },
        rootPath: { type: 'String', required: true },
        status: {
          type: 'String',
          enum: ['active', 'paused', 'archived'],
          default: 'active',
        },
        currentPhase: { type: 'String' },
        createdAt: { type: 'DateTime', default: 'now()' },
        updatedAt: { type: 'DateTime', default: 'now()' },
        metadata: { type: 'Map' },
      },
      indexes: ['id', 'name', 'status'],
    },

    Artifact: {
      label: 'Artifact',
      properties: {
        path: { type: 'String', required: true, unique: true },
        name: { type: 'String', required: true },
        type: {
          type: 'String',
          enum: [
            'script',
            'config',
            'test',
            'documentation',
            'model',
            'schema',
            'service',
            'component',
            'utility',
            'archive',
          ],
          required: true,
        },
        purpose: { type: 'String', required: true },
        language: { type: 'String' },
        status: {
          type: 'String',
          enum: ['active', 'deprecated', 'archived', 'test', 'temporary'],
          default: 'active',
        },
        createdAt: { type: 'DateTime', default: 'now()' },
        updatedAt: { type: 'DateTime', default: 'now()' },
        lastModified: { type: 'DateTime' },
        createdBy: { type: 'String' },
        dependencies: { type: 'String[]' },
        notes: { type: 'String' },
      },
      indexes: ['path', 'type', 'status'],
    },

    Phase: {
      label: 'Phase',
      properties: {
        id: { type: 'String', required: true, unique: true },
        name: { type: 'String', required: true },
        description: { type: 'String', required: true },
        order: { type: 'Integer', required: true },
        status: {
          type: 'String',
          enum: ['pending', 'in_progress', 'completed', 'blocked'],
          default: 'pending',
        },
        startDate: { type: 'DateTime' },
        endDate: { type: 'DateTime' },
        successCriteria: { type: 'String[]' },
        blockers: { type: 'String[]' },
      },
      indexes: ['id', 'order', 'status'],
    },

    ArchitectureComponent: {
      label: 'ArchitectureComponent',
      properties: {
        id: { type: 'String', required: true, unique: true },
        name: { type: 'String', required: true },
        type: {
          type: 'String',
          enum: [
            'model',
            'pipeline',
            'service',
            'api',
            'database',
            'feature',
            'algorithm',
          ],
          required: true,
        },
        description: { type: 'String', required: true },
        purpose: { type: 'String' },
        status: {
          type: 'String',
          enum: ['planned', 'in_progress', 'implemented', 'deprecated'],
          default: 'planned',
        },
        implementation: { type: 'String[]' },
        createdAt: { type: 'DateTime', default: 'now()' },
      },
      indexes: ['id', 'type', 'status'],
    },

    // ============================================
    // NAVIGATION & KNOWLEDGE STRUCTURE NODES
    // ============================================
    Sequence: {
      label: 'Sequence',
      properties: {
        id: { type: 'String', required: true, unique: true },
        name: { type: 'String', required: true },
        description: { type: 'String', required: true },
        type: {
          type: 'String',
          enum: ['execution', 'learning', 'implementation', 'troubleshooting'],
          required: true,
        },
        order: { type: 'Integer' },
        createdAt: { type: 'DateTime', default: 'now()' },
      },
      indexes: ['id', 'type'],
    },

    HappyPath: {
      label: 'HappyPath',
      properties: {
        id: { type: 'String', required: true, unique: true },
        name: { type: 'String', required: true },
        description: { type: 'String', required: true },
        intent: { type: 'String', required: true },
        estimatedTime: { type: 'String' },
        createdAt: { type: 'DateTime', default: 'now()' },
      },
      indexes: ['id', 'intent'],
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

    // Application tracking relationships
    HAS_ARTIFACT: 'Application contains this artifact',
    HAS_PHASE: 'Application has this development phase',
    HAS_COMPONENT: 'Application has this architecture component',
    BELONGS_TO_PHASE: 'Artifact belongs to this phase',
    IMPLEMENTS_COMPONENT: 'Artifact implements this component',
    DEPENDS_ON_ARTIFACT: 'Artifact depends on another artifact',
    SUPERSEDES: 'Artifact supersedes/replaces another artifact',
    NEXT_PHASE: 'Phase follows this phase',
    CREATED_ARTIFACT: 'Session created this artifact',
    MODIFIED_ARTIFACT: 'Session modified this artifact',
    ARCHIVED_ARTIFACT: 'Session archived this artifact',

    // Navigation & knowledge structure relationships
    HAS_SEQUENCE: 'Application has this sequence',
    HAS_HAPPY_PATH: 'Application has this happy path',
    NEXT_STEP: 'Next step in sequence (ordered)',
    PREREQUISITE: 'Required before this step',
    PART_OF_SEQUENCE: 'Artifact/Phase/Component is part of sequence',
    PART_OF_HAPPY_PATH: 'Artifact/Phase/Component is part of happy path',
    EXPLAINS: 'Artifact explains Decision/Concept/Component',
    IMPLEMENTS_DECISION: 'Artifact/Component implements this decision',
    DOCUMENTS_SEQUENCE: 'Artifact documents this sequence',
    DOCUMENTS_HAPPY_PATH: 'Artifact documents this happy path',
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

  // Application tracking constraints
  `CREATE CONSTRAINT ON (a:Application) ASSERT a.id IS UNIQUE;`,
  `CREATE CONSTRAINT ON (art:Artifact) ASSERT art.path IS UNIQUE;`,
  `CREATE CONSTRAINT ON (p:Phase) ASSERT p.id IS UNIQUE;`,
  `CREATE CONSTRAINT ON (ac:ArchitectureComponent) ASSERT ac.id IS UNIQUE;`,

  `CREATE INDEX ON :Application(status);`,
  `CREATE INDEX ON :Application(name);`,
  `CREATE INDEX ON :Artifact(type);`,
  `CREATE INDEX ON :Artifact(status);`,
  `CREATE INDEX ON :Phase(order);`,
  `CREATE INDEX ON :Phase(status);`,
  `CREATE INDEX ON :ArchitectureComponent(type);`,
  `CREATE INDEX ON :ArchitectureComponent(status);`,

  // Navigation & knowledge structure constraints
  `CREATE CONSTRAINT ON (seq:Sequence) ASSERT seq.id IS UNIQUE;`,
  `CREATE CONSTRAINT ON (hp:HappyPath) ASSERT hp.id IS UNIQUE;`,

  `CREATE INDEX ON :Sequence(type);`,
  `CREATE INDEX ON :HappyPath(intent);`,
];

export const BOOTSTRAP_QUERIES: string[] = [];
