/**
 * utils/shareHelper.ts
 *
 * Centralized share utility. Every share flow should use these helpers
 * to ensure referral codes are always embedded in share text.
 */

/** Append referral link footer to any share text. No-op if no code. */
export function appendReferralFooter(text: string, referralCode?: string): string {
    if (!referralCode) return text;
    return `${text}\n\nJoin free → ${window.location.origin}?ref=${referralCode}`;
}

/** Share via native API, fall back to clipboard. Returns result type. */
export async function shareOrCopy(text: string): Promise<'shared' | 'copied' | 'failed'> {
    try {
        if (navigator.share) {
            await navigator.share({ text });
            return 'shared';
        }
        await navigator.clipboard.writeText(text);
        return 'copied';
    } catch {
        try {
            await navigator.clipboard.writeText(text);
            return 'copied';
        } catch {
            return 'failed';
        }
    }
}
