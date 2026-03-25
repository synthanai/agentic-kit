import { TSESTree } from '@typescript-eslint/typescript-estree';

export type ScopeType = 'global' | 'function' | 'block' | 'loop' | 'class';

export interface VariableInfo {
  name: string;
  node: TSESTree.Node;
  declarationLine: number;
  references: TSESTree.Node[];
  type?: TSESTree.TypeNode | null;
  isParameter: boolean;
  isDestructured: boolean;
  isLoopVariable: boolean;
}

export interface Scope {
  type: ScopeType;
  node: TSESTree.Node;
  parent: Scope | null;
  children: Scope[];
  variables: Map<string, VariableInfo>;
}

export class ScopeTracker {
  private currentScope: Scope;
  private readonly rootScope: Scope;
  private readonly allScopes: Scope[] = [];

  constructor(rootNode: TSESTree.Program) {
    this.rootScope = {
      type: 'global',
      node: rootNode,
      parent: null,
      children: [],
      variables: new Map(),
    };
    this.currentScope = this.rootScope;
    this.allScopes.push(this.rootScope);
  }

  /**
   * Enter a new scope
   */
  enterScope(type: ScopeType, node: TSESTree.Node): void {
    const newScope: Scope = {
      type,
      node,
      parent: this.currentScope,
      children: [],
      variables: new Map(),
    };
    
    this.currentScope.children.push(newScope);
    this.currentScope = newScope;
    this.allScopes.push(newScope);
  }

  /**
   * Exit current scope and return to parent
   */
  exitScope(): void {
    if (this.currentScope.parent) {
      this.currentScope = this.currentScope.parent;
    }
  }

  /**
   * Declare a variable in the current scope
   */
  declareVariable(
    name: string,
    node: TSESTree.Node,
    line: number,
    options: {
      type?: TSESTree.TypeNode | null;
      isParameter?: boolean;
      isDestructured?: boolean;
      isLoopVariable?: boolean;
    } = {}
  ): void {
    const varInfo: VariableInfo = {
      name,
      node,
      declarationLine: line,
      references: [],
      type: options.type,
      isParameter: options.isParameter ?? false,
      isDestructured: options.isDestructured ?? false,
      isLoopVariable: options.isLoopVariable ?? false,
    };

    this.currentScope.variables.set(name, varInfo);
  }

  /**
   * Add a reference to a variable
   */
  addReference(name: string, node: TSESTree.Node): void {
    const varInfo = this.findVariable(name);
    if (varInfo) {
      varInfo.references.push(node);
    }
  }

  /**
   * Find a variable in current or parent scopes
   */
  findVariable(name: string): VariableInfo | null {
    let scope: Scope | null = this.currentScope;
    
    while (scope) {
      const varInfo = scope.variables.get(name);
      if (varInfo) {
        return varInfo;
      }
      scope = scope.parent;
    }
    
    return null;
  }

  /**
   * Get all variables in current scope (not including parent scopes)
   */
  getCurrentScopeVariables(): VariableInfo[] {
    return Array.from(this.currentScope.variables.values());
  }

  /**
   * Get all variables across all scopes
   */
  getAllVariables(): VariableInfo[] {
    const allVars: VariableInfo[] = [];
    
    for (const scope of this.allScopes) {
      allVars.push(...Array.from(scope.variables.values()));
    }
    
    return allVars;
  }

  /**
   * Calculate actual usage count (references minus declaration)
   */
  getUsageCount(varInfo: VariableInfo): number {
    return varInfo.references.length;
  }

  /**
   * Check if a variable is short-lived (used within N lines)
   */
  isShortLived(varInfo: VariableInfo, maxLines: number = 5): boolean {
    if (varInfo.references.length === 0) {
      return false; // Unused variable
    }

    const declarationLine = varInfo.declarationLine;
    const maxUsageLine = Math.max(
      ...varInfo.references.map(ref => ref.loc?.start.line ?? declarationLine)
    );

    return (maxUsageLine - declarationLine) <= maxLines;
  }

  /**
   * Check if a variable is used in a limited scope (e.g., only in one callback)
   */
  isLocallyScoped(varInfo: VariableInfo): boolean {
    // If all references are within a small scope (e.g., arrow function), it's locally scoped
    if (varInfo.references.length === 0) return false;
    
    // Check if usage span is small
    const lines = varInfo.references.map(ref => ref.loc?.start.line ?? 0);
    const minLine = Math.min(...lines);
    const maxLine = Math.max(...lines);
    
    return (maxLine - minLine) <= 3;
  }

  /**
   * Get current scope type
   */
  getCurrentScopeType(): ScopeType {
    return this.currentScope.type;
  }

  /**
   * Check if currently in a loop scope
   */
  isInLoop(): boolean {
    let scope: Scope | null = this.currentScope;
    while (scope) {
      if (scope.type === 'loop') {
        return true;
      }
      scope = scope.parent;
    }
    return false;
  }

  /**
   * Check if currently in a function scope
   */
  isInFunction(): boolean {
    let scope: Scope | null = this.currentScope;
    while (scope) {
      if (scope.type === 'function') {
        return true;
      }
      scope = scope.parent;
    }
    return false;
  }

  /**
   * Get the root scope
   */
  getRootScope(): Scope {
    return this.rootScope;
  }
}
