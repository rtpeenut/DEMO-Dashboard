'use client';

import { useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import ZoneListPanel from './ZoneListPanel';

export interface ProtectZone {
    id: string;
    pos: [number, number];
    radius: number;
    name: string;
    color: string;
}

interface ProtectSidebarProps {
    onClose?: () => void;
    zones?: ProtectZone[];
    onAddZone?: () => void;
    onDeleteZone?: (id: string) => void;
    isMarking?: boolean; // ✅ สถานะกำลังสร้างวงรัศมี
}

export default function ProtectSidebar({ 
    onClose, 
    zones = [], 
    onAddZone,
    onDeleteZone,
    isMarking = false
}: ProtectSidebarProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [toolbarHeight, setToolbarHeight] = useState<number>(0);

    useEffect(() => {
        const toolbar = document.querySelector('#right-toolbar');
        if (toolbar) {
            const { height } = toolbar.getBoundingClientRect();
            setToolbarHeight(height);
        }
    }, []);

    return (
        <aside
            ref={ref}
            style={{
                height: toolbarHeight ? `${toolbarHeight}px` : 'auto',
                top: '50%',
                transform: 'translateY(-50%)',
                right: '88px',
            }}
            className="absolute right-4 md:right-[88px] z-[1100] w-full md:w-[395px] max-w-[calc(100vw-2rem)] md:max-w-[90vw]
                 rounded-2xl p-3 text-white transition-all flex flex-col font-prompt ui-card ui-slide-from-toolbar"
        >
            {/* Header */}
            <div className="mb-2 flex items-center justify-between rounded-xl px-4 py-2 text-amber-400 font-bold tracking-wider ui-header">
                <span className="flex items-center gap-2">
                    <Shield size={16} /> SAFETY ZONES
                </span>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md text-zinc-300 hover:text-white"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Zone List */}
            <ZoneListPanel 
                zones={zones} 
                onAddZone={onAddZone}
                onDeleteZone={onDeleteZone}
                isMarking={isMarking}
            />
        </aside>
    );
}

