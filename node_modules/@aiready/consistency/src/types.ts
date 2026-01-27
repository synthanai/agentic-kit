import type { ScanOptions, AnalysisResult, Issue } from '@aiready/core';

export interface ConsistencyOptions extends ScanOptions {
  /** Check naming conventions and quality */
  checkNaming?: boolean;
  /** Check code pattern consistency */
  checkPatterns?: boolean;
  /** Check architectural consistency */
  checkArchitecture?: boolean;
  /** Minimum severity to report */
  minSeverity?: 'info' | 'minor' | 'major' | 'critical';
}

export interface ConsistencyIssue extends Issue {
  type: 
    | 'naming-inconsistency'
    | 'naming-quality'
    | 'pattern-inconsistency'
    | 'architecture-inconsistency';
  category: 'naming' | 'patterns' | 'architecture';
  /** Examples of the inconsistency found */
  examples?: string[];
  /** Suggested fix or convention to follow */
  suggestion?: string;
}

export interface NamingIssue {
  file: string;
  line: number;
  column?: number;
  type: 'poor-naming' | 'convention-mix' | 'abbreviation' | 'unclear';
  identifier: string;
  suggestion?: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
}

export interface PatternIssue {
  files: string[];
  type: 'error-handling' | 'async-style' | 'import-style' | 'api-design';
  description: string;
  examples: string[];
  severity: 'critical' | 'major' | 'minor' | 'info';
}

export interface ArchitectureIssue {
  type: 'file-organization' | 'module-structure' | 'export-style';
  description: string;
  affectedPaths: string[];
  severity: 'critical' | 'major' | 'minor' | 'info';
}

export interface ConsistencyReport {
  summary: {
    totalIssues: number;
    namingIssues: number;
    patternIssues: number;
    architectureIssues: number;
    filesAnalyzed: number;
  };
  results: AnalysisResult[];
  recommendations: string[];
}
