# Reactium Framework - Known Issues & Technical Debt

**Last Updated:** November 21, 2025
**Maintained By:** Documentation Steward

This document tracks known issues, bugs, and technical debt in the Reactium framework codebase and documentation.

---

## Critical Issues

### 1. Example Code Uses Non-Existent `Enums.priority.normal`

**Severity:** High
**Status:** Documented, not fixed
**Identified:** November 21, 2025

**Issue:**
Many example files throughout the codebase use `Enums.priority.normal`, which does not exist in the source code. The actual enum only defines `Enums.priority.neutral`.

**Source of Truth:**
```typescript
// From reactium-sdk-core/src/core/enums.ts
export enum Priority {
    core = -2000,
    highest = -1000,
    high = -500,
    neutral = 0,      // ✅ Correct
    low = 500,
    lowest = 1000,
}
// Note: NO 'normal' property
```

**Affected Files (29+ total):**
```
example-reactium-project/src/app/components/HookTester/reactium-hooks-hooktester.js
example-reactium-project/src/app/components/AdvancedLoader/reactium-hooks-advancedloader.js
example-reactium-project/src/app/components/DataLoader/reactium-hooks-dataloader.js
example-reactium-project/src/app/components/TransitionPage/reactium-hooks-transitionpage.js
example-reactium-project/src/app/components/ExitingPage/reactium-hooks-exitingpage.js
example-reactium-project/src/app/components/FeatureTester/reactium-hooks-featuretester.js
example-reactium-project/src/app/components/UserDetail/reactium-hooks-userdetail.js
Reactium-GraphQL-Plugin/src/app/components/Dashboard/reactium-hooks-dashboard.js
Reactium-GraphQL-Plugin/src/app/components/Dashboard/User/UserList/reactium-hooks-userlist.js
Reactium-GraphQL-Plugin/src/app/components/Dashboard/Post/PostList/reactium-hooks-postlist.js
Reactium-GraphQL-Plugin/src/app/components/AppParent/reactium-hooks-appparent.js
Reactium-Admin-Plugins/src/app/components/plugin-src/syndicate/reactium-boot.js
Reactium-Admin-Plugins/src/app/components/plugin-src/syndicate-client/reactium-boot.js
Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/reactium-boot.js
Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-core/Blueprint/reactium-hooks.js
Reactium-Admin-Plugins/reactium_modules/@atomic-reactor/reactium-admin-content/ContentType/Plugins/Navigation/reactium-hooks.js
Reactium-Core-Plugins/src/app/components/TsTest/reactium-hooks-tstest.js
Reactium-Core-Plugins/src/app/components/Test/StateLoader/reactium-hooks-stateloader.js
```

**Also Affects CLI Templates:**
```
Reactium-Admin-Plugins/.core/.cli/commands/reactium/plugin/module/template/reactium-boot.hbs
Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/plugin/module/template/reactium-boot.hbs
Reactium-Core-Plugins/reactium_modules/@atomic-reactor/reactium-core/.cli/commands/reactium/component/template/reactium-hooks.hbs
```

**Impact:**
- Using `.normal` returns `undefined`
- `undefined` happens to evaluate to 0 in numeric sorting (same as `neutral`)
- This works accidentally but is fragile and could break in future versions
- Developers copying example code will propagate the bug

**Workaround:**
Always use `Enums.priority.neutral` in your code.

**Fix Required:**
1. Systematic search-and-replace across all affected files
2. Update CLI templates to generate correct code
3. Add linting rule to prevent future occurrences

**Documentation Status:**
- ✅ Documented in `CLAUDE/FRAMEWORK_GOTCHAS.md` (Gotcha 5)
- ✅ Warning added to `CLAUDE.md`
- ✅ Added to `FAQ.md` under "Known Issues"
- ✅ Noted in `CLAUDE/CURATION_REPORT_2025_11_21.md`

**Grep Command to Find All Instances:**
```bash
grep -r "priority\.normal" /home/john/reactium-framework/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"
```

---

## Documentation Issues

### 2. External Documentation May Be Outdated

**Severity:** Low
**Status:** Needs review

**Issue:**
Documentation files outside the `CLAUDE/` directory may contain outdated patterns or information:

**Files to Review:**
- `/example-reactium-project/REACTIUM_FRAMEWORK.md` - Contains `priority.normal` references
- `/example-reactium-project/GEMINI/*.md` - Unknown accuracy, needs verification
- `/DOCUMENTATION_HOOK_DOMAINS.md` - Now corrected, but is duplicate of CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md

**Recommendation:**
- Consolidate documentation into `CLAUDE/` directory
- Mark external docs as "may be outdated" with reference to canonical docs
- Or: Maintain external docs through automated sync

---

## Technical Debt

### 3. Duplicate Documentation Files

**Severity:** Low
**Status:** Informational

**Issue:**
Some documentation exists in multiple locations:

- Hook domains documented in both:
  - `/DOCUMENTATION_HOOK_DOMAINS.md` (root level)
  - `/CLAUDE/HOOK_DOMAINS_DEEP_DIVE.md` (canonical)

**Recommendation:**
- Establish `CLAUDE/` as canonical documentation location
- Root-level docs could be symlinks or contain "see CLAUDE/ for details" redirects
- Or: Delete duplicates and consolidate

---

## Framework Quirks (Not Bugs, But Watch Out)

### 4. Priority System Counter-Intuitive

**Severity:** N/A (by design)
**Status:** Documented

**Quirk:**
Lower priority numbers execute FIRST, which is counter-intuitive:

```javascript
Enums.priority.core = -2000      // Executes FIRST
Enums.priority.highest = -1000
Enums.priority.neutral = 0
Enums.priority.low = 500
Enums.priority.lowest = 1000     // Executes LAST
```

**Documentation:**
- Clearly explained in `CLAUDE.md`
- Covered in `CLAUDE/FRAMEWORK_GOTCHAS.md`
- FAQ includes examples

---

### 5. Manifest Auto-Regeneration Can Be Surprising

**Severity:** N/A (by design)
**Status:** Documented

**Quirk:**
During `npm run local`, adding/removing route/hook/domain files triggers automatic manifest regeneration. This can be surprising if you don't expect it.

**Documentation:**
- Explained in `CLAUDE.md` under "Manifest System"
- Covered in `CLAUDE/FRAMEWORK_GOTCHAS.md` (Gotcha 1)

---

### 6. Transition States Require Manual Progression

**Severity:** N/A (by design)
**Status:** Documented

**Quirk:**
Route transition states don't auto-advance. You must manually call `Reactium.Routing.nextState()`.

**Documentation:**
- Explained in `CLAUDE.md` under "Routing System"
- Detailed in `CLAUDE/FRAMEWORK_GOTCHAS.md` (Gotcha 7)
- Examples in `CLAUDE/FRAMEWORK_PATTERNS.md`

---

## Resolved Issues

### 7. REACTIUM_CONTEXT.md References Non-Existent Files

**Severity:** Low
**Status:** Resolved (November 22, 2025)

**Issue:**
`/CLAUDE/REACTIUM_CONTEXT.md` referenced non-existent architecture subdirectory files.

**Resolution:**
Updated REACTIUM_CONTEXT.md to serve as a directory index pointing to actual documentation files (REACTIUM_FRAMEWORK.md, FRAMEWORK_PATTERNS.md, etc.) rather than referencing non-existent architecture/* files.

---

## Issue Resolution Workflow

1. **Identify Issue:** Source code analysis, user reports, or documentation review
2. **Document Here:** Add to appropriate section with severity and status
3. **Create Fix Plan:** Define steps needed to resolve
4. **Implement Fix:** Update code, documentation, or both
5. **Verify Fix:** Source code verification against documentation
6. **Update Status:** Mark as resolved and document in curation report
7. **Remove or Archive:** Move to "Resolved Issues" section or remove entirely

---

## Resolved Issues

(None yet - this is the first tracked curation session)

---

## How to Report Issues

If you discover:
- Inaccuracies in documentation
- Source code that doesn't match documentation
- Missing documentation for features
- Bugs in example code
- Technical debt accumulation

**Add them to this file with:**
1. Clear title and severity
2. Description of the issue
3. Source code references
4. Impact analysis
5. Recommended fix
6. Documentation status

---

## Priority Definitions

- **Critical:** Breaks functionality or leads to runtime errors
- **High:** Could cause confusion, technical debt, or propagate bad patterns
- **Medium:** Quality of life, consistency, or maintainability issues
- **Low:** Nice-to-have improvements, minor inconsistencies

---

**End of Known Issues**
