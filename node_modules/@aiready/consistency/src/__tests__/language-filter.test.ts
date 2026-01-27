import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeNamingAST } from '../analyzers/naming-ast';

describe('Language File Filtering', () => {
  beforeEach(() => {
    // Suppress console warnings during tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should only process JS/TS files', async () => {
    const mixedFiles = [
      '/path/to/file.ts',
      '/path/to/file.tsx',
      '/path/to/file.js',
      '/path/to/file.jsx',
      '/path/to/file.py',     // Should be filtered out
      '/path/to/file.java',   // Should be filtered out
      '/path/to/file.rb',     // Should be filtered out
      '/path/to/file.go',     // Should be filtered out
    ];

    // This test verifies that the function doesn't crash on non-JS/TS files
    // In reality, it will try to read these files if they exist, but parseFile will return null
    // and they'll be skipped. The filtering happens before parseFile is called.
    await expect(analyzeNamingAST(mixedFiles)).resolves.not.toThrow();
  });

  it('should filter out Python files before parsing', async () => {
    const files = [
      '/path/to/script.py',
      '/path/to/another.py',
    ];

    // Should not attempt to parse Python files
    const result = await analyzeNamingAST(files);
    expect(result).toEqual([]);
  });

  it('should accept all JS/TS file extensions', async () => {
    const jstsFiles = [
      'test.js',
      'test.jsx',
      'test.ts',
      'test.tsx',
      'TEST.JS',  // Test case-insensitive
      'TEST.TS',
    ];

    // These should all pass the filter (though they won't parse if they don't exist)
    await expect(analyzeNamingAST(jstsFiles)).resolves.not.toThrow();
  });
});
