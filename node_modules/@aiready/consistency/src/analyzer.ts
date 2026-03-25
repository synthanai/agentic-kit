import { scanFiles } from '@aiready/core';
import type { AnalysisResult, Issue } from '@aiready/core';
import type { ConsistencyOptions, ConsistencyReport, ConsistencyIssue } from './types';
import { analyzeNamingAST } from './analyzers/naming-ast';
import { analyzePatterns } from './analyzers/patterns';

/**
 * Main consistency analyzer that orchestrates all analysis types
 * Note: Currently only supports TypeScript/JavaScript files (.ts, .tsx, .js, .jsx)
 * Python and other language files will be ignored during naming analysis.
 */
export async function analyzeConsistency(
  options: ConsistencyOptions
): Promise<ConsistencyReport> {
  const {
    checkNaming = true,
    checkPatterns = true,
    checkArchitecture = false, // Not implemented yet
    minSeverity = 'info',
    ...scanOptions
  } = options;

  // Scan files
  const filePaths = await scanFiles(scanOptions);

  // Collect issues by category
  const namingIssues = checkNaming ? await analyzeNamingAST(filePaths) : [];
  const patternIssues = checkPatterns ? await analyzePatterns(filePaths) : [];

  // Convert to AnalysisResult format
  const results: AnalysisResult[] = [];
  const fileIssuesMap = new Map<string, ConsistencyIssue[]>();

  // Process naming issues
  for (const issue of namingIssues) {
    if (!shouldIncludeSeverity(issue.severity, minSeverity)) {
      continue;
    }

    const consistencyIssue: ConsistencyIssue = {
      type: issue.type === 'convention-mix' ? 'naming-inconsistency' : 'naming-quality',
      category: 'naming',
      severity: issue.severity,
      message: `${issue.type}: ${issue.identifier}`,
      location: {
        file: issue.file,
        line: issue.line,
        column: issue.column
      },
      suggestion: issue.suggestion
    };

    if (!fileIssuesMap.has(issue.file)) {
      fileIssuesMap.set(issue.file, []);
    }
    fileIssuesMap.get(issue.file)!.push(consistencyIssue);
  }

  // Process pattern issues
  for (const issue of patternIssues) {
    if (!shouldIncludeSeverity(issue.severity, minSeverity)) {
      continue;
    }

    const consistencyIssue: ConsistencyIssue = {
      type: 'pattern-inconsistency',
      category: 'patterns',
      severity: issue.severity,
      message: issue.description,
      location: {
        file: issue.files[0] || 'multiple files',
        line: 1
      },
      examples: issue.examples,
      suggestion: `Standardize ${issue.type} patterns across ${issue.files.length} files`
    };

    // Add to first file in the pattern
    const firstFile = issue.files[0];
    if (firstFile && !fileIssuesMap.has(firstFile)) {
      fileIssuesMap.set(firstFile, []);
    }
    if (firstFile) {
      fileIssuesMap.get(firstFile)!.push(consistencyIssue);
    }
  }

  // Convert to AnalysisResult format
  for (const [fileName, issues] of fileIssuesMap) {
    results.push({
      fileName,
      issues: issues as Issue[],
      metrics: {
        consistencyScore: calculateConsistencyScore(issues)
      }
    });
  }

  // Sort results by severity first, then by issue count per file
  results.sort((fileResultA, fileResultB) => {
    const severityOrder = { critical: 0, major: 1, minor: 2, info: 3 };
    
    // Get highest severity in each file
    const maxSeverityA = Math.min(
      ...fileResultA.issues.map(i => severityOrder[(i as ConsistencyIssue).severity])
    );
    const maxSeverityB = Math.min(
      ...fileResultB.issues.map(i => severityOrder[(i as ConsistencyIssue).severity])
    );
    
    // Sort by severity first
    if (maxSeverityA !== maxSeverityB) {
      return maxSeverityA - maxSeverityB;
    }
    
    // Then by issue count (descending)
    return fileResultB.issues.length - fileResultA.issues.length;
  });

  // Generate recommendations
  const recommendations = generateRecommendations(namingIssues, patternIssues);

  // Detect naming conventions (TODO: re-implement for AST version)
  // const conventionAnalysis = detectNamingConventions(filePaths, namingIssues);

  return {
    summary: {
      totalIssues: namingIssues.length + patternIssues.length,
      namingIssues: namingIssues.length,
      patternIssues: patternIssues.length,
      architectureIssues: 0,
      filesAnalyzed: filePaths.length
    },
    results,
    recommendations
  };
}

function shouldIncludeSeverity(
  severity: 'critical' | 'major' | 'minor' | 'info',
  minSeverity: 'critical' | 'major' | 'minor' | 'info'
): boolean {
  const severityLevels = { info: 0, minor: 1, major: 2, critical: 3 };
  return severityLevels[severity] >= severityLevels[minSeverity];
}

function calculateConsistencyScore(issues: ConsistencyIssue[]): number {
  // Higher score = more consistent (fewer issues)
  const weights = { critical: 10, major: 5, minor: 2, info: 1 };
  const totalWeight = issues.reduce((sum, issue) => sum + weights[issue.severity], 0);
  // Score from 0-1, where 1 is perfect
  return Math.max(0, 1 - totalWeight / 100);
}

function generateRecommendations(
  namingIssues: any[],
  patternIssues: any[]
): string[] {
  const recommendations: string[] = [];

  if (namingIssues.length > 0) {
    const conventionMixCount = namingIssues.filter(i => i.type === 'convention-mix').length;
    if (conventionMixCount > 0) {
      recommendations.push(
        `Standardize naming conventions: Found ${conventionMixCount} snake_case variables in TypeScript/JavaScript (use camelCase)`
      );
    }

    const poorNamingCount = namingIssues.filter(i => i.type === 'poor-naming').length;
    if (poorNamingCount > 0) {
      recommendations.push(
        `Improve variable naming: Found ${poorNamingCount} single-letter or unclear variable names`
      );
    }
  }

  if (patternIssues.length > 0) {
    const errorHandlingIssues = patternIssues.filter(i => i.type === 'error-handling');
    if (errorHandlingIssues.length > 0) {
      recommendations.push(
        'Standardize error handling strategy across the codebase (prefer try-catch with typed errors)'
      );
    }

    const asyncIssues = patternIssues.filter(i => i.type === 'async-style');
    if (asyncIssues.length > 0) {
      recommendations.push(
        'Use async/await consistently instead of mixing with promise chains or callbacks'
      );
    }

    const importIssues = patternIssues.filter(i => i.type === 'import-style');
    if (importIssues.length > 0) {
      recommendations.push(
        'Use ES modules consistently across the project (avoid mixing with CommonJS)'
      );
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('No major consistency issues found! Your codebase follows good practices.');
  }

  return recommendations;
}
