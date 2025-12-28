/**
 * Rule-based mapping proposal algorithm (non-AI, deterministic)
 * Generates candidate mappings from application requirements/responsibilities to project bullets
 * using keyword overlap and tag matching heuristics.
 */

// Common English stopwords to filter out from scoring
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "should",
  "the",
  "to",
  "was",
  "will",
  "with",
]);

// Minimum score threshold for a match to be considered relevant
const MIN_SCORE_THRESHOLD = 2;

// Maximum number of suggested bullets per item
const MAX_SUGGESTIONS = 3;

// Bonus points for exact tag matches
const TAG_MATCH_BONUS = 3;

/**
 * Normalize text for comparison: lowercase, remove punctuation, collapse whitespace
 * @param {string} text - Input text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  if (!text || typeof text !== "string") return "";

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

/**
 * Tokenize text into words, filtering out stopwords
 * @param {string} text - Normalized text to tokenize
 * @returns {string[]} Array of tokens (non-stopword words)
 */
function tokenize(text) {
  if (!text) return [];

  return text.split(" ").filter((word) => word.length > 0 && !STOPWORDS.has(word));
}

/**
 * Calculate keyword overlap score between an item and a bullet
 * @param {string[]} itemTokens - Tokenized item text
 * @param {string[]} bulletTokens - Tokenized bullet text (text + title + impact combined)
 * @param {string[]} bulletTags - Bullet tags (already normalized to lowercase)
 * @returns {number} Score based on keyword overlap and tag matches
 */
function calculateScore(itemTokens, bulletTokens, bulletTags) {
  let score = 0;

  // Count keyword overlaps
  const bulletTokenSet = new Set(bulletTokens);
  for (const token of itemTokens) {
    if (bulletTokenSet.has(token)) {
      score += 1;
    }
  }

  // Add tag bonus: check if any item token exactly matches a tag
  if (bulletTags && Array.isArray(bulletTags)) {
    const tagSet = new Set(bulletTags.map((tag) => tag.toLowerCase()));
    for (const token of itemTokens) {
      if (tagSet.has(token)) {
        score += TAG_MATCH_BONUS;
      }
    }
  }

  return score;
}

/**
 * Generate mapping proposal for application requirements/responsibilities to project bullets
 * @param {Object} params
 * @param {Array<{kind: string, text: string}>} params.items - Requirements/responsibilities to map
 * @param {Array<{id: string, text: string, title?: string|null, tags?: string[]|null, impact?: string|null}>} params.bullets - Available project bullets
 * @returns {Array<{itemKey: string, kind: string, text: string, suggestedBulletIds: string[], scoreByBulletId: Record<string, number>}>}
 */
export function proposeMapping({ items, bullets }) {
  if (!items || items.length === 0) {
    return [];
  }

  const kindCounters = new Map();
  function nextItemKey(kind) {
    const current = kindCounters.get(kind) ?? 0;
    kindCounters.set(kind, current + 1);
    return `${kind}-${current}`;
  }

  if (!bullets || bullets.length === 0) {
    // No bullets available - return empty suggestions for all items
    return items.map((item) => ({
      itemKey: nextItemKey(item.kind),
      kind: item.kind,
      text: item.text,
      suggestedBulletIds: [],
      scoreByBulletId: {},
    }));
  }

  // Preprocess bullets: normalize and tokenize searchable text
  const processedBullets = bullets.map((bullet) => {
    // Combine text, title, and impact into a single searchable string
    const combinedText = [bullet.text, bullet.title, bullet.impact]
      .filter((field) => field) // Filter out null/undefined
      .join(" ");

    const normalized = normalizeText(combinedText);
    const tokens = tokenize(normalized);

    return {
      id: bullet.id,
      tokens,
      tags: bullet.tags || [],
    };
  });

  // Process each item to generate mapping proposals
  return items.map((item) => {
    const itemKey = nextItemKey(item.kind);
    const normalizedItem = normalizeText(item.text);
    const itemTokens = tokenize(normalizedItem);

    // Calculate scores for all bullets
    const scoreByBulletId = {};
    for (let i = 0; i < bullets.length; i++) {
      const score = calculateScore(itemTokens, processedBullets[i].tokens, processedBullets[i].tags);

      if (score > 0) {
        scoreByBulletId[bullets[i].id] = score;
      }
    }

    // Select top N bullets above threshold
    const rankedBullets = Object.entries(scoreByBulletId)
      .filter(([_, score]) => score >= MIN_SCORE_THRESHOLD)
      .sort((a, b) => {
        const scoreDiff = b[1] - a[1];
        if (scoreDiff !== 0) return scoreDiff;
        return a[0].localeCompare(b[0]);
      })
      .slice(0, MAX_SUGGESTIONS)
      .map(([bulletId, _]) => bulletId);

    return {
      itemKey,
      kind: item.kind,
      text: item.text,
      suggestedBulletIds: rankedBullets,
      scoreByBulletId: rankedBullets.length > 0 ? scoreByBulletId : {},
    };
  });
}
