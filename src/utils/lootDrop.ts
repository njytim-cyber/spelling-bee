/**
 * utils/lootDrop.ts
 *
 * Loot drop system: picks a random unowned loot-exclusive chalk theme
 * during mid-session surprise events. Tracks dropped items in localStorage.
 */
import { CHALK_THEMES } from './chalkThemes';
import { STORAGE_KEYS } from '../config';
import { trackEvent } from './analytics';

/** All chalk theme IDs that can only be obtained via loot drops */
export const LOOT_DROP_THEME_IDS = CHALK_THEMES
    .filter(t => t.lootDrop)
    .map(t => t.id);

/** Get the set of already-dropped cosmetic IDs from localStorage */
export function getDroppedCosmetics(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.droppedCosmetics);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

/** Save the set of dropped cosmetic IDs to localStorage */
function saveDroppedCosmetics(dropped: Set<string>): void {
    localStorage.setItem(STORAGE_KEYS.droppedCosmetics, JSON.stringify([...dropped]));
}

/**
 * Pick a random loot drop item the user doesn't already own.
 * Returns the theme ID and name, or null if all items are already owned.
 */
export function rollLootDrop(): { id: string; name: string } | null {
    const dropped = getDroppedCosmetics();
    const available = CHALK_THEMES.filter(t => t.lootDrop && !dropped.has(t.id));
    if (available.length === 0) return null;

    const pick = available[Math.floor(Math.random() * available.length)];

    // Record the drop
    dropped.add(pick.id);
    saveDroppedCosmetics(dropped);

    trackEvent('loot_drop', { item: pick.id });
    return { id: pick.id, name: pick.name };
}

/** Check if a theme ID was obtained via loot drop */
export function isLootDropOwned(themeId: string): boolean {
    return getDroppedCosmetics().has(themeId);
}
