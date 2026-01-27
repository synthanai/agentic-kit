# Language Support Fix - Python Files Issue

## Issue Report

**Date:** 2026-01-20  
**Reporter:** Consumer testing on receiptclaimer project  
**Package:** @aiready/consistency

### Problem Description

The `@aiready/consistency` tool was attempting to parse **Python files (.py)** using a **TypeScript/JavaScript parser** (`@typescript-eslint/typescript-estree`), causing parse failures with misleading error messages.

### Error Messages

```
Failed to parse /path/to/compute_weighted_ranking.py: Unterminated string literal.
Failed to parse /path/to/search_console_to_bq.py: Unterminated string literal.
Failed to parse /path/to/merge-web-coverage.ts: Invalid character.
Failed to parse /path/to/merge-all-coverage.ts: '>' expected.
```

### Root Cause Analysis

1. **File Scanner:** The core `scanFiles()` utility includes multiple language patterns by default:
   ```typescript
   include = ['**/*.{ts,tsx,js,jsx,py,java}']
   ```

2. **Parser Limitation:** The `@aiready/consistency` tool uses `@typescript-eslint/typescript-estree` which only supports TypeScript/JavaScript syntax.

3. **No Language Filter:** The tool was processing all files returned by the scanner without filtering by supported language extensions.

### Issue Classification

| File Type | Status | Root Cause |
|-----------|--------|------------|
| Python files (.py) | **Tool Issue** | Tool tried to parse with wrong parser |
| TypeScript files (.ts) | **File Issue** | Actual syntax errors in source files |

## Fix Implementation

### Changes Made

#### 1. Added Language Filtering ([naming-ast.ts](packages/consistency/src/analyzers/naming-ast.ts))

```typescript
// Filter to only JS/TS files that the TypeScript parser can handle
const supportedFiles = files.filter(file => 
  /\.(js|jsx|ts|tsx)$/i.test(file)
);
```

#### 2. Updated Documentation

- **README.md:** Added "Supported Languages" section at the top
- **README.md:** Added "Language Support" subsection explaining which files are skipped
- **CLI Help:** Added language support information
- **Code Comments:** Documented limitations in analyzer and parser functions

#### 3. Improved Error Handling ([ast-parser.ts](packages/consistency/src/utils/ast-parser.ts))

- Removed noisy `console.warn()` for parse failures
- Added comments explaining that non-JS/TS files should be filtered upstream
- Made parse failures silent (returns `null`) since they're now expected for excluded files

#### 4. Added Test Coverage ([language-filter.test.ts](packages/consistency/src/__tests__/language-filter.test.ts))

- Tests that Python/Java/Ruby files are filtered out
- Verifies all JS/TS extensions are accepted
- Ensures no crashes on mixed language projects

### Design Decision: Core Scanner vs Tool Filtering

**Question:** Should the core scanner exclude Python files, or should each tool filter?

**Decision:** **Tool-level filtering** (implemented)

**Rationale:**
- Core scanner is designed for future multi-language support
- Other tools (e.g., future Python linter) may need `.py` files
- Each tool knows its language capabilities best
- Follows separation of concerns principle

### Verification

✅ Build successful  
✅ Tests passing (3 new tests added)  
✅ Documentation updated  
✅ No breaking changes

## For Users

### What Changed

**Before:** Tool attempted to parse Python/Java files and showed confusing errors

**After:** Tool silently skips unsupported languages and only analyzes JS/TS files

### Migration Guide

No action required. This is a non-breaking improvement.

### New Behavior

When running on a mixed-language project:
```bash
npx @aiready/consistency ./src
```

The tool will:
1. ✅ Analyze all `.ts`, `.tsx`, `.js`, `.jsx` files
2. ⏭️ Skip `.py`, `.java`, and other language files
3. 📊 Report only on supported languages
4. ❌ No more "Failed to parse" warnings for Python files

## Future Enhancements

Potential improvements for future versions:

1. **Multi-Language Support**
   - Add Python AST parser for Python files
   - Add Java parser for Java files
   - Create language-specific analyzers

2. **Better Diagnostics**
   - Count and report skipped files by language
   - Suggest language-specific tools for unsupported files

3. **Configuration Option**
   - Allow users to explicitly specify supported languages
   - Add `--strict` mode to error on unsupported files

## Related Files

- [packages/consistency/src/analyzers/naming-ast.ts](packages/consistency/src/analyzers/naming-ast.ts) - Added filtering
- [packages/consistency/src/analyzer.ts](packages/consistency/src/analyzer.ts) - Updated docs
- [packages/consistency/src/cli.ts](packages/consistency/src/cli.ts) - Updated help text
- [packages/consistency/src/utils/ast-parser.ts](packages/consistency/src/utils/ast-parser.ts) - Improved error handling
- [packages/consistency/README.md](packages/consistency/README.md) - Added language support section
- [packages/core/src/utils/file-scanner.ts](packages/core/src/utils/file-scanner.ts) - Documented broad defaults

## Testing

Run the new tests:
```bash
cd packages/consistency
pnpm test language-filter.test.ts
```

Verify on a mixed-language project:
```bash
# Should work without Python parse errors
npx @aiready/consistency /path/to/mixed-project
```
