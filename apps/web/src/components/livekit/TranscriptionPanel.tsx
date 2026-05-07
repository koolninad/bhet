"use client";

import { useEffect, useRef } from "react";
import { Subtitles, Trash2 } from "lucide-react";

interface Segment {
  id: number;
  speaker_label: string;
  text: string;
  segment_start: number;
  segment_end: number;
}

export function TranscriptionPanel({
  segments,
  onClear,
}: {
  segments: Segment[];
  onClear: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [segments.length]);

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      <div className="px-4 py-3 border-b border-gray-800 font-medium text-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Subtitles className="w-4 h-4" />
          <span>Live Captions</span>
        </div>
        {segments.length > 0 && (
          <button onClick={onClear} className="text-xs text-gray-400 hover:text-white" title="Clear">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {segments.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8">Transcription will appear here...</p>
        ) : (
          segments.map((s) => (
            <div key={s.id} className="text-sm">
              <span className="text-blue-400 text-xs font-medium">{s.speaker_label}</span>
              <p className="text-gray-200 mt-0.5">{s.text}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
