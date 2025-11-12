'use client';

import { CirclePlus, Trash2 } from 'lucide-react';
import { ProtectZone } from './ProtectSidebar';

interface ZoneListPanelProps {
    zones: ProtectZone[];
    onAddZone?: () => void;
    onDeleteZone?: (id: string) => void;
    isMarking?: boolean; // ✅ สถานะกำลังสร้างวงรัศมี
}

export default function ZoneListPanel({ zones, onAddZone, onDeleteZone, isMarking = false }: ZoneListPanelProps) {
    return (
        <>
            {/* Section title */}
            <div className="mb-3 rounded-xl bg-zinc-800 px-4 py-2 text-zinc-300 font-sans">
                SAFETY ZONES
            </div>

            {/* Zone List */}
            <div className="flex-1 overflow-y-auto space-y-2">
                {zones.length === 0 && (
                    <div className="text-zinc-400 text-sm text-center py-3">
                        No safety zones yet
                    </div>
                )}

                {zones.map((zone) => (
                    <div
                        key={zone.id}
                        className="rounded-xl bg-zinc-800 px-4 py-3 mb-3 border border-zinc-700 hover:border-amber-400 transition"
                    >
                        {/* Zone name */}
                        <div className="flex items-center justify-between">
                            <div className="text-amber-400 font-semibold">
                                {zone.name || "Unnamed Zone"}
                            </div>
                            <button
                                onClick={() => onDeleteZone?.(zone.id)}
                                className="p-1 hover:bg-zinc-700 rounded-md transition"
                                title="Delete zone"
                            >
                                <Trash2 size={16} className="text-zinc-400 hover:text-red-500" />
                            </button>
                        </div>

                        {/* Coordinates */}
                        <div className="text-zinc-400 text-xs mt-1">
                            Lat: {zone.pos[0].toFixed(4)} | Lng: {zone.pos[1].toFixed(4)}
                        </div>

                        {/* Radius */}
                        <div className="text-zinc-400 text-xs">
                            Radius: {zone.radius.toLocaleString()} m
                        </div>

                        {/* Color preview */}
                        <div className="flex items-center gap-2 mt-2">
                            <div
                                className="w-4 h-4 rounded-full border border-zinc-600"
                                style={{ backgroundColor: zone.color }}
                            />
                            <span className="text-xs text-zinc-500">Color</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add button */}
            <div
                onClick={onAddZone}
                className={`cursor-pointer rounded-xl flex items-center justify-center py-3 mt-3 border transition ${
                    isMarking
                        ? 'bg-amber-500/20 border-amber-400 border-2'
                        : 'bg-zinc-800 border-zinc-700 hover:border-amber-400'
                }`}
            >
                <CirclePlus size={20} className={isMarking ? 'text-amber-300' : 'text-amber-400'} />
            </div>
        </>
    );
}

