/**
 * engine/categories.ts
 *
 * Generic category / age-band system.
 * Subject domains supply concrete instances; the engine stores and queries them.
 */

// ── Generic interfaces ────────────────────────────────────────────────────────

/** A single selectable question category (e.g. "Multiply", "Silent-e Words") */
export interface CategoryEntry<TId extends string = string> {
    id: TId;
    icon: string;
    label: string;
    group: string;
    /** Hidden from the picker UI but still callable programmatically */
    hidden?: boolean;
}

/** Difficulty band (e.g. 'k2' | '35' | '6+') */
export interface BandEntry<TBand extends string = string> {
    id: TBand;
    emoji: string;
    label: string;
    /** Which category groups are visible in this band */
    groups: Set<string>;
    /** Default category ID when entering this band */
    defaultCategoryId: string;
}

// ── Generic utility functions ─────────────────────────────────────────────────

/**
 * Returns categories whose group is visible for the given band.
 */
export function typesForBand<TId extends string>(
    bandId: string,
    bands: readonly BandEntry[],
    categories: readonly CategoryEntry<TId>[],
): ReadonlyArray<CategoryEntry<TId>> {
    const band = bands.find(b => b.id === bandId);
    if (!band) return [];
    return categories.filter(c => band.groups.has(c.group)) as CategoryEntry<TId>[];
}

/**
 * Returns the default category ID for the given band.
 */
export function defaultTypeForBand(
    bandId: string,
    bands: readonly BandEntry[],
): string {
    return bands.find(b => b.id === bandId)?.defaultCategoryId ?? '';
}
