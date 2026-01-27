import type { DependencyGraph, CoUsageData, TypeDependency, DomainAssignment, DomainSignals } from './types';

/**
 * Build co-usage matrix: track which files are imported together
 * 
 * Files frequently imported together likely belong to the same semantic domain
 */
export function buildCoUsageMatrix(graph: DependencyGraph): Map<string, Map<string, number>> {
  const coUsageMatrix = new Map<string, Map<string, number>>();
  
  // For each file, track which other files are imported alongside it
  for (const [sourceFile, node] of graph.nodes) {
    const imports = node.imports;
    
    // For each pair of imports in this file, increment their co-usage count
    for (let i = 0; i < imports.length; i++) {
      const fileA = imports[i];
      
      if (!coUsageMatrix.has(fileA)) {
        coUsageMatrix.set(fileA, new Map());
      }
      
      for (let j = i + 1; j < imports.length; j++) {
        const fileB = imports[j];
        
        // Increment bidirectional co-usage count
        const fileAUsage = coUsageMatrix.get(fileA)!;
        fileAUsage.set(fileB, (fileAUsage.get(fileB) || 0) + 1);
        
        if (!coUsageMatrix.has(fileB)) {
          coUsageMatrix.set(fileB, new Map());
        }
        const fileBUsage = coUsageMatrix.get(fileB)!;
        fileBUsage.set(fileA, (fileBUsage.get(fileA) || 0) + 1);
      }
    }
  }
  
  return coUsageMatrix;
}

/**
 * Extract type dependencies from AST exports
 * 
 * Files that share types are semantically related
 */
export function buildTypeGraph(graph: DependencyGraph): Map<string, Set<string>> {
  const typeGraph = new Map<string, Set<string>>();
  
  for (const [file, node] of graph.nodes) {
    for (const exp of node.exports) {
      if (exp.typeReferences) {
        for (const typeRef of exp.typeReferences) {
          if (!typeGraph.has(typeRef)) {
            typeGraph.set(typeRef, new Set());
          }
          typeGraph.get(typeRef)!.add(file);
        }
      }
    }
  }
  
  return typeGraph;
}

/**
 * Find semantic clusters using co-usage patterns
 * 
 * Files with high co-usage counts belong in the same cluster
 */
export function findSemanticClusters(
  coUsageMatrix: Map<string, Map<string, number>>,
  minCoUsage: number = 3
): Map<string, string[]> {
  const clusters = new Map<string, string[]>();
  const visited = new Set<string>();
  
  // Simple clustering: group files with high co-usage
  for (const [file, coUsages] of coUsageMatrix) {
    if (visited.has(file)) continue;
    
    const cluster: string[] = [file];
    visited.add(file);
    
    // Find strongly related files (co-imported >= minCoUsage times)
    for (const [relatedFile, count] of coUsages) {
      if (count >= minCoUsage && !visited.has(relatedFile)) {
        cluster.push(relatedFile);
        visited.add(relatedFile);
      }
    }
    
    if (cluster.length > 1) {
      // Use first file as cluster ID
      clusters.set(file, cluster);
    }
  }
  
  return clusters;
}

/**
 * Calculate confidence score for domain assignment based on multiple signals
 */
export function calculateDomainConfidence(signals: DomainSignals): number {
  const weights = {
    coUsage: 0.35,        // Strongest signal: actual usage patterns
    typeReference: 0.30,   // Strong signal: shared types
    exportName: 0.15,      // Medium signal: identifier semantics
    importPath: 0.10,      // Weaker signal: path structure
    folderStructure: 0.10  // Weakest signal: organization convention
  };
  
  let confidence = 0;
  if (signals.coUsage) confidence += weights.coUsage;
  if (signals.typeReference) confidence += weights.typeReference;
  if (signals.exportName) confidence += weights.exportName;
  if (signals.importPath) confidence += weights.importPath;
  if (signals.folderStructure) confidence += weights.folderStructure;
  
  return confidence;
}

/**
 * Infer domain from semantic analysis (co-usage + types)
 * 
 * This replaces the folder-based heuristic with actual code relationships
 */
export function inferDomainFromSemantics(
  file: string,
  exportName: string,
  graph: DependencyGraph,
  coUsageMatrix: Map<string, Map<string, number>>,
  typeGraph: Map<string, Set<string>>,
  exportTypeRefs?: string[]
): DomainAssignment[] {
  const assignments: DomainAssignment[] = [];
  const domainSignals = new Map<string, DomainSignals>();
  
  // 1. Check co-usage patterns
  const coUsages = coUsageMatrix.get(file) || new Map();
  const strongCoUsages = Array.from(coUsages.entries())
    .filter(([_, count]) => count >= 3)
    .map(([coFile]) => coFile);
  
  // Extract domains from frequently co-imported files
  for (const coFile of strongCoUsages) {
    const coNode = graph.nodes.get(coFile);
    if (coNode) {
      for (const exp of coNode.exports) {
        if (exp.inferredDomain && exp.inferredDomain !== 'unknown') {
          const domain = exp.inferredDomain;
          if (!domainSignals.has(domain)) {
            domainSignals.set(domain, {
              coUsage: false,
              typeReference: false,
              exportName: false,
              importPath: false,
              folderStructure: false
            });
          }
          domainSignals.get(domain)!.coUsage = true;
        }
      }
    }
  }
  
  // 2. Check type references
  if (exportTypeRefs) {
    for (const typeRef of exportTypeRefs) {
      const filesWithType = typeGraph.get(typeRef);
      if (filesWithType) {
        for (const typeFile of filesWithType) {
          if (typeFile !== file) {
            const typeNode = graph.nodes.get(typeFile);
            if (typeNode) {
              for (const exp of typeNode.exports) {
                if (exp.inferredDomain && exp.inferredDomain !== 'unknown') {
                  const domain = exp.inferredDomain;
                  if (!domainSignals.has(domain)) {
                    domainSignals.set(domain, {
                      coUsage: false,
                      typeReference: false,
                      exportName: false,
                      importPath: false,
                      folderStructure: false
                    });
                  }
                  domainSignals.get(domain)!.typeReference = true;
                }
              }
            }
          }
        }
      }
    }
  }
  
  // 3. Build domain assignments with confidence scores
  for (const [domain, signals] of domainSignals) {
    const confidence = calculateDomainConfidence(signals);
    if (confidence >= 0.3) { // Minimum confidence threshold
      assignments.push({ domain, confidence, signals });
    }
  }
  
  // Sort by confidence (highest first)
  assignments.sort((a, b) => b.confidence - a.confidence);
  
  return assignments;
}

/**
 * Get co-usage data for a specific file
 */
export function getCoUsageData(
  file: string,
  coUsageMatrix: Map<string, Map<string, number>>
): CoUsageData {
  const coImportedWith = coUsageMatrix.get(file) || new Map();
  
  // Find files that import both this file and others
  const sharedImporters: string[] = [];
  // This would require inverse mapping from imports, simplified for now
  
  return {
    file,
    coImportedWith,
    sharedImporters
  };
}

/**
 * Find files that should be consolidated based on semantic similarity
 * 
 * High co-usage + shared types = strong consolidation candidate
 */
export function findConsolidationCandidates(
  graph: DependencyGraph,
  coUsageMatrix: Map<string, Map<string, number>>,
  typeGraph: Map<string, Set<string>>,
  minCoUsage: number = 5,
  minSharedTypes: number = 2
): Array<{ files: string[]; reason: string; strength: number }> {
  const candidates: Array<{ files: string[]; reason: string; strength: number }> = [];
  
  // Find file pairs with both high co-usage AND shared types
  for (const [fileA, coUsages] of coUsageMatrix) {
    const nodeA = graph.nodes.get(fileA);
    if (!nodeA) continue;
    
    for (const [fileB, coUsageCount] of coUsages) {
      if (fileB <= fileA) continue; // Avoid duplicates
      if (coUsageCount < minCoUsage) continue;
      
      const nodeB = graph.nodes.get(fileB);
      if (!nodeB) continue;
      
      // Count shared types
      const typesA = new Set(nodeA.exports.flatMap(e => e.typeReferences || []));
      const typesB = new Set(nodeB.exports.flatMap(e => e.typeReferences || []));
      const sharedTypes = Array.from(typesA).filter(t => typesB.has(t));
      
      if (sharedTypes.length >= minSharedTypes) {
        const strength = (coUsageCount / 10) + (sharedTypes.length / 5);
        candidates.push({
          files: [fileA, fileB],
          reason: `High co-usage (${coUsageCount}x) and ${sharedTypes.length} shared types`,
          strength
        });
      } else if (coUsageCount >= minCoUsage * 2) {
        // Very high co-usage alone is enough
        const strength = coUsageCount / 10;
        candidates.push({
          files: [fileA, fileB],
          reason: `Very high co-usage (${coUsageCount}x)`,
          strength
        });
      }
    }
  }
  
  // Sort by strength (highest first)
  candidates.sort((a, b) => b.strength - a.strength);
  
  return candidates;
}
