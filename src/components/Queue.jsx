import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Flag from "./Flag";

export default function Queue({
  queue,
  setQueue,
}) {
  const [newSpeaker, setNewSpeaker] = useState("");

  function addSpeaker() {
    const name = newSpeaker.trim();

    if (!name) return;

    setQueue([
      ...queue,
      {
        id: crypto.randomUUID(),
        country: name,
      },
    ]);

    setNewSpeaker("");
  }

  function removeSpeaker(id) {
    setQueue(queue.filter((speaker) => speaker.id !== id));
  }

  function moveUp(index) {
    if (index === 0) return;

    const copy = [...queue];

    [copy[index], copy[index - 1]] = [
      copy[index - 1],
      copy[index],
    ];

    setQueue(copy);
  }

  function moveDown(index) {
    if (index === queue.length - 1) return;

    const copy = [...queue];

    [copy[index], copy[index + 1]] = [
      copy[index + 1],
      copy[index],
    ];

    setQueue(copy);
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-none border border-white/10 bg-[#121212] p-5 sm:p-6 lg:p-8 shadow-[0_25px_80px_rgba(0,0,0,.25)]">

      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.26em] text-white/50">
          Up Next
        </p>
      </div>

      <div className="mt-6 flex gap-2">
        <input
          value={newSpeaker}
          onChange={(e) => setNewSpeaker(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addSpeaker();
          }}
          placeholder="Country..."
          className="flex-1 rounded-none border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
        />

        <button
          onClick={addSpeaker}
          className="rounded-none border border-white/10 bg-white/5 px-4 transition hover:bg-white/10"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto space-y-3 pr-1">

        {queue.length === 0 && (
          <div className="border border-dashed border-white/10 py-10 text-center text-sm text-white/30">
            No speakers queued.
          </div>
        )}

        {queue.map((speaker, index) => (
          <div
            key={speaker.id}
            className="group border border-white/10 bg-white/5 px-5 py-4 transition hover:bg-white/10"
          >
            <div className="flex items-center justify-between">

              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-white/40">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="inline-flex items-center gap-2 text-white">
                  <Flag countryCode={speaker.countryCode} />
                  {speaker.country}
                </span>
              </div>

              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">

                <button
                  onClick={() => moveUp(index)}
                  className="border border-white/10 p-2 hover:bg-white/10"
                >
                  <ChevronUp size={14} />
                </button>

                <button
                  onClick={() => moveDown(index)}
                  className="border border-white/10 p-2 hover:bg-white/10"
                >
                  <ChevronDown size={14} />
                </button>

                <button
                  onClick={() => removeSpeaker(speaker.id)}
                  className="border border-red-500/30 p-2 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={14} />
                </button>

              </div>

            </div>
          </div>
        ))}

      </div>

    </div>
  );
}