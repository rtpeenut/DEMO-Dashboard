'use client';

import { useEffect, useRef, useState } from 'react';
import { CirclePlus, Trash2, MapPin } from 'lucide-react';

interface MarkSidebarProps {
    onClose?: () => void;
    onAddMark?: () => void;
    marks?: { id: string; pos: [number, number]; radius: number;name: string;color: string}[];
    onDeleteMark?: (id: string) => void;
}

export default function MarkSidebar({ onClose, onAddMark, marks = [], onDeleteMark }: MarkSidebarProps) {
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
                <span className="flex items-center gap-2"><MapPin size={16} /> MARK</span>
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

            {/* Section title */}
            <div className="mb-3 rounded-xl bg-zinc-800 px-4 py-2 text-zinc-300 font-sans">
                MARK LIST
            </div>

            {/* Mark List */}
            <div className="flex-1 overflow-y-auto space-y-2">
                {marks.length === 0 && (
                    <div className="text-zinc-400 text-sm text-center py-3">No marks yet</div>
                )}

                {marks.map((m) => (
                    <div
                        key={m.id}
                        className="rounded-xl bg-zinc-800 px-4 py-3 mb-3 border border-zinc-700 hover:border-amber-400 transition"
                    >
                        {/* ✅ แสดงชื่อ mark */}
                        <div className="text-amber-400 font-semibold">
                            {m.name || "Unnamed Mark"}
                        </div>

                        {/* ✅ แสดงพิกัด */}
                        <div className="text-zinc-400 text-xs mt-1">
                            Lat: {m.pos[0].toFixed(4)} | Lng: {m.pos[1].toFixed(4)}
                        </div>

                        {/* ✅ แสดงรัศมี */}
                        <div className="text-zinc-400 text-xs">
                            Radius: {m.radius.toLocaleString()} m
                        </div>

                        {/* ✅ สี preview */}
                        <div className="flex items-center gap-2 mt-2">
                            <div
                                className="w-4 h-4 rounded-full border border-zinc-600"
                                style={{ backgroundColor: m.color }}
                            />
                            <span className="text-xs text-zinc-500">Color</span>
                        </div>
                        <button
                            onClick={() => onDeleteMark?.(m.id)}
                            className="p-1 hover:bg-zinc-700 rounded-md transition"
                            title="Delete mark"
                        >
                            <Trash2 size={16} className="text-zinc-400 hover:text-red-500 " />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add button */}
            <div
                onClick={onAddMark}
                className="cursor-pointer rounded-xl bg-zinc-800 flex items-center justify-center py-3 mt-3 border border-zinc-700 hover:border-amber-400 transition"
            >
                <CirclePlus size={20} className="text-amber-400" />
            </div>
        </aside>
    );
}
