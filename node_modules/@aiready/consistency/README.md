# @aiready/consistency

> **Detect consistency issues in naming, patterns, and architecture that confuse AI models**

Helps teams maintain consistent coding practices across their codebase, making it easier for AI tools to understand and work with your code.

**Supported Languages:** TypeScript, JavaScript (`.ts`, `.tsx`, `.js`, `.jsx`)

> **Note:** Python, Java, and other language files in your project will be safely ignored during analysis.

## 🚀 Quick Start

**Zero config, works out of the box:**

```bash
# Run without installation (recommended)
npx @aiready/consistency ./src

# Or use the unified CLI (includes all AIReady tools)
npx @aiready/cli scan ./src

# Or install globally for simpler command and faster runs
npm install -g @aiready/consistency
aiready-consistency ./src
```

### 🎯 Input & Output

**Input:** Path to your source code directory
```bash
aiready-consistency ./src
```

**Output:** Terminal report + optional JSON file (saved to `.aiready/` directory)
```
📊 Consistency Analysis
━━━━━━━━━━━━━━━━━━━━━━━━
📁 Files analyzed: 47
⚠️  Issues found: 15 naming + 8 pattern issues

CRITICAL (2 files)
  src/utils/helpers.ts:12 - poor-naming: x
  src/api/users.ts:45 - convention-mix: user_name
```

### ✨ Smart Defaults (Zero Config)

- ✅ **Auto-excludes** test files (`**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`)
- ✅ **Auto-excludes** build outputs (`dist/`, `build/`, `.next/`)
- ✅ **Auto-excludes** dependencies (`node_modules/`)
- ✅ **Context-aware**: Skips common iterators (i, j, k) in loops
- ✅ **100+ built-in** acceptable abbreviations (env, api, url, ctx, etc.)
- ✅ **Smart detection**: Recognizes arrow functions, factory patterns, callbacks

> Override defaults with `--include-tests` or `--exclude <patterns>` as needed

## 🎯 What It Does

Inconsistent code patterns confuse AI models and reduce their effectiveness. This tool analyzes:

### 🔧 Language Support

**Fully Supported:**
- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)

**Not Yet Supported:**
- Python (`.py`) - Files will be skipped
- Java (`.java`) - Files will be skipped
- Other languages - Files will be skipped

If you see "Failed to parse" warnings for non-JS/TS files, this is expected behavior and won't affect the analysis of your JavaScript/TypeScript code.

### 🏷️ Naming Quality & Conventions
- **Single-letter variables** - Detects unclear variable names (skips common iterators: i, j, k, l, x, y, z in appropriate contexts)
- **Abbreviations** - Identifies unclear abbreviations while allowing 60+ standard ones (env, req, res, ctx, max, min, etc.)
- **Mixed naming conventions** - Detects snake_case in TypeScript/JavaScript projects (should use camelCase)
- **Boolean naming** - Ensures booleans use clear prefixes (is/has/can/should)
- **Function naming** - Checks for action verbs while allowing factory patterns and descriptive names

**Smart Detection:** The tool understands context and won't flag:
- Common abbreviations (env, api, url, max, min, now, etc.) - 100+ built-in
- Boolean prefixes (is, has, can used as variables)
- Loop iterators (i, j, k) in appropriate contexts
- Arrow function parameters in callbacks (`.map(s => ...)`)
- Multi-line arrow functions (detects across 3-5 line context)
- Short-lived comparison variables (used within 5 lines)
- Factory/builder patterns
- Long descriptive function names
- Project-specific abbreviations via configuration

### 🔄 Pattern Consistency
- **Error handling strategies** - Detects mixed approaches (try-catch vs returns vs throws)
- **Async patterns** - Identifies mixing of async/await, promises, and callbacks
- **Import styles** - Flags mixing of ES modules and CommonJS
- **API design patterns** - Ensures consistent patterns across endpoints

### 🏗️ Architectural Consistency *(coming soon)*
- File organization patterns
- Module structure
- Export/import patterns

## 📊 Example Output

```
📊 Summary

Files Analyzed: 47
Total Issues: 23
  Naming: 15
  Patterns: 8
  Architecture: 0

🏷️  Naming Issues

MINOR src/utils/helpers.ts:12
  poor-naming: x
  → Use descriptive variable name instead of single letter 'x'

MINOR src/components/User.ts:45
  convention-mix: user_name
  → Use camelCase 'userName' instead of snake_case in TypeScript/JavaScript

🔄 Pattern Issues

MAJOR multiple files
  Inconsistent error handling strategies across codebase
  → Standardize error handling strategy (prefer try-catch with typed errors)

💡 Recommendations

1. Standardize naming conventions: Found 7 snake_case variables in TypeScript
2. Improve variable naming: Found 8 single-letter or unclear variable names
3. Use async/await consistently instead of mixing with promise chains
```

## ⚙️ Usage

```bash
# Full analysis
aiready-consistency ./src

# Skip naming checks
aiready-consistency ./src --no-naming

# Skip pattern checks
aiready-consistency ./src --no-patterns

# Show only major issues
aiready-consistency ./src --min-severity major

# Export to JSON (saved to .aiready/ by default)
aiready-consistency ./src --output json

# Export to Markdown (saved to .aiready/ by default)
aiready-consistency ./src --output markdown

# Or specify custom paths
aiready-consistency ./src --output json --output-file custom-report.json
aiready-consistency ./src --output markdown --output-file custom-report.md
```

> **📁 Output Files:** By default, all output files are saved to the `.aiready/` directory in your project root with timestamped filenames. You can override this with `--output-file`.

## 🎛️ Options

| Option | Description | Default |
|--------|-------------|---------|
| `--naming` | Enable naming analysis | `true` |
| `--no-naming` | Skip naming analysis | - |
| `--patterns` | Enable pattern analysis | `true` |
| `--no-patterns` | Skip pattern analysis | - |
| `--min-severity` | Minimum severity: info\|minor\|major\|critical | `info` |
| `--include` | File patterns to include | All files |
| `--exclude` | File patterns to exclude | - |
| `--output` | Output format: console\|json\|markdown | `console` |
| `--output-file` | Output file path | - |

## 📝 Configuration File

Create `.airreadyrc.json`, `aiready.json`, or `aiready.config.json` in your project root:

```json
{
  "scan": {
    "include": ["src/**/*.{ts,tsx,js,jsx}"],
    "exclude": ["**/dist/**", "**/node_modules/**"]
  },
  "tools": {
    "consistency": {
      "checkNaming": true,
      "checkPatterns": true,
      "minSeverity": "minor",
      "acceptedAbbreviations": ["ses", "gst", "cdk"],
      "shortWords": ["oak", "elm"],
      "disableChecks": []
    }
  },
  "output": {
    "format": "console"
  }
}
```

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `checkNaming` | boolean | `true` | Check naming conventions |
| `checkPatterns` | boolean | `true` | Check code pattern consistency |
| `minSeverity` | string | `'info'` | Filter: `'info'`, `'minor'`, `'major'`, `'critical'` |
| `acceptedAbbreviations` | string[] | `[]` | Custom abbreviations to accept (e.g., domain-specific terms) |
| `shortWords` | string[] | `[]` | Additional full English words to accept |
| `disableChecks` | string[] | `[]` | Disable specific checks: `'single-letter'`, `'abbreviation'`, `'convention-mix'`, `'unclear'`, `'poor-naming'` |

### Project-Specific Configuration Examples

**React/Next.js Projects:**
```json
{
  "tools": {
    "consistency": {
      "acceptedAbbreviations": ["jsx", "tsx", "ref", "ctx", "req", "res"]
    }
  }
}
```

**AWS/Cloud Projects:**
```json
{
  "tools": {
    "consistency": {
      "acceptedAbbreviations": ["ses", "sns", "sqs", "ec2", "vpc", "iam"]
    }
  }
}
```

**E-commerce Projects:**
```json
{
  "tools": {
    "consistency": {
      "acceptedAbbreviations": ["gst", "vat", "sku", "upc"],
      "shortWords": ["tax", "buy", "pay", "cart"]
    }
  }
}
```

### Acceptable Abbreviations

The tool recognizes 100+ standard abbreviations and won't flag them:

**Web/Network:** url, uri, api, cdn, dns, ip, http, utm, seo, xhr, cors, ws, wss  
**Data:** json, xml, yaml, csv, html, css, svg, pdf, dto, dao  
**System:** env, os, fs, cli, tmp, src, dst, bin, lib, pkg  
**Request/Response:** req, res, ctx, err, msg  
**Math:** max, min, avg, sum, abs, cos, sin, log, sqrt  
**Time:** now, utc, ms, sec, hr, yr, mo  
**Loop Counters:** i, j, k, n, m  
**Cloud/Infrastructure:** s3, ec2, sqs, sns, vpc, ami, iam, aws  
**Common:** id, uid, db, sql, orm, ui, ux, dom, ref, val, str, obj, arr, cfg, init

See [naming.ts](src/analyzers/naming.ts) for the complete list.

## 🔧 Programmatic API

```typescript
import { analyzeConsistency } from '@aiready/consistency';

const report = await analyzeConsistency({
  rootDir: './src',
  checkNaming: true,
  checkPatterns: true,
  minSeverity: 'minor'
});

console.log(`Found ${report.summary.totalIssues} issues`);
```

## 🤝 Why This Matters for AI

AI models work best with consistent codebases because:

1. **Pattern Recognition**: Consistent patterns help AI understand your coding style
2. **Context Efficiency**: Less variation = more useful code fits in context window
3. **Accurate Suggestions**: AI can predict conventions and follow them
4. **Reduced Errors**: AI makes fewer mistakes with clear, consistent patterns

## 📦 Integration with AIReady

This tool is part of the [AIReady](https://github.com/caopengau/aiready) ecosystem:

**Related packages:**
- [**@aiready/cli**](https://www.npmjs.com/package/@aiready/cli) - Unified interface for all analysis tools
- [**@aiready/pattern-detect**](https://www.npmjs.com/package/@aiready/pattern-detect) - Semantic duplicate detection
- [**@aiready/context-analyzer**](https://www.npmjs.com/package/@aiready/context-analyzer) - Context window cost analysis
- **@aiready/context-analyzer** - Context window cost analysis
- **@aiready/consistency** - Consistency analysis (this tool)

## 📖 Documentation

- [Contributing Guide](./CONTRIBUTING.md)
- [AIReady Main Repo](https://github.com/caopengau/aiready)

## 🌐 Visit Our Website

**Try AIReady tools online and maintain code consistency:** [getaiready.dev](https://getaiready.dev)

## 📄 License

MIT © AIReady Team
