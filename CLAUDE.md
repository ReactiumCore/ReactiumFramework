# CLAUDE.md - AI Assistant Bootstrap

**Target Audience**: Claude AI working as a Reactium/Actinium developer
**Purpose**: Minimal bootstrap → comprehensive CLAUDEDB documentation system

---

## 🎯 Quick Navigation System

**START HERE** when answering any question about this framework:

### For Instant Answers (O(1) Lookup)

- **[CLAUDEDB/INDEX.md](./CLAUDEDB/INDEX.md)** - Keyword → direct section links (100+ terms)
- **[CLAUDEDB/TASKS.md](./CLAUDEDB/TASKS.md)** - "How do I..." → implementation guides (60+ tasks)
- **[CLAUDEDB/CONCEPTS.md](./CLAUDEDB/CONCEPTS.md)** - Concept → learning paths (25+ topics)
- **[CLAUDEDB/API.md](./CLAUDEDB/API.md)** - Function signatures + docs (60+ APIs)

### Your Workflow

1. User asks question
2. Check CLAUDEDB for relevant keyword/task/concept/API
3. Get direct link to answer in CLAUDE/ documentation
4. Read ONLY that specific section (not entire files)
5. Answer with reference

**Example**:

- User: "How do I create a route with data loading?"
- You: Check CLAUDEDB/TASKS.md → find task → read linked section → answer

**Efficiency**: Instead of reading 3-4 full files (1000s of lines), read ONE section (50-100 lines).

---

## 🏗️ Monorepo Structure

```
reactium-framework/
├── CLAUDEDB/              # ← YOUR NAVIGATION SYSTEM (start here)
├── CLAUDE/                # ← Comprehensive documentation (20+ guides)
├── Actinium-Plugins/      # Backend plugins
├── Reactium-Core-Plugins/ # Frontend core plugins
├── reactium-sdk-core/     # Shared SDK package
├── CLI/                   # CLI tools (npx reactium)
└── example-reactium-project/ # Reference implementation
```

## 📚 Documentation Structure

### CLAUDEDB/ (Navigation Layer)

- **INDEX.md** - Alphabetical keyword lookup
- **TASKS.md** - Task-based organization ("I want to...")
- **CONCEPTS.md** - Learning paths (basic → advanced)
- **API.md** - Function signatures + parameter docs
- **README.md** - How to use CLAUDEDB
- **VERIFICATION.md** - Link integrity tests

---

## 📖 When to Use Each CLAUDEDB File

| File            | Use When                       | Example                                |
| --------------- | ------------------------------ | -------------------------------------- |
| **INDEX.md**    | User asks "What is X?"         | "What are Capabilities?"               |
| **TASKS.md**    | User asks "How do I X?"        | "How do I create a route?"             |
| **CONCEPTS.md** | User wants to learn/understand | "Explain the Hook System"              |
| **API.md**      | User needs function signature  | "What params does Hook.register take?" |

---

## 📝 Quick Reference Links

- [Keyword Index](./CLAUDEDB/INDEX.md)
- [Task Guide](./CLAUDEDB/TASKS.md)
- [Concept Map](./CLAUDEDB/CONCEPTS.md)
- [API Reference](./CLAUDEDB/API.md)
- [Framework Patterns](./CLAUDE/FRAMEWORK_PATTERNS.md)
- [Common Gotchas](./CLAUDE/FRAMEWORK_GOTCHAS.md)
- [Known Issues](./CLAUDE/KNOWN_ISSUES.md)

**You are now bootstrapped. Start with CLAUDEDB for every question.**
