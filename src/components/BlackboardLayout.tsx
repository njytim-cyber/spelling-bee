import type { ReactNode } from 'react';

export function BlackboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="blackboard-bg relative w-full h-full overflow-hidden flex flex-col">
            {/* Vignette overlay */}
            <div
                className="pointer-events-none absolute inset-0 z-0 vignette-overlay"
            />
            {/* Content */}
            <div className="relative z-10 flex flex-col w-full h-full">
                {children}
            </div>
        </div>
    );
}
