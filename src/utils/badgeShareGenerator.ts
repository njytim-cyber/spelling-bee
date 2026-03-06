/**
 * utils/badgeShareGenerator.ts
 *
 * Generates shareable 800x800 badge images for unlocked achievements.
 * Uses html-to-image (already installed) for PNG export, native share with download fallback.
 * Follows the same DOM-construction pattern as certificateGenerator.ts.
 */

export interface BadgeShareData {
    achievementName: string;
    achievementDesc: string;
    playerName: string;
    date: string;
    referralCode?: string;
}

/**
 * Build a badge share card DOM element programmatically (no innerHTML).
 * Returns the root element ready for html-to-image.
 */
export function buildBadgeShareElement(data: BadgeShareData, doc: Document = document): HTMLDivElement {
    const root = doc.createElement('div');
    Object.assign(root.style, {
        width: '800px', height: '800px',
        background: '#1a1a24', color: '#fff',
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', padding: '60px', boxSizing: 'border-box',
        textAlign: 'center',
    });

    // Decorative border
    const border = doc.createElement('div');
    Object.assign(border.style, {
        position: 'absolute', inset: '24px',
        border: '2px solid rgba(255,255,255,0.12)', borderRadius: '20px',
        pointerEvents: 'none',
    });
    root.appendChild(border);

    // Corner ornaments
    const corners = [
        { top: '36px', left: '36px', borderTop: '2px solid rgba(255,215,0,0.3)', borderLeft: '2px solid rgba(255,215,0,0.3)', borderRadius: '3px 0 0 0' },
        { top: '36px', right: '36px', borderTop: '2px solid rgba(255,215,0,0.3)', borderRight: '2px solid rgba(255,215,0,0.3)', borderRadius: '0 3px 0 0' },
        { bottom: '36px', left: '36px', borderBottom: '2px solid rgba(255,215,0,0.3)', borderLeft: '2px solid rgba(255,215,0,0.3)', borderRadius: '0 0 0 3px' },
        { bottom: '36px', right: '36px', borderBottom: '2px solid rgba(255,215,0,0.3)', borderRight: '2px solid rgba(255,215,0,0.3)', borderRadius: '0 0 3px 0' },
    ];
    for (const c of corners) {
        const el = doc.createElement('div');
        Object.assign(el.style, { position: 'absolute', width: '28px', height: '28px', ...c });
        root.appendChild(el);
    }

    // Glow
    const glow = doc.createElement('div');
    Object.assign(glow.style, {
        position: 'absolute', inset: '0', opacity: '0.06',
        background: 'radial-gradient(ellipse at 50% 30%, #FFD700 0%, transparent 60%)',
        pointerEvents: 'none',
    });
    root.appendChild(glow);

    // Trophy emoji
    const emoji = doc.createElement('div');
    emoji.style.fontSize = '80px';
    emoji.style.marginBottom = '24px';
    emoji.textContent = '\uD83C\uDFC6'; // 🏆
    root.appendChild(emoji);

    // "Achievement Unlocked"
    const header = doc.createElement('div');
    Object.assign(header.style, {
        fontSize: '16px', letterSpacing: '4px', textTransform: 'uppercase',
        opacity: '0.4', marginBottom: '12px',
    });
    header.textContent = 'Achievement Unlocked';
    root.appendChild(header);

    // Achievement name
    const name = doc.createElement('div');
    Object.assign(name.style, {
        fontSize: '44px', fontWeight: '700', color: '#FFD700',
        marginBottom: '12px', lineHeight: '1.2',
    });
    name.textContent = data.achievementName;
    root.appendChild(name);

    // Description
    const desc = doc.createElement('div');
    Object.assign(desc.style, {
        fontSize: '20px', opacity: '0.6', marginBottom: '32px',
        maxWidth: '600px', lineHeight: '1.4',
    });
    desc.textContent = data.achievementDesc;
    root.appendChild(desc);

    // Divider
    const divider = doc.createElement('div');
    Object.assign(divider.style, {
        width: '160px', height: '2px', marginBottom: '32px',
        background: 'linear-gradient(90deg,transparent,rgba(255,215,0,0.4),transparent)',
    });
    root.appendChild(divider);

    // Player name
    const player = doc.createElement('div');
    Object.assign(player.style, { fontSize: '22px', fontWeight: '600', marginBottom: '8px', opacity: '0.85' });
    player.textContent = data.playerName;
    root.appendChild(player);

    // Date
    const dateEl = doc.createElement('div');
    Object.assign(dateEl.style, { fontSize: '16px', opacity: '0.35' });
    dateEl.textContent = data.date;
    root.appendChild(dateEl);

    // App branding + referral
    const footer = doc.createElement('div');
    Object.assign(footer.style, {
        position: 'absolute', bottom: '40px',
        fontSize: '13px', opacity: '0.2', letterSpacing: '2px', textTransform: 'uppercase',
    });
    footer.textContent = data.referralCode
        ? `Spelling Bee  \u00B7  ${data.referralCode}`
        : 'Spelling Bee';
    root.appendChild(footer);

    return root;
}

/** Generate a badge share image and share/download it. */
export async function shareBadgeImage(data: BadgeShareData): Promise<void> {
    const el = buildBadgeShareElement(data);
    // Temporarily attach off-screen for html-to-image to render
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '0';
    document.body.appendChild(el);

    try {
        const { toBlob } = await import('html-to-image');
        const blob = await toBlob(el, {
            cacheBust: true,
            type: 'image/png',
            pixelRatio: 2,
            filter: (node: Node) => {
                if (node instanceof HTMLLinkElement && node.rel === 'stylesheet' && node.href) {
                    try { return new URL(node.href).origin === window.location.origin; }
                    catch { return true; }
                }
                return true;
            },
        });

        if (!blob) return;

        const safeName = data.achievementName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const file = new File([blob], `badge-${safeName}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                text: `I just unlocked "${data.achievementName}" on Spelling Bee!`,
                files: [file],
            });
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            a.click();
            URL.revokeObjectURL(url);
        }
    } finally {
        document.body.removeChild(el);
    }
}
