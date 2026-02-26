/**
 * utils/printStudySheet.ts
 *
 * Generates a printable study sheet in a new window via browser print dialog.
 * Uses DOM manipulation (not document.write) for security.
 */
import type { WordRecord } from '../hooks/useWordHistory';
import type { SpellingWord } from '../domains/spelling/words/types';

const BOX_LABELS = ['New', 'Learning', 'Reviewing', 'Almost', 'Mastered'];

/**
 * Opens a print-friendly study sheet in a new window.
 * Lists words with pronunciation, POS, definition, mastery status, and accuracy.
 */
export function printStudySheet(
    title: string,
    records: WordRecord[],
    wordMap: Map<string, SpellingWord>,
): void {
    const w = window.open('', '_blank');
    if (!w) return;

    const doc = w.document;

    // Build style
    const style = doc.createElement('style');
    style.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #333; padding: 24px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .meta { color: #888; font-size: 10px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; border-bottom: 2px solid #333; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { border-bottom: 1px solid #eee; padding: 5px 8px; vertical-align: top; }
        tr:nth-child(even) { background: #fafafa; }
        @media print {
            body { padding: 12px; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            @page { margin: 0.5in; }
        }
    `;
    doc.head.appendChild(style);
    doc.title = title;

    // Title
    const h1 = doc.createElement('h1');
    h1.textContent = title;
    doc.body.appendChild(h1);

    // Meta
    const meta = doc.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${records.length} words \u00b7 Printed ${new Date().toLocaleDateString()}`;
    doc.body.appendChild(meta);

    // Table
    const table = doc.createElement('table');
    const thead = doc.createElement('thead');
    const headerRow = doc.createElement('tr');
    for (const label of ['Word', 'Pronunciation', 'POS', 'Definition', 'Status', 'Accuracy']) {
        const th = doc.createElement('th');
        th.textContent = label;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = doc.createElement('tbody');
    for (const r of records) {
        const detail = wordMap.get(r.word);
        const acc = r.attempts > 0 ? Math.round((r.correct / r.attempts) * 100) : 0;
        const box = BOX_LABELS[Math.min(r.box, 4)];

        const tr = doc.createElement('tr');
        const cells = [
            r.word,
            detail?.pronunciation ?? '',
            detail?.partOfSpeech ?? '',
            detail?.definition ?? '',
            box,
            `${acc}%`,
        ];
        for (let i = 0; i < cells.length; i++) {
            const td = doc.createElement('td');
            if (i === 0) {
                const strong = doc.createElement('strong');
                strong.textContent = cells[i];
                td.appendChild(strong);
            } else {
                td.textContent = cells[i];
            }
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    doc.body.appendChild(table);

    // Auto-print
    w.print();
}
