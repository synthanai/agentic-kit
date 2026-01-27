import { TSESTree } from '@typescript-eslint/typescript-estree';
import type { NamingIssue } from '../types';
import {
  parseFile,
  traverseAST,
  getFunctionName,
  getLineNumber,
  isCoverageContext,
  isLoopStatement,
  isCallback,
} from '../utils/ast-parser';
import { ScopeTracker } from '../utils/scope-tracker';
import {
  buildCodeContext,
  adjustSeverity,
  isAcceptableInContext,
  calculateComplexity,
} from '../utils/context-detector';
import { loadNamingConfig } from '../utils/config-loader';

/**
 * AST-based naming analyzer
 * Only supports TypeScript/JavaScript files (.ts, .tsx, .js, .jsx)
 */
export async function analyzeNamingAST(files: string[]): Promise<NamingIssue[]> {
  const issues: NamingIssue[] = [];

  // Load and merge configuration
  const { allAbbreviations, allShortWords, disabledChecks } = await loadNamingConfig(files);

  // Filter to only JS/TS files that the TypeScript parser can handle
  const supportedFiles = files.filter(file => 
    /\.(js|jsx|ts|tsx)$/i.test(file)
  );

  for (const file of supportedFiles) {
    try {
      const ast = parseFile(file);
      if (!ast) continue; // Skip files that fail to parse

      const fileIssues = analyzeFileNamingAST(
        file,
        ast,
        allAbbreviations,
        allShortWords,
        disabledChecks
      );
      issues.push(...fileIssues);
    } catch (error) {
      console.warn(`Skipping ${file} due to parse error:`, error);
    }
  }

  return issues;
}

function analyzeFileNamingAST(
  file: string,
  ast: TSESTree.Program,
  allAbbreviations: Set<string>,
  allShortWords: Set<string>,
  disabledChecks: Set<string>
): NamingIssue[] {
  const issues: NamingIssue[] = [];
  const scopeTracker = new ScopeTracker(ast);
  const context = buildCodeContext(file, ast);
  const ancestors: TSESTree.Node[] = [];

  // First pass: Build scope tree and track all variables
  traverseAST(ast, {
    enter: (node, parent) => {
      ancestors.push(node);

      // Enter scopes
      if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
        scopeTracker.enterScope('function', node);
        
        // Track parameters
        if ('params' in node) {
          for (const param of node.params) {
            if (param.type === 'Identifier') {
              scopeTracker.declareVariable(param.name, param, getLineNumber(param), {
                isParameter: true,
              });
            } else if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern') {
              // Handle destructured parameters
              extractIdentifiersFromPattern(param, scopeTracker, true);
            }
          }
        }
      } else if (node.type === 'BlockStatement') {
        scopeTracker.enterScope('block', node);
      } else if (isLoopStatement(node)) {
        scopeTracker.enterScope('loop', node);
      } else if (node.type === 'ClassDeclaration') {
        scopeTracker.enterScope('class', node);
      }

      // Track variable declarations
      if (node.type === 'VariableDeclarator') {
        if (node.id.type === 'Identifier') {
          const isInCoverage = isCoverageContext(node, ancestors);
          scopeTracker.declareVariable(
            node.id.name,
            node.id,
            getLineNumber(node.id),
            {
              type: ('typeAnnotation' in node.id) ? (node.id as any).typeAnnotation : null,
              isDestructured: false,
              isLoopVariable: scopeTracker.getCurrentScopeType() === 'loop',
            }
          );
        } else if (node.id.type === 'ObjectPattern' || node.id.type === 'ArrayPattern') {
          extractIdentifiersFromPattern(node.id, scopeTracker, false, ancestors);
        }
      }

      // Track references
      if (node.type === 'Identifier' && parent) {
        // Only count as reference if it's not a declaration
        if (parent.type !== 'VariableDeclarator' || parent.id !== node) {
          if (parent.type !== 'FunctionDeclaration' || parent.id !== node) {
            scopeTracker.addReference(node.name, node);
          }
        }
      }
    },
    leave: (node) => {
      ancestors.pop();

      // Exit scopes
      if (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression' ||
        node.type === 'BlockStatement' ||
        isLoopStatement(node) ||
        node.type === 'ClassDeclaration'
      ) {
        scopeTracker.exitScope();
      }
    },
  });

  // Second pass: Analyze all variables
  const allVariables = scopeTracker.getAllVariables();

  for (const varInfo of allVariables) {
    const name = varInfo.name;
    const line = varInfo.declarationLine;

    // Skip if checks are disabled
    if (disabledChecks.has('single-letter') && name.length === 1) continue;
    if (disabledChecks.has('abbreviation') && name.length <= 3) continue;

    // Check coverage context
    const isInCoverage = ['s', 'b', 'f', 'l'].includes(name) && varInfo.isDestructured;
    if (isInCoverage) continue;

    // Check if acceptable in context
    const functionComplexity = varInfo.node.type === 'Identifier' && 'parent' in varInfo.node
      ? calculateComplexity(varInfo.node as any)
      : context.complexity;
      
    if (isAcceptableInContext(name, context, {
      isLoopVariable: varInfo.isLoopVariable || allAbbreviations.has(name),
      isParameter: varInfo.isParameter,
      isDestructured: varInfo.isDestructured,
      complexity: functionComplexity,
    })) {
      continue;
    }

    // Single letter check
    if (name.length === 1 && !allAbbreviations.has(name) && !allShortWords.has(name)) {
      // Check if short-lived
      const isShortLived = scopeTracker.isShortLived(varInfo, 5);
      if (!isShortLived) {
        issues.push({
          file,
          line,
          type: 'poor-naming',
          identifier: name,
          severity: adjustSeverity('minor', context, 'poor-naming'),
          suggestion: `Use descriptive variable name instead of single letter '${name}'`,
        });
      }
      continue;
    }

    // Abbreviation check (2-3 letters)
    if (name.length >= 2 && name.length <= 3) {
      if (!allShortWords.has(name.toLowerCase()) && !allAbbreviations.has(name.toLowerCase())) {
        // Check if short-lived for abbreviations too
        const isShortLived = scopeTracker.isShortLived(varInfo, 5);
        if (!isShortLived) {
          issues.push({
            file,
            line,
            type: 'abbreviation',
            identifier: name,
            severity: adjustSeverity('info', context, 'abbreviation'),
            suggestion: `Consider using full word instead of abbreviation '${name}'`,
          });
        }
      }
      continue;
    }

    // Snake_case check for TypeScript/JavaScript
    if (!disabledChecks.has('convention-mix') && file.match(/\.(ts|tsx|js|jsx)$/)) {
      if (name.includes('_') && !name.startsWith('_') && name.toLowerCase() === name) {
        const camelCase = name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        issues.push({
          file,
          line,
          type: 'convention-mix',
          identifier: name,
          severity: adjustSeverity('minor', context, 'convention-mix'),
          suggestion: `Use camelCase '${camelCase}' instead of snake_case in TypeScript/JavaScript`,
        });
      }
    }
  }

  // Third pass: Analyze function names
  if (!disabledChecks.has('unclear')) {
    traverseAST(ast, {
      enter: (node) => {
        if (node.type === 'FunctionDeclaration' || node.type === 'MethodDefinition') {
          const name = getFunctionName(node);
          if (!name) return;

          const line = getLineNumber(node);

          // Skip entry points
          if (['main', 'init', 'setup', 'bootstrap'].includes(name)) return;

          // Check for action verbs and patterns
          const hasActionVerb = name.match(/^(get|set|is|has|can|should|create|update|delete|fetch|load|save|process|handle|validate|check|find|search|filter|map|reduce|make|do|run|start|stop|build|parse|format|render|calculate|compute|generate|transform|convert|normalize|sanitize|encode|decode|compress|extract|merge|split|join|sort|compare|test|verify|ensure|apply|execute|invoke|call|emit|dispatch|trigger|listen|subscribe|unsubscribe|add|remove|clear|reset|toggle|enable|disable|open|close|connect|disconnect|send|receive|read|write|import|export|register|unregister|mount|unmount|track|store|persist|upsert|derive|classify|combine|discover|activate|require|assert|expect|mask|escape|sign|put|list|complete|page|safe|mock|pick|pluralize|text|count|detect|select)/);
          
          const isFactoryPattern = name.match(/(Factory|Builder|Creator|Generator|Provider|Adapter|Mock)$/);
          const isEventHandler = name.match(/^on[A-Z]/);
          const isDescriptiveLong = name.length > 15;
          const isReactHook = name.match(/^use[A-Z]/);
          const isHelperPattern = name.match(/^(to|from|with|without|for|as|into)\w+/) || 
                                  name.match(/^\w+(To|From|With|Without|For|As|Into)\w*$/); // xForY, xToY patterns
          const isUtilityName = ['cn', 'proxy', 'sitemap', 'robots', 'gtag'].includes(name);
          const isLanguageKeyword = ['constructor', 'toString', 'valueOf', 'toJSON'].includes(name);
          const isFrameworkPattern = name.match(/^(goto|fill|click|select|submit|wait|expect)\w*/); // Page Object Model, test framework patterns
          
          // Descriptive patterns: countX, totalX, etc.
          const isDescriptivePattern = name.match(/^(default|total|count|sum|avg|max|min|initial|current|previous|next)\w+/) ||
                                       name.match(/\w+(Count|Total|Sum|Average|List|Map|Set|Config|Settings|Options|Props|Data|Info|Details|State|Status|Response|Result)$/);
          
          // Count capital letters for compound detection
          const capitalCount = (name.match(/[A-Z]/g) || []).length;
          const isCompoundWord = capitalCount >= 3; // daysSinceLastCommit has 4 capitals

          if (!hasActionVerb && !isFactoryPattern && !isEventHandler && !isDescriptiveLong && !isReactHook && !isHelperPattern && !isUtilityName && !isDescriptivePattern && !isCompoundWord && !isLanguageKeyword && !isFrameworkPattern) {
            issues.push({
              file,
              line,
              type: 'unclear',
              identifier: name,
              severity: adjustSeverity('info', context, 'unclear'),
              suggestion: `Function '${name}' should start with an action verb (get, set, create, etc.)`,
            });
          }
        }
      },
    });
  }

  return issues;
}

/**
 * Extract all identifiers from a destructuring pattern
 */
function extractIdentifiersFromPattern(
  pattern: TSESTree.ObjectPattern | TSESTree.ArrayPattern,
  scopeTracker: ScopeTracker,
  isParameter: boolean,
  ancestors?: TSESTree.Node[]
): void {
  if (pattern.type === 'ObjectPattern') {
    for (const prop of pattern.properties) {
      if (prop.type === 'Property' && prop.value.type === 'Identifier') {
        scopeTracker.declareVariable(
          prop.value.name,
          prop.value,
          getLineNumber(prop.value),
          {
            isParameter,
            isDestructured: true,
          }
        );
      } else if (prop.type === 'RestElement' && prop.argument.type === 'Identifier') {
        scopeTracker.declareVariable(
          prop.argument.name,
          prop.argument,
          getLineNumber(prop.argument),
          {
            isParameter,
            isDestructured: true,
          }
        );
      }
    }
  } else if (pattern.type === 'ArrayPattern') {
    for (const element of pattern.elements) {
      if (element && element.type === 'Identifier') {
        scopeTracker.declareVariable(
          element.name,
          element,
          getLineNumber(element),
          {
            isParameter,
            isDestructured: true,
          }
        );
      }
    }
  }
}
