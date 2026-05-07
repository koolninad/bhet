"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMaybeRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Settings, Mic, Camera, Headphones, ChevronDown } from "lucide-react";

interface DeviceOption {
  deviceId: string;
  label: string;
}

export function DevicePicker() {
  const room = useMaybeRoomContext();
  const [show, setShow] = useState(false);
  const [audioInputs, setAudioInputs] = useState<DeviceOption[]>([]);
  const [videoInputs, setVideoInputs] = useState<DeviceOption[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<DeviceOption[]>([]);
  const [selectedAudio, setSelectedAudio] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [selectedOutput, setSelectedOutput] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(devices.filter(d => d.kind === "audioinput").map(d => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 5)}` })));
      setVideoInputs(devices.filter(d => d.kind === "videoinput").map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}` })));
      setAudioOutputs(devices.filter(d => d.kind === "audiooutput").map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 5)}` })));
    } catch {}
  }, []);

  useEffect(() => {
    if (!show) return;
    enumerateDevices();
    const h = navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", enumerateDevices);
  }, [show, enumerateDevices]);

  useEffect(() => {
    if (!show) return;
    const outside = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShow(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [show]);

  const switchAudio = async (deviceId: string) => {
    setSelectedAudio(deviceId);
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(false);
      await room.localParticipant.setMicrophoneEnabled(true, { deviceId: { exact: deviceId } });
    } catch {}
  };

  const switchVideo = async (deviceId: string) => {
    setSelectedVideo(deviceId);
    if (!room) return;
    try {
      await room.localParticipant.setCameraEnabled(false);
      await room.localParticipant.setCameraEnabled(true, { deviceId: { exact: deviceId } });
    } catch {}
  };

  const switchOutput = async (deviceId: string) => {
    setSelectedOutput(deviceId);
    const videoEls = document.querySelectorAll("video");
    for (const el of videoEls) { (el as HTMLVideoElement).setSinkId?.(deviceId).catch(() => {}); }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setShow(!show)} className={`p-2.5 rounded-xl transition ${show ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`} title="Device settings">
        <Settings className="w-5 h-5" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-3 space-y-3">
            <DeviceSelect icon={<Mic className="w-4 h-4 shrink-0" />} label="Microphone" options={audioInputs} selected={selectedAudio} onChange={switchAudio} />
            <DeviceSelect icon={<Camera className="w-4 h-4 shrink-0" />} label="Camera" options={videoInputs} selected={selectedVideo} onChange={switchVideo} />
            <DeviceSelect icon={<Headphones className="w-4 h-4 shrink-0" />} label="Speaker" options={audioOutputs} selected={selectedOutput} onChange={switchOutput} />
          </div>
        </div>
      )}
    </div>
  );
}

function DeviceSelect({ icon, label, options, selected, onChange }: { icon: React.ReactNode; label: string; options: DeviceOption[]; selected: string; onChange: (id: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">{icon} {label}</label>
      {options.length === 0 ? (
        <p className="text-xs text-gray-600">No {label.toLowerCase()} detected</p>
      ) : (
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {options.map((o) => <option key={o.deviceId} value={o.deviceId}>{o.label}</option>)}
        </select>
      )}
    </div>
  );
}
