/**
 * Bootstrap Knowledge Graph from CLAUDEDB files
 * Uses remark AST parser for robust markdown parsing
 * Processes: INDEX.md (concepts), CONCEPTS.md (learning paths), API.md (functions)
 *
 * Usage: bun scripts/bootstrap-from-claudedb.ts
 */

import { readFileSync, existsSync } from 'fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import {
  initializeMemgraph,
  closeMemgraph,
  executeQuery,
} from '../src/memgraph.js';

interface ConceptEntry {
  name: string;
  category: string;
  description: string;
  docFile: string;
  anchor: string;
}

interface LearningPath {
  topic: string;
  steps: Array<{ title: string; link: string; description: string }>;
  relatedConcepts: string[];
}

interface FunctionDef {
  name: string;
  signature: string;
  description: string;
  docFile: string;
  anchor: string;
  isAsync: boolean;
  parameters: string[];
  returnType: string;
}

/**
 * Parse CONCEPTS.md to extract learning paths
 */
function parseConceptsFile(filePath: string): LearningPath[] {
  if (!existsSync(filePath)) {
    console.log(`⊘ ${filePath} not found, skipping...`);
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  const processor = unified().use(remarkParse);
  const ast = processor.parse(content);

  const paths: LearningPath[] = [];
  let currentTopic = '';
  let currentSteps: Array<{
    title: string;
    link: string;
    description: string;
  }> = [];
  let currentRelated: string[] = [];

  function walkNode(node: any): void {
    if (!node) return;

    // H3 headers are topics (### Topic Name)
    if (node.type === 'heading' && node.depth === 3) {
      // Save previous topic if exists
      if (currentTopic && currentSteps.length > 0) {
        paths.push({
          topic: currentTopic,
          steps: currentSteps,
          relatedConcepts: currentRelated,
        });
      }
      // Start new topic
      if (node.children?.[0]?.type === 'text') {
        currentTopic = node.children[0].value.trim();
        currentSteps = [];
        currentRelated = [];
      }
    }

    // List items can contain learning steps
    if (node.type === 'listItem' && currentTopic) {
      const paragraph = node.children?.find((c: any) => c.type === 'paragraph');
      if (paragraph?.children) {
        for (const child of paragraph.children) {
          if (
            child.type === 'link' &&
            child.url &&
            child.children?.[0]?.type === 'text'
          ) {
            const title = child.children[0].value.trim();
            const link = child.url;
            const desc = extractDescriptionAfterLink(paragraph, child);
            currentSteps.push({ title, link, description: desc });
          }
        }
      }
    }

    // **Related**: line contains related concepts
    if (node.type === 'paragraph' && currentTopic) {
      const text = extractFullText(node);
      if (text.startsWith('Related:')) {
        const related = text
          .replace('Related:', '')
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s);
        currentRelated = related;
      }
    }

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(walkNode);
    }
  }

  walkNode(ast);

  // Save last topic
  if (currentTopic && currentSteps.length > 0) {
    paths.push({
      topic: currentTopic,
      steps: currentSteps,
      relatedConcepts: currentRelated,
    });
  }

  return paths;
}

function extractDescriptionAfterLink(paragraph: any, linkNode: any): string {
  let foundLink = false;
  let description = '';

  for (const child of paragraph.children) {
    if (child === linkNode) {
      foundLink = true;
      continue;
    }
    if (foundLink && child.type === 'text') {
      const text = child.value.trim();
      if (text.startsWith('-')) {
        description = text.replace(/^-\s*/, '').trim();
        break;
      }
    }
  }

  return description;
}

function extractFullText(node: any): string {
  if (!node.children) return '';
  return node.children
    .map((child: any) => {
      if (child.type === 'text') return child.value;
      if (child.type === 'strong' && child.children?.[0]?.type === 'text') {
        return child.children[0].value;
      }
      return '';
    })
    .join('')
    .trim();
}

/**
 * Parse API.md to extract function definitions
 */
function parseApiFile(filePath: string): FunctionDef[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  const processor = unified().use(remarkParse);
  const ast = processor.parse(content);

  const functions: FunctionDef[] = [];
  let currentFunctionName = '';
  let currentSignature = '';
  let currentDescription = '';
  let isAsync = false;

  function walkNode(node: any): void {
    if (!node) return;

    // Look for code blocks with function signatures (```typescript or ```javascript)
    if (
      node.type === 'code' &&
      (node.lang === 'typescript' || node.lang === 'javascript')
    ) {
      const code = node.value;
      // Try to extract function signature
      const funcMatch = code.match(
        /^(async\s+)?function\s+(\w+)\s*\((.*?)\)\s*(?::\s*(.+?))?(?:\s*\{|$)/m
      );
      if (funcMatch) {
        currentFunctionName = funcMatch[2];
        isAsync = !!funcMatch[1];
        const paramsStr = funcMatch[3];
        currentSignature = code.split('\n')[0]; // First line is signature
        currentDescription = ''; // Will be populated from paragraph before code block
      }
    }

    // Paragraphs before code blocks often contain descriptions
    if (node.type === 'paragraph' && currentFunctionName) {
      const text = extractFullText(node);
      if (!currentDescription && text.length > 10) {
        currentDescription = text.slice(0, 200); // Limit description
      }
    }

    // H3 headers can indicate new function sections
    if (node.type === 'heading' && node.depth === 3) {
      // Save previous function if exists
      if (currentFunctionName && currentSignature) {
        functions.push({
          name: currentFunctionName,
          signature: currentSignature,
          description: currentDescription || 'Function definition from API.md',
          docFile: 'API',
          anchor: currentFunctionName.toLowerCase(),
          isAsync,
          parameters: [],
          returnType: 'any',
        });
      }

      // Reset for new function
      const heading = node.children?.find((c: any) => c.type === 'text');
      if (heading?.value) {
        currentFunctionName = heading.value.trim();
        currentSignature = '';
        currentDescription = '';
        isAsync = false;
      }
    }

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(walkNode);
    }
  }

  walkNode(ast);

  // Save last function
  if (currentFunctionName && currentSignature) {
    functions.push({
      name: currentFunctionName,
      signature: currentSignature,
      description: currentDescription || 'Function definition from API.md',
      docFile: 'API',
      anchor: currentFunctionName.toLowerCase(),
      isAsync,
      parameters: [],
      returnType: 'any',
    });
  }

  return functions;
}

/**
 * Parse INDEX.md using remark AST
 */
function parseIndexFile(filePath: string): ConceptEntry[] {
  const content = readFileSync(filePath, 'utf-8');

  const processor = unified().use(remarkParse);
  const ast = processor.parse(content);

  const concepts: ConceptEntry[] = [];

  // Walk through AST to find list items with links
  function walkNode(node: any): void {
    if (!node) return;

    if (node.type === 'listItem') {
      // List item contains paragraph with text and link
      const paragraph = node.children?.find((c: any) => c.type === 'paragraph');
      if (paragraph) {
        const conceptEntry = parseListItem(paragraph);
        if (conceptEntry) {
          concepts.push(conceptEntry);
        }
      }
    }

    // Recurse into children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(walkNode);
    }
  }

  walkNode(ast);
  return concepts;
}

/**
 * Parse a single list item paragraph to extract concept details
 */
function parseListItem(paragraph: any): ConceptEntry | null {
  if (!paragraph.children || paragraph.children.length === 0) {
    return null;
  }

  let name = '';
  let description = '';
  let docFile = '';
  let anchor = '';

  // Extract text and link from paragraph children
  for (const child of paragraph.children) {
    if (child.type === 'strong' && child.children) {
      // Bold text contains the concept name
      const textChild = child.children.find((c: any) => c.type === 'text');
      if (textChild) {
        name = textChild.value?.trim() || '';
      }
    } else if (child.type === 'link' && child.url) {
      // Link contains [Description](path#anchor)
      description = child.title || '';

      // Parse URL to extract file and anchor
      const urlMatch = child.url.match(/\.\.\/CLAUDE\/([^#]+)\.md#(.+)$/);
      if (urlMatch) {
        docFile = urlMatch[1];
        anchor = urlMatch[2];
      }

      // If no title, use link text as description
      if (!description && child.children) {
        const textChild = child.children.find((c: any) => c.type === 'text');
        if (textChild) {
          description = textChild.value?.trim() || '';
        }
      }
    }
  }

  if (name && description && docFile && anchor) {
    const category = inferCategory(name, description, docFile);
    return { name, category, description, docFile, anchor };
  }

  return null;
}

/**
 * Infer concept category based on name, description, or source file
 */
function inferCategory(
  name: string,
  description: string,
  docFile: string
): string {
  const combined = `${name} ${description} ${docFile}`.toLowerCase();

  // Core systems
  if (
    combined.includes('hook') ||
    combined.includes('system') ||
    combined.includes('complete reference') ||
    combined.includes('architecture')
  ) {
    return 'core-system';
  }

  // Patterns
  if (
    combined.includes('pattern') ||
    combined.includes('lifecycle') ||
    combined.includes('workflow') ||
    combined.includes('actionsequence')
  ) {
    return 'pattern';
  }

  // Tools/CLI
  if (
    combined.includes('cli') ||
    combined.includes('command') ||
    combined.includes('arcli') ||
    combined.includes('webpack') ||
    combined.includes('gulp')
  ) {
    return 'tool';
  }

  // Plugins
  if (
    combined.includes('plugin') ||
    combined.includes('extensibility') ||
    combined.includes('field_type')
  ) {
    return 'plugin';
  }

  // Default to utility
  return 'utility';
}

/**
 * Insert concept into graph database
 */
async function insertConcept(concept: ConceptEntry): Promise<void> {
  const query = `
    CREATE (c:Concept {
      name: $name,
      description: $description,
      category: $category,
      docFile: $docFile,
      anchor: $anchor,
      createdAt: datetime()
    })
    RETURN c
  `;

  try {
    await executeQuery(query, {
      name: concept.name,
      description: concept.description,
      category: concept.category,
      docFile: concept.docFile,
      anchor: concept.anchor,
    });
  } catch (error) {
    // Ignore unique constraint violations (duplicate concepts)
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes('UNIQUE') && !msg.includes('already exists')) {
      console.error(`Error inserting concept ${concept.name}:`, msg);
    }
  }
}

/**
 * Insert function definition into graph database
 */
async function insertFunction(func: FunctionDef): Promise<void> {
  const query = `
    CREATE (f:Function {
      name: $name,
      signature: $signature,
      description: $description,
      docFile: $docFile,
      anchor: $anchor,
      isAsync: $isAsync,
      createdAt: datetime()
    })
    RETURN f
  `;

  try {
    await executeQuery(query, {
      name: func.name,
      signature: func.signature,
      description: func.description,
      docFile: func.docFile,
      anchor: func.anchor,
      isAsync: func.isAsync,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes('UNIQUE') && !msg.includes('already exists')) {
      // Silently skip functions that fail to insert
    }
  }
}

/**
 * Create relationships between concepts based on naming patterns
 */
async function createConceptRelationships(): Promise<void> {
  // Example: Link concepts that mention each other in their names/descriptions
  const query = `
    MATCH (c1:Concept), (c2:Concept)
    WHERE c1.name CONTAINS c2.name 
      AND c1.name <> c2.name
      AND length(c2.name) > 5
    CREATE (c1)-[:RELATES_TO]->(c2)
    RETURN COUNT(*) as created
  `;

  try {
    const result = await executeQuery(query);
    const created = result.records[0]?.get('created')?.low || 0;
    if (created > 0) {
      console.log(`✓ Created ${created} concept relationships`);
    }
  } catch (error) {
    // Silently skip if relationships already exist
  }
}

/**
 * Main bootstrap function
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 Bootstrapping Knowledge Graph from CLAUDEDB files...\n');

    await initializeMemgraph();

    const claudedbPath = '/home/john/reactium-framework/CLAUDEDB';
    let totalConcepts = 0;

    // Process INDEX.md - Main concept index
    console.log('📖 Processing INDEX.md (concept index)...');
    const indexPath = `${claudedbPath}/INDEX.md`;
    const concepts = parseIndexFile(indexPath);
    console.log(`✓ Found ${concepts.length} concepts`);

    const byCat = concepts.reduce(
      (acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('📊 Concepts by category:');
    Object.entries(byCat).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });

    // Insert all concepts from INDEX.md
    console.log('\n💾 Inserting INDEX.md concepts...');
    let inserted = 0;
    let skipped = 0;

    for (const concept of concepts) {
      try {
        await insertConcept(concept);
        inserted++;
      } catch (error) {
        skipped++;
      }
    }

    console.log(`✓ Inserted ${inserted}, skipped ${skipped} duplicates`);
    totalConcepts = inserted;

    // Process CONCEPTS.md - Learning paths (future: create relationships)
    console.log('\n📖 Processing CONCEPTS.md (learning paths)...');
    const conceptsPath = `${claudedbPath}/CONCEPTS.md`;
    const learningPaths = parseConceptsFile(conceptsPath);
    console.log(`✓ Found ${learningPaths.length} learning paths`);

    // Log some stats about learning paths
    const totalSteps = learningPaths.reduce(
      (sum, lp) => sum + lp.steps.length,
      0
    );
    console.log(`   Total learning steps: ${totalSteps}`);

    // Process API.md - Function definitions
    console.log('\n📖 Processing API.md (function definitions)...');
    const apiPath = `${claudedbPath}/API.md`;
    const functions = parseApiFile(apiPath);
    console.log(`✓ Found ${functions.length} function definitions`);

    // Insert functions
    console.log('\n💾 Inserting function definitions...');
    let functionsInserted = 0;
    for (const func of functions) {
      await insertFunction(func);
      functionsInserted++;
    }
    if (functionsInserted > 0) {
      console.log(`✓ Inserted ${functionsInserted} function definitions`);
    }

    // Create relationships between concepts
    console.log('\n🔗 Creating concept relationships...');
    await createConceptRelationships();

    // Process TASKS.md (log presence for future use)
    console.log('\n📖 Checking TASKS.md...');
    const tasksPath = `${claudedbPath}/TASKS.md`;
    if (existsSync(tasksPath)) {
      const taskLines = readFileSync(tasksPath, 'utf-8').split('\n').length;
      console.log(
        `✓ TASKS.md found (${taskLines} lines) - available for task extraction`
      );
    }

    // Verify final state
    const verifyQuery =
      'MATCH (n) RETURN DISTINCT labels(n) as type, COUNT(n) as count ORDER BY count DESC';
    const result = await executeQuery(verifyQuery);

    console.log(`\n✨ Knowledge Graph Bootstrap Complete!\n`);

    result.records.forEach((record: any) => {
      const type = record.get('type')[0] || 'Unknown';
      const count = record.get('count')?.low || 0;
      console.log(`📈 ${type}s in graph: ${count}`);
    });

    console.log(`\n📚 Learning paths indexed: ${learningPaths.length}`);
    console.log(`💻 Function definitions extracted: ${functions.length}`);
    console.log(`\n✅ Graph is ready for Claude CLI context queries!`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('✗ Error during bootstrap:', msg);
    process.exit(1);
  } finally {
    await closeMemgraph();
  }
}

main();
