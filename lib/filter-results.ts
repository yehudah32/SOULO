/**
 * Server-side results filtering.
 * Strips premium content from results for free users.
 * This is the REAL security gate — frontend blur is cosmetic.
 */

// Fields that free users can see (the type reveal — section 0)
const FREE_FIELDS = new Set([
  'leading_type',
  'core_type',
  'type_name',
  'core_type_name',
  'defiant_spirit_type_name',
  'headline',
  'confidence_pct',
  'confidence',
  '_accessLevel',
]);

/**
 * Filter results based on access level.
 * - 'full': returns everything unchanged
 * - 'free': strips all premium content, returns only type reveal data
 */
export function filterResults(
  results: Record<string, unknown>,
  accessLevel: 'full' | 'free'
): Record<string, unknown> {
  if (accessLevel === 'full') {
    return { ...results, _accessLevel: 'full' };
  }

  // Free tier — only return the reveal fields
  const filtered: Record<string, unknown> = { _accessLevel: 'free' };

  for (const key of FREE_FIELDS) {
    if (key in results) {
      filtered[key] = results[key];
    }
  }

  // Add teaser hints — just enough to show there's content, but not the content itself
  filtered._teaserSections = [
    { id: 'superpower', label: 'Your Superpower & Kryptonite', locked: true },
    { id: 'react-respond', label: 'React & Respond Patterns', locked: true },
    { id: 'oyn', label: 'OYN Dimensions', locked: true },
    { id: 'wing', label: 'Wing & Variant', locked: true },
    { id: 'tritype', label: 'Tritype Analysis', locked: true },
    { id: 'domains', label: 'Life Domain Insights', locked: true },
    { id: 'famous', label: 'Famous Figures Like You', locked: true },
    { id: 'relationships', label: 'Relationship Dynamics', locked: true },
    { id: 'lines', label: 'Stress & Release Lines', locked: true },
    { id: 'personality-systems', label: 'Personality Systems Analysis', locked: true },
  ];

  return filtered;
}
