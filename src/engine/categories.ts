/**
 * engine/categories.ts
 *
 * Generic category system.
 * Subject domains supply concrete instances; the engine stores and queries them.
 */

// ── Generic interfaces ────────────────────────────────────────────────────────

/** A single selectable question category (e.g. "Multiply", "Silent-e Words") */
export interface CategoryEntry<TId extends string = string> {
    id: TId;
    icon: import('react').ReactNode;
    label: string;
    group: string;
    /** Hidden from the picker UI but still callable programmatically */
    hidden?: boolean;
}
