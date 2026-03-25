import { describe, it, expect } from 'vitest';
import { calculateCohesion } from '../analyzer';
import type { ExportInfo } from '../types';

describe('Enhanced Cohesion Calculation', () => {
  it('should use domain-based cohesion when no import data available', () => {
    const exports: ExportInfo[] = [
      { name: 'getUserData', type: 'function', inferredDomain: 'user' },
      { name: 'getProductData', type: 'function', inferredDomain: 'product' },
    ];

    const cohesion = calculateCohesion(exports);
    
    // With mixed domains (user, product) and no import data, should use domain-based calculation
    // Domain entropy for 2 different domains = low cohesion
    expect(cohesion).toBeLessThan(0.5);
  });

  it('should use import-based cohesion when import data available', () => {
    const exports: ExportInfo[] = [
      {
        name: 'getUserData',
        type: 'function',
        inferredDomain: 'user',
        imports: ['react', 'axios', 'lodash'],
      },
      {
        name: 'getProductData',
        type: 'function',
        inferredDomain: 'product',
        imports: ['react', 'axios', 'lodash'], // Same imports!
      },
    ];

    const cohesion = calculateCohesion(exports);
    
    // Even though domains differ, imports are identical (Jaccard = 1.0)
    // Enhanced cohesion = 0.6 * 1.0 + 0.4 * 0.0 (different domains) = 0.6
    // Should be >= 0.6 (import-based weight)
    expect(cohesion).toBeGreaterThanOrEqual(0.6);
  });

  it('should weight import-based similarity higher than domain-based', () => {
    const exportsWithSharedImports: ExportInfo[] = [
      {
        name: 'getUserData',
        type: 'function',
        inferredDomain: 'user',
        imports: ['react', 'axios'],
      },
      {
        name: 'getProductData',
        type: 'function',
        inferredDomain: 'product',
        imports: ['react', 'axios'],
      },
    ];

    const exportsWithoutSharedImports: ExportInfo[] = [
      {
        name: 'getUserData',
        type: 'function',
        inferredDomain: 'user',
        imports: ['react', 'axios'],
      },
      {
        name: 'getProductData',
        type: 'function',
        inferredDomain: 'product',
        imports: ['lodash', 'moment'],
      },
    ];

    const cohesionWithShared = calculateCohesion(exportsWithSharedImports);
    const cohesionWithoutShared = calculateCohesion(exportsWithoutSharedImports);
    
    // Shared imports should result in higher cohesion
    expect(cohesionWithShared).toBeGreaterThan(cohesionWithoutShared);
  });

  it('should handle mixed case: some exports with imports, some without', () => {
    const exports: ExportInfo[] = [
      {
        name: 'getUserData',
        type: 'function',
        inferredDomain: 'user',
        imports: ['react', 'axios'],
      },
      {
        name: 'getProductData',
        type: 'function',
        inferredDomain: 'product',
        // No imports field
      },
    ];

    const cohesion = calculateCohesion(exports);
    
    // Should fall back to domain-based when not all exports have import data
    expect(cohesion).toBeGreaterThan(0);
    expect(cohesion).toBeLessThan(1);
  });

  it('should return 1 for single export', () => {
    const exports: ExportInfo[] = [
      {
        name: 'getUserData',
        type: 'function',
        inferredDomain: 'user',
        imports: ['react'],
      },
    ];

    expect(calculateCohesion(exports)).toBe(1);
  });

  it('should return 1 for test files regardless of domains or imports', () => {
    const exports: ExportInfo[] = [
      { name: 'testUserLogin', type: 'function', inferredDomain: 'user', imports: ['react'] },
      { name: 'testProductView', type: 'function', inferredDomain: 'product', imports: [] },
    ];

    const cohesion = calculateCohesion(exports, 'src/utils/test-helpers.ts');
    expect(cohesion).toBe(1);
  });
});
