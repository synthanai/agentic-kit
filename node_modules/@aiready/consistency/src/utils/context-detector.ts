import { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverseAST } from './ast-parser';

export type FileType = 'test' | 'production' | 'config' | 'types';
export type CodeLayer = 'api' | 'business' | 'data' | 'utility' | 'unknown';

export interface CodeContext {
  fileType: FileType;
  codeLayer: CodeLayer;
  complexity: number;
  isTestFile: boolean;
  isTypeDefinition: boolean;
}

/**
 * Detect the file type based on file path and content
 */
export function detectFileType(filePath: string, ast: TSESTree.Program): FileType {
  const path = filePath.toLowerCase();
  
  // Test files
  if (path.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/) || path.includes('__tests__')) {
    return 'test';
  }
  
  // Type definition files
  if (path.endsWith('.d.ts') || path.includes('types')) {
    return 'types';
  }
  
  // Config files
  if (path.match(/config|\.config\.|rc\.|setup/) || path.includes('configuration')) {
    return 'config';
  }
  
  return 'production';
}

/**
 * Detect the code layer based on imports and exports
 */
export function detectCodeLayer(ast: TSESTree.Program): CodeLayer {
  let hasAPIIndicators = 0;
  let hasBusinessIndicators = 0;
  let hasDataIndicators = 0;
  let hasUtilityIndicators = 0;
  
  traverseAST(ast, {
    enter: (node) => {
      // Check imports
      if (node.type === 'ImportDeclaration') {
        const source = node.source.value as string;
        
        if (source.match(/express|fastify|koa|@nestjs|axios|fetch|http/i)) {
          hasAPIIndicators++;
        }
        if (source.match(/database|prisma|typeorm|sequelize|mongoose|pg|mysql/i)) {
          hasDataIndicators++;
        }
      }
      
      // Check function names for layer indicators
      if (node.type === 'FunctionDeclaration' && node.id) {
        const name = node.id.name;
        
        // API layer patterns
        if (name.match(/^(get|post|put|delete|patch|handle|api|route|controller)/i)) {
          hasAPIIndicators++;
        }
        
        // Business logic patterns
        if (name.match(/^(calculate|process|validate|transform|compute|analyze)/i)) {
          hasBusinessIndicators++;
        }
        
        // Data layer patterns
        if (name.match(/^(find|create|update|delete|save|fetch|query|insert)/i)) {
          hasDataIndicators++;
        }
        
        // Utility patterns
        if (name.match(/^(format|parse|convert|normalize|sanitize|encode|decode)/i)) {
          hasUtilityIndicators++;
        }
      }
      
      // Check for exports
      if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
        // Functions exported with "api", "handler", "route" suggest API layer
        if (node.type === 'ExportNamedDeclaration' && node.declaration) {
          if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
            const name = node.declaration.id.name;
            if (name.match(/handler|route|api|controller/i)) {
              hasAPIIndicators += 2; // Stronger signal
            }
          }
        }
      }
    },
  });
  
  // Determine layer based on indicators
  const scores = {
    api: hasAPIIndicators,
    business: hasBusinessIndicators,
    data: hasDataIndicators,
    utility: hasUtilityIndicators,
  };
  
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    return 'unknown';
  }
  
  // Return the layer with highest score
  if (scores.api === maxScore) return 'api';
  if (scores.data === maxScore) return 'data';
  if (scores.business === maxScore) return 'business';
  if (scores.utility === maxScore) return 'utility';
  
  return 'unknown';
}

/**
 * Calculate cyclomatic complexity for a function
 */
export function calculateComplexity(node: TSESTree.Node): number {
  let complexity = 1; // Base complexity
  
  traverseAST(node, {
    enter: (childNode) => {
      // Each decision point adds 1 to complexity
      switch (childNode.type) {
        case 'IfStatement':
        case 'ConditionalExpression': // ternary
        case 'SwitchCase':
        case 'ForStatement':
        case 'ForInStatement':
        case 'ForOfStatement':
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'CatchClause':
          complexity++;
          break;
        case 'LogicalExpression':
          // && and || add complexity
          if (childNode.operator === '&&' || childNode.operator === '||') {
            complexity++;
          }
          break;
      }
    },
  });
  
  return complexity;
}

/**
 * Build a complete context for a file
 */
export function buildCodeContext(filePath: string, ast: TSESTree.Program): CodeContext {
  const fileType = detectFileType(filePath, ast);
  const codeLayer = detectCodeLayer(ast);
  
  // Calculate average complexity of functions in file
  let totalComplexity = 0;
  let functionCount = 0;
  
  traverseAST(ast, {
    enter: (node) => {
      if (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression'
      ) {
        totalComplexity += calculateComplexity(node);
        functionCount++;
      }
    },
  });
  
  const avgComplexity = functionCount > 0 ? totalComplexity / functionCount : 1;
  
  return {
    fileType,
    codeLayer,
    complexity: Math.round(avgComplexity),
    isTestFile: fileType === 'test',
    isTypeDefinition: fileType === 'types',
  };
}

/**
 * Get context-adjusted severity based on code context
 */
export function adjustSeverity(
  baseSeverity: 'info' | 'minor' | 'major' | 'critical',
  context: CodeContext,
  issueType: string
): 'info' | 'minor' | 'major' | 'critical' {
  // Test files: Be more lenient
  if (context.isTestFile) {
    if (baseSeverity === 'minor') return 'info';
    if (baseSeverity === 'major') return 'minor';
  }
  
  // Type definition files: Be more lenient (often use short generic names)
  if (context.isTypeDefinition) {
    if (baseSeverity === 'minor') return 'info';
  }
  
  // API layer: Be stricter (public interface)
  if (context.codeLayer === 'api') {
    if (baseSeverity === 'info' && issueType === 'unclear') return 'minor';
    if (baseSeverity === 'minor' && issueType === 'unclear') return 'major';
  }
  
  // High complexity: Be stricter (need clearer names)
  if (context.complexity > 10) {
    if (baseSeverity === 'info') return 'minor';
  }
  
  // Utility/helper layer: Allow shorter names
  if (context.codeLayer === 'utility') {
    if (baseSeverity === 'minor' && issueType === 'abbreviation') return 'info';
  }
  
  return baseSeverity;
}

/**
 * Check if a short variable name is acceptable in this context
 */
export function isAcceptableInContext(
  name: string,
  context: CodeContext,
  options: {
    isLoopVariable?: boolean;
    isParameter?: boolean;
    isDestructured?: boolean;
    complexity?: number;
  }
): boolean {
  // Loop variables always acceptable
  if (options.isLoopVariable && ['i', 'j', 'k', 'l', 'n', 'm'].includes(name)) {
    return true;
  }
  
  // Test files: More lenient
  if (context.isTestFile) {
    // Common test patterns: a/b for comparison, x/y for coordinates
    if (['a', 'b', 'c', 'x', 'y', 'z'].includes(name) && options.isParameter) {
      return true;
    }
  }
  
  // Math/graphics context: x, y, z acceptable
  if (context.codeLayer === 'utility' && ['x', 'y', 'z'].includes(name)) {
    return true;
  }
  
  // Destructured from well-named source: More lenient
  if (options.isDestructured) {
    // Coverage metrics s/b/f/l always acceptable when destructured
    if (['s', 'b', 'f', 'l'].includes(name)) {
      return true;
    }
  }
  
  // Simple functions (complexity < 3): Allow short parameter names
  if (options.isParameter && (options.complexity ?? context.complexity) < 3) {
    if (name.length >= 2) {
      return true; // Two-letter names OK in simple functions
    }
  }
  
  return false;
}
