/** Shared left-chevron SVG icon — used in back buttons across immersive pages. */
export function ChevronLeft({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
        </svg>
    );
}
