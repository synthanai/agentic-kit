import { loadConfig } from '@aiready/core';
import { dirname } from 'path';
import {
  COMMON_SHORT_WORDS,
  ACCEPTABLE_ABBREVIATIONS,
} from '../analyzers/naming-constants';

/**
 * Configuration for naming analyzers
 */
export interface NamingConfig {
  customAbbreviations: Set<string>;
  customShortWords: Set<string>;
  disabledChecks: Set<string>;
  allAbbreviations: Set<string>;
  allShortWords: Set<string>;
}

/**
 * Loads and merges naming configuration for consistency analyzers
 * Extracts common config loading logic used by both naming.ts and naming-ast.ts
 * 
 * @param files - Array of files being analyzed (used to determine project root)
 * @returns Merged configuration with custom and default abbreviations/short words
 */
export async function loadNamingConfig(files: string[]): Promise<NamingConfig> {
  // Load config from the first file's directory (or project root)
  const rootDir = files.length > 0 ? dirname(files[0]) : process.cwd();
  const config = await loadConfig(rootDir);
  const consistencyConfig = config?.tools?.['consistency'];

  // Extract custom configuration
  const customAbbreviations = new Set(consistencyConfig?.acceptedAbbreviations || []);
  const customShortWords = new Set(consistencyConfig?.shortWords || []);
  const disabledChecks = new Set(consistencyConfig?.disableChecks || []);

  // Merge with defaults
  const allAbbreviations = new Set([...ACCEPTABLE_ABBREVIATIONS, ...customAbbreviations]);
  const allShortWords = new Set([...COMMON_SHORT_WORDS, ...customShortWords]);

  return {
    customAbbreviations,
    customShortWords,
    disabledChecks,
    allAbbreviations,
    allShortWords,
  };
}
