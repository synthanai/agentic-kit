/**
 * Shared constants and utilities for naming analysis
 * Extracted from naming.ts and naming-ast.ts to reduce duplication
 */

// Common short English words that are NOT abbreviations (full, valid words)
export const COMMON_SHORT_WORDS = new Set([
  // Full English words (1-3 letters)
  'day', 'key', 'net', 'to', 'go', 'for', 'not', 'new', 'old', 'top', 'end',
  'run', 'try', 'use', 'get', 'set', 'add', 'put', 'map', 'log', 'row', 'col',
  'tab', 'box', 'div', 'nav', 'tag', 'any', 'all', 'one', 'two', 'out', 'off',
  'on', 'yes', 'no', 'now', 'max', 'min', 'sum', 'avg', 'ref', 'src', 'dst',
  'raw', 'def', 'sub', 'pub', 'pre', 'mid', 'alt', 'opt', 'tmp', 'ext', 'sep',
  // Prepositions and conjunctions
  'and', 'from', 'how', 'pad', 'bar', 'non',
  // Additional full words commonly flagged
  'tax', 'cat', 'dog', 'car', 'bus', 'web', 'app', 'war', 'law', 'pay', 'buy',
  'win', 'cut', 'hit', 'hot', 'pop', 'job', 'age', 'act', 'let', 'lot', 'bad',
  'big', 'far', 'few', 'own', 'per', 'red', 'low', 'see', 'six', 'ten', 'way',
  'who', 'why', 'yet', 'via', 'due', 'fee', 'fun', 'gas', 'gay', 'god', 'gun',
  'guy', 'ice', 'ill', 'kid', 'mad', 'man', 'mix', 'mom', 'mrs', 'nor', 'odd',
  'oil', 'pan', 'pet', 'pit', 'pot', 'pow', 'pro', 'raw', 'rep', 'rid', 'sad',
  'sea', 'sit', 'sky', 'son', 'tea', 'tie', 'tip', 'van', 'war', 'win', 'won'
]);

// Comprehensive list of acceptable abbreviations and acronyms
export const ACCEPTABLE_ABBREVIATIONS = new Set([
  // Standard identifiers
  'id', 'uid', 'gid', 'pid',
  // Loop counters and iterators
  'i', 'j', 'k', 'n', 'm',
  // Web/Network
  'url', 'uri', 'api', 'cdn', 'dns', 'ip', 'tcp', 'udp', 'http', 'ssl', 'tls',
  'utm', 'seo', 'rss', 'xhr', 'ajax', 'cors', 'ws', 'wss',
  // Data formats
  'json', 'xml', 'yaml', 'csv', 'html', 'css', 'svg', 'pdf',
  // File types & extensions
  'img', 'txt', 'doc', 'docx', 'xlsx', 'ppt', 'md', 'rst', 'jpg', 'png', 'gif',
  // Databases
  'db', 'sql', 'orm', 'dao', 'dto', 'ddb', 'rds', 'nosql',
  // File system
  'fs', 'dir', 'tmp', 'src', 'dst', 'bin', 'lib', 'pkg',
  // Operating system
  'os', 'env', 'arg', 'cli', 'cmd', 'exe', 'cwd', 'pwd',
  // UI/UX
  'ui', 'ux', 'gui', 'dom', 'ref',
  // Request/Response
  'req', 'res', 'ctx', 'err', 'msg', 'auth',
  // Mathematics/Computing
  'max', 'min', 'avg', 'sum', 'abs', 'cos', 'sin', 'tan', 'log', 'exp',
  'pow', 'sqrt', 'std', 'var', 'int', 'num', 'idx',
  // Time
  'now', 'utc', 'tz', 'ms', 'sec', 'hr', 'min', 'yr', 'mo',
  // Common patterns
  'app', 'cfg', 'config', 'init', 'len', 'val', 'str', 'obj', 'arr',
  'gen', 'def', 'raw', 'new', 'old', 'pre', 'post', 'sub', 'pub',
  // Programming/Framework specific
  'ts', 'js', 'jsx', 'tsx', 'py', 'rb', 'vue', 're', 'fn', 'fns', 'mod', 'opts', 'dev',
  // Cloud/Infrastructure
  's3', 'ec2', 'sqs', 'sns', 'vpc', 'ami', 'iam', 'acl', 'elb', 'alb', 'nlb', 'aws',
  'ses', 'gst', 'cdk', 'btn', 'buf', 'agg', 'ocr', 'ai', 'cf', 'cfn', 'ga',
  // Metrics/Performance
  'fcp', 'lcp', 'cls', 'ttfb', 'tti', 'fid', 'fps', 'qps', 'rps', 'tps', 'wpm',
  // Testing & i18n
  'po', 'e2e', 'a11y', 'i18n', 'l10n', 'spy',
  // Domain-specific abbreviations (context-aware)
  'sk', 'fy', 'faq', 'og', 'seo', 'cta', 'roi', 'kpi', 'ttl', 'pct',
  // Technical abbreviations
  'mac', 'hex', 'esm', 'git', 'rec', 'loc', 'dup',
  // Boolean helpers (these are intentional short names)
  'is', 'has', 'can', 'did', 'was', 'are',
  // Date/Time context (when in date contexts)
  'd', 't', 'dt',
  // Coverage metrics (industry standard: statements/branches/functions/lines)
  's', 'b', 'f', 'l',
  // Common media/content abbreviations
  'vid', 'pic', 'img', 'doc', 'msg'
]);

/**
 * Convert snake_case to camelCase
 */
export function snakeCaseToCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Detect naming convention patterns across the codebase
 */
export function detectNamingConventions(
  files: string[], 
  allIssues: Array<{ type: string; [key: string]: any }>
): {
  dominantConvention: 'camelCase' | 'snake_case' | 'PascalCase' | 'mixed';
  conventionScore: number;
} {
  // Count conventions
  const camelCaseCount = allIssues.filter(i => i.type === 'convention-mix').length;
  const totalChecks = files.length * 10; // Rough estimate

  if (camelCaseCount / totalChecks > 0.3) {
    return { dominantConvention: 'mixed', conventionScore: 0.5 };
  }

  // For TypeScript/JavaScript, default to camelCase
  return { dominantConvention: 'camelCase', conventionScore: 0.9 };
}
