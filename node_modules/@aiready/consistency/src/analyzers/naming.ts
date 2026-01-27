import { readFileContent } from '@aiready/core';
import type { NamingIssue } from '../types';
import {
  COMMON_SHORT_WORDS,
  ACCEPTABLE_ABBREVIATIONS,
  snakeCaseToCamelCase,
} from './naming-constants';
import { loadNamingConfig } from '../utils/config-loader';

/**
 * Analyzes naming conventions and quality
 */
export async function analyzeNaming(files: string[]): Promise<NamingIssue[]> {
  const issues: NamingIssue[] = [];

  // Load and merge configuration
  const { customAbbreviations, customShortWords, disabledChecks } = await loadNamingConfig(files);

  for (const file of files) {
    const content = await readFileContent(file);
    const fileIssues = analyzeFileNaming(file, content, customAbbreviations, customShortWords, disabledChecks);
    issues.push(...fileIssues);
  }

  return issues;
}

function analyzeFileNaming(
  file: string, 
  content: string, 
  customAbbreviations: Set<string>,
  customShortWords: Set<string>,
  disabledChecks: Set<string>
): NamingIssue[] {
  const issues: NamingIssue[] = [];

  // Check if this is a test file (more lenient rules)
  const isTestFile = file.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/);

  // Split into lines for line number tracking
  const lines = content.split('\n');

  // Merge custom sets with defaults
  const allAbbreviations = new Set([...ACCEPTABLE_ABBREVIATIONS, ...customAbbreviations]);
  const allShortWords = new Set([...COMMON_SHORT_WORDS, ...customShortWords]);

  /**
   * Helper: Get context window around a line (for multi-line pattern detection)
   */
  const getContextWindow = (index: number, windowSize: number = 3): string => {
    const start = Math.max(0, index - windowSize);
    const end = Math.min(lines.length, index + windowSize + 1);
    return lines.slice(start, end).join('\n');
  };

  /**
   * Helper: Check if a variable is short-lived (used only within 3-5 lines)
   */
  const isShortLivedVariable = (varName: string, declarationIndex: number): boolean => {
    const searchRange = 5; // Check 5 lines after declaration
    const endIndex = Math.min(lines.length, declarationIndex + searchRange + 1);
    
    let usageCount = 0;
    for (let i = declarationIndex; i < endIndex; i++) {
      // Match variable name as whole word
      const regex = new RegExp(`\\b${varName}\\b`, 'g');
      const matches = lines[i].match(regex);
      if (matches) {
        usageCount += matches.length;
      }
    }
    
    // If variable is only used 2-3 times within 5 lines, it's short-lived
    // (1 = declaration, 1-2 = actual usage)
    return usageCount >= 2 && usageCount <= 3;
  };

  // Check for naming patterns
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const contextWindow = getContextWindow(index);

    // Check for single letter variables (except i, j, k, l in loops/common contexts)
    if (!disabledChecks.has('single-letter')) {
      const singleLetterMatches = line.matchAll(/\b(?:const|let|var)\s+([a-hm-z])\s*=/gi);
      for (const match of singleLetterMatches) {
        const letter = match[1].toLowerCase();
        
        // Coverage metrics context (s/b/f/l are standard for statements/branches/functions/lines)
        const isCoverageContext = /coverage|summary|metrics|pct|percent/i.test(line) || 
          /\.(?:statements|branches|functions|lines)\.pct/i.test(line);
        if (isCoverageContext && ['s', 'b', 'f', 'l'].includes(letter)) {
          continue;
        }
        
        // Enhanced loop/iterator context detection
        const isInLoopContext = 
          line.includes('for') || 
          /\.(map|filter|forEach|reduce|find|some|every)\s*\(/.test(line) ||
          line.includes('=>') || // Arrow function
          /\w+\s*=>\s*/.test(line); // Callback pattern
        
        // Check for i18n/translation context
        const isI18nContext = 
          line.includes('useTranslation') ||
          line.includes('i18n.t') ||
          /\bt\s*\(['"]/.test(line); // t('key') pattern
        
        // Check for arrow function parameter (improved detection with context window)
        const isArrowFunctionParam = 
          /\(\s*[a-z]\s*(?:,\s*[a-z]\s*)*\)\s*=>/.test(line) || // (s) => or (a, b) =>
          /[a-z]\s*=>/.test(line) || // s => on same line
          // Multi-line arrow function detection: look for pattern in context window
          new RegExp(`\\b${letter}\\s*\\)\\s*$`).test(line) && /=>/.test(contextWindow) || // (s)\n =>
          new RegExp(`\\.(?:map|filter|forEach|reduce|find|some|every)\\s*\\(\\s*$`).test(lines[index - 1] || '') && /=>/.test(contextWindow); // .map(\n  s =>
        
        // Check if variable is short-lived (comparison/temporary contexts)
        const isShortLived = isShortLivedVariable(letter, index);
        
        if (!isInLoopContext && !isI18nContext && !isArrowFunctionParam && !isShortLived && !['x', 'y', 'z', 'i', 'j', 'k', 'l', 'n', 'm'].includes(letter)) {
          // Skip in test files unless it's really unclear
          if (isTestFile && ['a', 'b', 'c', 'd', 'e', 'f', 's'].includes(letter)) {
            continue;
          }
          
          issues.push({
            file,
            line: lineNumber,
            type: 'poor-naming',
            identifier: match[1],
            severity: 'minor',
            suggestion: `Use descriptive variable name instead of single letter '${match[1]}'`
          });
        }
      }
    }

    // Check for overly abbreviated variables
    if (!disabledChecks.has('abbreviation')) {
      const abbreviationMatches = line.matchAll(/\b(?:const|let|var)\s+([a-z]{1,3})(?=[A-Z]|_|\s*=)/g);
      for (const match of abbreviationMatches) {
        const abbrev = match[1].toLowerCase();
        
        // Skip if it's a common short English word (full word, not abbreviation)
        if (allShortWords.has(abbrev)) {
          continue;
        }
        
        // Skip acceptable abbreviations (including custom ones)
        if (allAbbreviations.has(abbrev)) {
          continue;
        }
        
        // Check for arrow function parameter context (with multi-line detection)
        const isArrowFunctionParam = 
          /\(\s*[a-z]\s*(?:,\s*[a-z]\s*)*\)\s*=>/.test(line) || // (s) => or (a, b) =>
          new RegExp(`\\b${abbrev}\\s*=>`).test(line) || // s => on same line
          // Multi-line arrow function: check context window
          (new RegExp(`\\b${abbrev}\\s*\\)\\s*$`).test(line) && /=>/.test(contextWindow)) || // (s)\n =>
          (new RegExp(`\\.(?:map|filter|forEach|reduce|find|some|every)\\s*\\(\\s*$`).test(lines[index - 1] || '') && 
           new RegExp(`^\\s*${abbrev}\\s*=>`).test(line)); // .map(\n  s =>
        
        if (isArrowFunctionParam) {
          continue;
        }
        
        // For very short names (1-2 letters), check for date/time context
        if (abbrev.length <= 2) {
          const isDateTimeContext = /date|time|day|hour|minute|second|timestamp/i.test(line);
          if (isDateTimeContext && ['d', 't', 'dt'].includes(abbrev)) {
            continue;
          }
          
          // Check for user/auth context
          const isUserContext = /user|auth|account/i.test(line);
          if (isUserContext && abbrev === 'u') {
            continue;
          }
        }
        
        issues.push({
          file,
          line: lineNumber,
          type: 'abbreviation',
          identifier: match[1],
          severity: 'info',
          suggestion: `Consider using full word instead of abbreviation '${match[1]}'`
        });
      }
    }

    // Check for snake_case vs camelCase mixing in TypeScript/JavaScript
    if (!disabledChecks.has('convention-mix') && file.match(/\.(ts|tsx|js|jsx)$/)) {
      const camelCaseVars = line.match(/\b(?:const|let|var)\s+([a-z][a-zA-Z0-9]*)\s*=/);
      const snakeCaseVars = line.match(/\b(?:const|let|var)\s+([a-z][a-z0-9]*_[a-z0-9_]*)\s*=/);
      
      if (snakeCaseVars) {
        issues.push({
          file,
          line: lineNumber,
          type: 'convention-mix',
          identifier: snakeCaseVars[1],
          severity: 'minor',
          suggestion: `Use camelCase '${snakeCaseToCamelCase(snakeCaseVars[1])}' instead of snake_case in TypeScript/JavaScript`
        });
      }
    }

    // Check for unclear boolean names (should start with is/has/should/can)
    if (!disabledChecks.has('unclear')) {
      const booleanMatches = line.matchAll(/\b(?:const|let|var)\s+([a-z][a-zA-Z0-9]*)\s*:\s*boolean/gi);
      for (const match of booleanMatches) {
        const name = match[1];
        if (!name.match(/^(is|has|should|can|will|did)/i)) {
          issues.push({
            file,
            line: lineNumber,
            type: 'unclear',
            identifier: name,
            severity: 'info',
            suggestion: `Boolean variable '${name}' should start with is/has/should/can for clarity`
          });
        }
      }
    }

    // Check for function names that don't indicate action
    if (!disabledChecks.has('unclear')) {
      const functionMatches = line.matchAll(/function\s+([a-z][a-zA-Z0-9]*)/g);
      for (const match of functionMatches) {
        const name = match[1];
        
        // Skip JavaScript/TypeScript keywords that shouldn't be function names
        const isKeyword = ['for', 'if', 'else', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return', 'throw', 'try', 'catch', 'finally', 'with', 'yield', 'await'].includes(name);
        if (isKeyword) {
          continue;
        }
        
        // Skip common entry point names
        const isEntryPoint = ['main', 'init', 'setup', 'bootstrap'].includes(name);
        if (isEntryPoint) {
          continue;
        }
        
        // Functions should typically start with verbs, but allow:
        // 1. Factory/builder patterns (ends with Factory, Builder, etc.)
        // 2. Descriptive compound names that explain what they return
        // 3. Event handlers (onClick, onSubmit, etc.)
        // 4. Descriptive aggregate/collection patterns
        // 5. Very long descriptive names (>15 chars)
        // 6. Compound words with 3+ capitals
        // 7. Helper/utility functions (common patterns)
        // 8. React hooks (useX pattern)
        
        const isFactoryPattern = name.match(/(Factory|Builder|Creator|Generator|Provider|Adapter|Mock)$/);
        const isEventHandler = name.match(/^on[A-Z]/);
        const isDescriptiveLong = name.length > 15; // Reduced from 20 to 15
        const isReactHook = name.match(/^use[A-Z]/); // React hooks
        
        // Check for descriptive patterns
        const isDescriptivePattern = name.match(/^(default|total|count|sum|avg|max|min|initial|current|previous|next)\w+/) ||
                                     name.match(/\w+(Count|Total|Sum|Average|List|Map|Set|Config|Settings|Options|Props|Data|Info|Details|State|Status|Response|Result)$/);
        
        // Helper/utility function patterns
        const isHelperPattern = name.match(/^(to|from|with|without|for|as|into)\w+/) || // toMetadata, withLogger, forPath
                               name.match(/^\w+(To|From|With|Without|For|As|Into)\w*$/); // metadataTo, pathFrom
        
        // Common utility names that are descriptive
        const isUtilityName = ['cn', 'proxy', 'sitemap', 'robots', 'gtag'].includes(name);
        
        // Count capital letters for compound detection
        const capitalCount = (name.match(/[A-Z]/g) || []).length;
        const isCompoundWord = capitalCount >= 3; // daysSinceLastCommit has 4 capitals
        
        const hasActionVerb = name.match(/^(get|set|is|has|can|should|create|update|delete|fetch|load|save|process|handle|validate|check|find|search|filter|map|reduce|make|do|run|start|stop|build|parse|format|render|calculate|compute|generate|transform|convert|normalize|sanitize|encode|decode|compress|extract|merge|split|join|sort|compare|test|verify|ensure|apply|execute|invoke|call|emit|dispatch|trigger|listen|subscribe|unsubscribe|add|remove|clear|reset|toggle|enable|disable|open|close|connect|disconnect|send|receive|read|write|import|export|register|unregister|mount|unmount|track|store|persist|upsert|derive|classify|combine|discover|activate|require|assert|expect|mask|escape|sign|put|list|complete|page|safe|mock|pick|pluralize|text)/);
        
        if (!hasActionVerb && !isFactoryPattern && !isEventHandler && !isDescriptiveLong && !isDescriptivePattern && !isCompoundWord && !isHelperPattern && !isUtilityName && !isReactHook) {
          issues.push({
            file,
            line: lineNumber,
            type: 'unclear',
            identifier: name,
            severity: 'info',
            suggestion: `Function '${name}' should start with an action verb (get, set, create, etc.)`
          });
        }
      }
    }
  });

  return issues;
}
