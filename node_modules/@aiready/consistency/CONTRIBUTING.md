# Contributing to @aiready/consistency

Thank you for your interest in contributing to AIReady Consistency Checker! We welcome bug reports, feature requests, and code contributions.

## 🐛 Reporting Issues

Found a bug or have a feature request? [Open an issue](https://github.com/caopengau/aiready-consistency/issues) with:
- Clear description of the problem or feature
- Sample code that demonstrates the issue
- Expected vs actual behavior
- Your environment (Node version, OS)

## 🔧 Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/aiready-consistency
cd aiready-consistency

# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Test CLI locally
./dist/cli.js ../test-project
```

## 📝 Making Changes

1. **Fork the repository** and create a new branch:
   ```bash
   git checkout -b fix/naming-detection
   # or
   git checkout -b feat/new-pattern-check
   ```

2. **Make your changes** following our code style:
   - Use TypeScript strict mode
   - Add tests for new detectors
   - Update README with new features
   - Keep analyzers modular and focused

3. **Test your changes**:
   ```bash
   pnpm build
   pnpm test
   
   # Test on real projects
   ./dist/cli.js path/to/test-project
   ```

4. **Commit and push**:
   ```bash
   git add .
   git commit -m "feat: add camelCase detection for Python"
   git push origin your-branch
   ```

5. **Open a Pull Request** with:
   - Description of changes
   - Test results
   - Screenshots (if applicable)

## 🧪 Testing Guidelines

- Add tests for new naming patterns
- Test on multiple file types (TS, JS, Python, etc.)
- Verify false positive rate is acceptable
- Check performance with large codebases

## 🏗️ Architecture

### Directory Structure

```
src/
├── analyzers/        # Individual analyzers
│   ├── naming.ts     # Naming quality & conventions
│   ├── patterns.ts   # Code pattern consistency
│   └── architecture.ts # (future) Architecture checks
├── analyzer.ts       # Main orchestrator
├── types.ts          # Type definitions
├── cli.ts            # CLI interface
└── index.ts          # Public API exports
```

### Adding a New Analyzer

1. Create `src/analyzers/your-analyzer.ts`:
   ```typescript
   import type { YourIssueType } from '../types';
   
   export async function analyzeYourThing(files: string[]): Promise<YourIssueType[]> {
     // Your detection logic
     return issues;
   }
   ```

2. Update `src/types.ts` with new issue types

3. Integrate in `src/analyzer.ts`

4. Add CLI options in `src/cli.ts`

5. Export from `src/index.ts`

6. Add tests in `src/__tests__/`

## 📊 Pattern Detection Guidelines

When adding new consistency checks:

1. **Focus on AI Impact**: Does this inconsistency confuse AI models?
2. **Minimize False Positives**: Acceptable patterns should not be flagged
3. **Provide Context**: Include file, line, and clear suggestions
4. **Categorize Properly**: Is it naming, pattern, or architecture?
5. **Consider Performance**: Avoid expensive operations on every line

## 🎯 Code Style

- Follow existing patterns in the codebase
- Use descriptive variable names (we're checking naming, after all!)
- Add comments for complex logic
- Keep functions focused and small
- Prefer composition over inheritance

## 🔄 Monorepo Development

This package is part of the AIReady monorepo. If contributing to the monorepo:

1. Work in `packages/consistency/`
2. Use `pnpm` for package management
3. Follow hub-and-spoke patterns (only import from `@aiready/core`)
4. Test integration with `@aiready/cli`

## 📚 Resources

- [AIReady Main Repo](https://github.com/caopengau/aiready)
- [AIReady Documentation](.github/copilot-instructions.md)
- [TypeScript Best Practices](https://github.com/labs42io/clean-code-typescript)

## 🤝 Code of Conduct

Be respectful, constructive, and inclusive. We're all learning and improving together.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
