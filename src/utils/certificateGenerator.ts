/**
 * utils/certificateGenerator.ts
 *
 * Generates printable/downloadable certificates for spelling achievements.
 * Uses html-to-image (already installed) for PNG export and window.print() for printing.
 *
 * Security: All user-provided strings are escaped via esc() before insertion.
 * The HTML is self-contained (no external input) — only our own template + escaped player data.
 */

export type CertificateType = 'level-completion' | 'bee-win' | 'weekly-champion';

export interface CertificateData {
    playerName: string;
    date: string;
    customBranding?: string;
}

export interface LevelCertData extends CertificateData {
    type: 'level-completion';
    level: number;
    wordsMastered: number;
    accuracy: number;
}

export interface BeeWinCertData extends CertificateData {
    type: 'bee-win';
    beeLevel: string;
    roundReached: number;
}

export interface WeeklyChampionCertData extends CertificateData {
    type: 'weekly-champion';
    weekLabel: string;
    xpEarned: number;
}

export type AnyCertificateData = LevelCertData | BeeWinCertData | WeeklyChampionCertData;

function certTitle(data: AnyCertificateData): string {
    switch (data.type) {
        case 'level-completion': return 'Certificate of Achievement';
        case 'bee-win': return 'Spelling Bee Champion';
        case 'weekly-champion': return 'Weekly Champion';
    }
}

function certSubtitle(data: AnyCertificateData): string {
    switch (data.type) {
        case 'level-completion': return `Level ${data.level} Complete`;
        case 'bee-win': return `${data.beeLevel} Bee Winner`;
        case 'weekly-champion': return `Week of ${data.weekLabel}`;
    }
}

function certBodyText(data: AnyCertificateData): string {
    switch (data.type) {
        case 'level-completion':
            return `This certifies that ${data.playerName} has successfully completed Level ${data.level} of Spelling Bee, mastering ${data.wordsMastered} words with ${data.accuracy}% accuracy.`;
        case 'bee-win':
            return `This certifies that ${data.playerName} has won the ${data.beeLevel} Spelling Bee, surviving ${data.roundReached} rounds as the last speller standing.`;
        case 'weekly-champion':
            return `This certifies that ${data.playerName} achieved the #1 rank on the weekly leaderboard for the week of ${data.weekLabel}, earning ${data.xpEarned.toLocaleString()} XP.`;
    }
}

function certEmoji(data: AnyCertificateData): string {
    switch (data.type) {
        case 'level-completion': return '\uD83C\uDF93';
        case 'bee-win': return '\uD83D\uDC1D';
        case 'weekly-champion': return '\uD83D\uDC51';
    }
}

/**
 * Build a certificate DOM element programmatically (no innerHTML).
 * Returns the root element ready for html-to-image or print embedding.
 */
export function buildCertificateElement(data: AnyCertificateData, doc: Document = document): HTMLDivElement {
    const root = doc.createElement('div');
    Object.assign(root.style, {
        width: '1080px', height: '1520px',
        background: '#1a1a24', color: '#fff',
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', padding: '80px', boxSizing: 'border-box',
        textAlign: 'center',
    });

    // Decorative borders
    const border1 = doc.createElement('div');
    Object.assign(border1.style, { position: 'absolute', inset: '40px', border: '3px solid rgba(255,255,255,0.15)', borderRadius: '24px', pointerEvents: 'none' });
    root.appendChild(border1);

    const border2 = doc.createElement('div');
    Object.assign(border2.style, { position: 'absolute', inset: '48px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', pointerEvents: 'none' });
    root.appendChild(border2);

    // Corner ornaments
    const corners = [
        { top: '56px', left: '56px', borderTop: '3px solid rgba(255,215,0,0.4)', borderLeft: '3px solid rgba(255,215,0,0.4)', borderRadius: '4px 0 0 0' },
        { top: '56px', right: '56px', borderTop: '3px solid rgba(255,215,0,0.4)', borderRight: '3px solid rgba(255,215,0,0.4)', borderRadius: '0 4px 0 0' },
        { bottom: '56px', left: '56px', borderBottom: '3px solid rgba(255,215,0,0.4)', borderLeft: '3px solid rgba(255,215,0,0.4)', borderRadius: '0 0 0 4px' },
        { bottom: '56px', right: '56px', borderBottom: '3px solid rgba(255,215,0,0.4)', borderRight: '3px solid rgba(255,215,0,0.4)', borderRadius: '0 0 4px 0' },
    ];
    for (const c of corners) {
        const el = doc.createElement('div');
        Object.assign(el.style, { position: 'absolute', width: '40px', height: '40px', ...c });
        root.appendChild(el);
    }

    // Glow
    const glow = doc.createElement('div');
    Object.assign(glow.style, { position: 'absolute', inset: '0', opacity: '0.08', background: 'radial-gradient(ellipse at 50% 30%, #FFD700 0%, transparent 60%)', pointerEvents: 'none' });
    root.appendChild(glow);

    // Emoji
    const emoji = doc.createElement('div');
    emoji.style.fontSize = '120px';
    emoji.style.marginBottom = '32px';
    emoji.textContent = certEmoji(data);
    root.appendChild(emoji);

    // Title
    const title = doc.createElement('div');
    Object.assign(title.style, { fontSize: '56px', fontWeight: '700', letterSpacing: '2px', color: '#FFD700', marginBottom: '16px' });
    title.textContent = certTitle(data);
    root.appendChild(title);

    // Subtitle
    const subtitle = doc.createElement('div');
    Object.assign(subtitle.style, { fontSize: '28px', opacity: '0.6', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '48px' });
    subtitle.textContent = certSubtitle(data);
    root.appendChild(subtitle);

    // Divider
    const makeDivider = () => {
        const d = doc.createElement('div');
        Object.assign(d.style, { width: '200px', height: '2px', background: 'linear-gradient(90deg,transparent,rgba(255,215,0,0.5),transparent)', marginBottom: '48px' });
        return d;
    };
    root.appendChild(makeDivider());

    // Body
    const body = doc.createElement('div');
    Object.assign(body.style, { fontSize: '24px', lineHeight: '1.6', maxWidth: '800px', opacity: '0.85', marginBottom: '48px' });
    body.textContent = certBodyText(data);
    root.appendChild(body);

    // Divider
    root.appendChild(makeDivider());

    // Date
    const dateEl = doc.createElement('div');
    Object.assign(dateEl.style, { fontSize: '20px', opacity: '0.4' });
    dateEl.textContent = data.date;
    root.appendChild(dateEl);

    // Custom branding
    if (data.customBranding) {
        const brand = doc.createElement('div');
        Object.assign(brand.style, { fontSize: '18px', opacity: '0.5', marginTop: '8px', fontStyle: 'italic' });
        brand.textContent = data.customBranding;
        root.appendChild(brand);
    }

    // App branding
    const appBrand = doc.createElement('div');
    Object.assign(appBrand.style, { position: 'absolute', bottom: '70px', fontSize: '16px', opacity: '0.25', letterSpacing: '3px', textTransform: 'uppercase' });
    appBrand.textContent = 'Spelling Bee';
    root.appendChild(appBrand);

    return root;
}

/** Open a new window with the certificate and trigger print. */
export function printCertificate(data: AnyCertificateData): void {
    const w = window.open('', '_blank');
    if (!w) return;

    const doc = w.document;
    const style = doc.createElement('style');
    style.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #111; }
        @media print {
            body { background: white; }
            @page { size: landscape; margin: 0; }
        }
    `;
    doc.head.appendChild(style);
    doc.title = `Certificate - ${data.playerName}`;

    const certEl = buildCertificateElement(data, doc);
    doc.body.appendChild(certEl);

    w.print();
}

/** Download certificate as PNG using html-to-image. */
export async function downloadCertificateImage(element: HTMLElement, playerName: string): Promise<void> {
    const { toBlob } = await import('html-to-image');
    const blob = await toBlob(element, {
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

    const file = new File([blob], `certificate-${playerName.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
    } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
    }
}
