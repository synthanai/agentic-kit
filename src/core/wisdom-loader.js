/**
 * Wisdom Embeddings Loader
 * 
 * Loads pre-indexed Kural sage metadata for semantic queries.
 * Enables wisdom-augmented context in agentic systems.
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Loaded wisdom embeddings cache
 */
let wisdomCache = null;

/**
 * Load wisdom embeddings from JSON file
 * @returns {Promise<Object>} The wisdom embeddings data
 */
export async function loadWisdomEmbeddings() {
    if (wisdomCache) return wisdomCache;

    try {
        const dataPath = join(__dirname, '../../data/kural-embeddings.json');
        const content = await readFile(dataPath, 'utf-8');
        wisdomCache = JSON.parse(content);
        console.log(`[WISDOM] Loaded ${wisdomCache.sages.length} sages`);
        return wisdomCache;
    } catch (error) {
        console.error('[WISDOM] Failed to load embeddings:', error.message);
        return null;
    }
}

/**
 * Query sages by keyword
 * @param {string} keyword - The keyword to search for
 * @returns {Promise<Array>} Matching sages
 */
export async function querySagesByKeyword(keyword) {
    const data = await loadWisdomEmbeddings();
    if (!data) return [];

    const normalizedKeyword = keyword.toLowerCase();

    // Check query hints first
    if (data.queryHints[normalizedKeyword]) {
        const hintedIds = data.queryHints[normalizedKeyword];
        return data.sages.filter(s => hintedIds.includes(s.id));
    }

    // Fall back to keyword match in sage data
    return data.sages.filter(sage => {
        return sage.keywords?.some(k => k.toLowerCase().includes(normalizedKeyword)) ||
            sage.focus.toLowerCase().includes(normalizedKeyword) ||
            sage.name.toLowerCase().includes(normalizedKeyword);
    });
}

/**
 * Get sage by ID
 * @param {string} id - The sage ID
 * @returns {Promise<Object|null>} The sage or null
 */
export async function getSageById(id) {
    const data = await loadWisdomEmbeddings();
    if (!data) return null;
    return data.sages.find(s => s.id === id) || null;
}

/**
 * Get all sages
 * @returns {Promise<Array>} All sages
 */
export async function getAllSages() {
    const data = await loadWisdomEmbeddings();
    return data?.sages || [];
}

/**
 * Get wisdom context for a query
 * Returns a formatted string suitable for LLM context augmentation
 * @param {string} query - The user's query
 * @returns {Promise<string>} Formatted wisdom context
 */
export async function getWisdomContext(query) {
    const keywords = query.toLowerCase().split(/\s+/);
    const matchingSages = new Set();

    for (const keyword of keywords) {
        const sages = await querySagesByKeyword(keyword);
        sages.forEach(s => matchingSages.add(s));
    }

    if (matchingSages.size === 0) return '';

    const sageArr = Array.from(matchingSages);
    const context = sageArr.map(sage =>
        `**${sage.name}** (${sage.era}): ${sage.focus}\nSource: ${sage.source}`
    ).join('\n\n');

    return `\n--- WISDOM CONTEXT ---\n${context}\n--- END WISDOM ---\n`;
}

export default {
    loadWisdomEmbeddings,
    querySagesByKeyword,
    getSageById,
    getAllSages,
    getWisdomContext
};
