import { readFileContent } from '@aiready/core';
import type { PatternIssue } from '../types';

/**
 * Analyzes code pattern consistency
 */
export async function analyzePatterns(files: string[]): Promise<PatternIssue[]> {
  const issues: PatternIssue[] = [];

  // Analyze error handling patterns
  const errorHandlingIssues = await analyzeErrorHandling(files);
  issues.push(...errorHandlingIssues);

  // Analyze async/await patterns
  const asyncIssues = await analyzeAsyncPatterns(files);
  issues.push(...asyncIssues);

  // Analyze import styles
  const importIssues = await analyzeImportStyles(files);
  issues.push(...importIssues);

  return issues;
}

async function analyzeErrorHandling(files: string[]): Promise<PatternIssue[]> {
  const patterns = {
    tryCatch: [] as string[],
    throwsError: [] as string[],
    returnsNull: [] as string[],
    returnsError: [] as string[]
  };

  for (const file of files) {
    const content = await readFileContent(file);
    
    if (content.includes('try {') || content.includes('} catch')) {
      patterns.tryCatch.push(file);
    }
    if (content.match(/throw new \w*Error/)) {
      patterns.throwsError.push(file);
    }
    if (content.match(/return null/)) {
      patterns.returnsNull.push(file);
    }
    if (content.match(/return \{ error:/)) {
      patterns.returnsError.push(file);
    }
  }

  const issues: PatternIssue[] = [];

  // Check for mixed error handling strategies
  const strategiesUsed = Object.values(patterns).filter(p => p.length > 0).length;
  if (strategiesUsed > 2) {
    issues.push({
      files: [...new Set([
        ...patterns.tryCatch,
        ...patterns.throwsError,
        ...patterns.returnsNull,
        ...patterns.returnsError
      ])],
      type: 'error-handling',
      description: 'Inconsistent error handling strategies across codebase',
      examples: [
        patterns.tryCatch.length > 0 ? `Try-catch used in ${patterns.tryCatch.length} files` : '',
        patterns.throwsError.length > 0 ? `Throws errors in ${patterns.throwsError.length} files` : '',
        patterns.returnsNull.length > 0 ? `Returns null in ${patterns.returnsNull.length} files` : '',
        patterns.returnsError.length > 0 ? `Returns error objects in ${patterns.returnsError.length} files` : ''
      ].filter(e => e),
      severity: 'major'
    });
  }

  return issues;
}

async function analyzeAsyncPatterns(files: string[]): Promise<PatternIssue[]> {
  const patterns = {
    asyncAwait: [] as string[],
    promises: [] as string[],
    callbacks: [] as string[]
  };

  for (const file of files) {
    const content = await readFileContent(file);
    
    if (content.match(/async\s+(function|\(|[a-zA-Z])/)) {
      patterns.asyncAwait.push(file);
    }
    if (content.match(/\.then\(/) || content.match(/\.catch\(/)) {
      patterns.promises.push(file);
    }
    if (content.match(/callback\s*\(/) || content.match(/\(\s*err\s*,/)) {
      patterns.callbacks.push(file);
    }
  }

  const issues: PatternIssue[] = [];

  // Modern codebases should prefer async/await
  if (patterns.callbacks.length > 0 && patterns.asyncAwait.length > 0) {
    issues.push({
      files: [...patterns.callbacks, ...patterns.asyncAwait],
      type: 'async-style',
      description: 'Mixed async patterns: callbacks and async/await',
      examples: [
        `Callbacks found in: ${patterns.callbacks.slice(0, 3).join(', ')}`,
        `Async/await used in: ${patterns.asyncAwait.slice(0, 3).join(', ')}`
      ],
      severity: 'minor'
    });
  }

  // Mixing .then() chains with async/await
  if (patterns.promises.length > patterns.asyncAwait.length * 0.3 && patterns.asyncAwait.length > 0) {
    issues.push({
      files: patterns.promises,
      type: 'async-style',
      description: 'Consider using async/await instead of promise chains for consistency',
      examples: patterns.promises.slice(0, 5),
      severity: 'info'
    });
  }

  return issues;
}

async function analyzeImportStyles(files: string[]): Promise<PatternIssue[]> {
  const patterns = {
    esModules: [] as string[],
    commonJS: [] as string[],
    mixed: [] as string[]
  };

  for (const file of files) {
    const content = await readFileContent(file);
    const hasESM = content.match(/^import\s+/m);
    
    // Check for actual CommonJS require() calls, excluding:
    // - String literals: "require('...') or 'require('...')
    // - Regex patterns: /require\(/
    // - Comments: // require( or /* require( */
    const hasCJS = hasActualRequireCalls(content);
    
    if (hasESM && hasCJS) {
      patterns.mixed.push(file);
    } else if (hasESM) {
      patterns.esModules.push(file);
    } else if (hasCJS) {
      patterns.commonJS.push(file);
    }
  }

  const issues: PatternIssue[] = [];

  // Check for mixed import styles in same file
  if (patterns.mixed.length > 0) {
    issues.push({
      files: patterns.mixed,
      type: 'import-style',
      description: 'Mixed ES modules and CommonJS imports in same files',
      examples: patterns.mixed.slice(0, 5),
      severity: 'major'
    });
  }

  // Check for inconsistent styles across project
  if (patterns.esModules.length > 0 && patterns.commonJS.length > 0) {
    const ratio = patterns.commonJS.length / (patterns.esModules.length + patterns.commonJS.length);
    if (ratio > 0.2 && ratio < 0.8) {
      issues.push({
        files: [...patterns.esModules, ...patterns.commonJS],
        type: 'import-style',
        description: 'Inconsistent import styles across project',
        examples: [
          `ES modules: ${patterns.esModules.length} files`,
          `CommonJS: ${patterns.commonJS.length} files`
        ],
        severity: 'minor'
      });
    }
  }

  return issues;
}

/**
 * Detects actual require() calls, excluding false positives
 * Filters out require() in:
 * - String literals (single/double/template quotes)
 * - Regex patterns
 * - Single-line comments (//)
 * - Multi-line comments
 */
function hasActualRequireCalls(content: string): boolean {
  // Simple heuristic: remove obvious false positives
  // 1. Remove single-line comments
  let cleaned = content.replace(/\/\/.*$/gm, '');
  
  // 2. Remove multi-line comments (non-greedy)
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // 3. Remove string literals - use simpler regex to avoid backtracking
  // Match strings but don't try to be perfect, just remove obvious ones
  cleaned = cleaned.replace(/"[^"\n]*"/g, '""');
  cleaned = cleaned.replace(/'[^'\n]*'/g, "''");
  cleaned = cleaned.replace(/`[^`]*`/g, '``');
  
  // 4. Simple regex detection: if we see /require in the line, likely a regex pattern
  // Remove lines that look like regex patterns with require
  cleaned = cleaned.replace(/\/[^/\n]*require[^/\n]*\/[gimsuvy]*/g, '');
  
  // Now check for require( in the cleaned content
  return /require\s*\(/.test(cleaned);
}

/**
 * Analyzes API design consistency
 */
export async function analyzeAPIDesign(files: string[]): Promise<PatternIssue[]> {
  // This would analyze:
  // - Function parameter order consistency
  // - Return type patterns
  // - Options object vs individual parameters
  // For now, return empty array
  return [];
}
