import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { getMotions, canonicalLabel } from "../motionPresets";

function toMinutes(amount, unit) {
  if (amount === "") return null;
  const value = Number(amount);
  if (Number.isNaN(value)) return null;
  return unit === "sec" ? value / 60 : value;
}

function DurationField({ label, amount, unit, onAmount, onUnit }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">{label}</label>
      <div className="mt-1.5 flex gap-2">
        <input
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          className="w-full border border-[var(--app-border)] bg-[var(--app-input)] p-3 text-sm text-[var(--app-text)]"
        />
        <select
          value={unit}
          onChange={(e) => onUnit(e.target.value)}
          className="border border-[var(--app-border)] bg-[var(--app-input)] px-2 text-sm text-[var(--app-text)]"
        >
          <option value="min">min</option>
          <option value="sec">sec</option>
        </select>
      </div>
    </div>
  );
}

// Structured alternative to MotionInput's free-text parsing, for chairs who'd
// rather pick fields than type a sentence (Settings > Motion input). Same
// motion presets (getMotions()) drive both the type list and, via each
// preset's own topic/durationField flags, which fields render - a moderated
// caucus gets a topic + two durations, "Extend Speaking Time" gets one
// duration, a plain procedural motion gets none.
const MotionDropdownForm = forwardRef(function MotionDropdownForm({ delegations, onSubmit, className = "" }, ref) {
  const selectRef = useRef(null);
  const motions = useMemo(() => getMotions(), []);

  const [motionId, setMotionId] = useState("");
  const [delegationName, setDelegationName] = useState("");
  const [topic, setTopic] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [totalUnit, setTotalUnit] = useState("min");
  const [speakingAmount, setSpeakingAmount] = useState("");
  const [speakingUnit, setSpeakingUnit] = useState("min");

  useImperativeHandle(ref, () => ({
    focus: () => selectRef.current?.focus(),
  }));

  const selectedMotion = motions.find((m) => m.id === motionId) ?? null;
  const showsTopicGroup = selectedMotion?.topic === true;
  const showsTotal = showsTopicGroup || selectedMotion?.durationField === "total";
  const showsSpeaking = showsTopicGroup || selectedMotion?.durationField === "speaking";

  function reset() {
    setMotionId("");
    setDelegationName("");
    setTopic("");
    setTotalAmount("");
    setTotalUnit("min");
    setSpeakingAmount("");
    setSpeakingUnit("min");
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!selectedMotion || (showsTopicGroup && !topic.trim())) return;

    onSubmit({
      motion: canonicalLabel(selectedMotion),
      delegation: delegationName || null,
      totalTime: showsTotal ? toMinutes(totalAmount, totalUnit) : null,
      speakingTime: showsSpeaking ? toMinutes(speakingAmount, speakingUnit) : null,
      topic: showsTopicGroup ? topic.trim() : null,
    });
    reset();
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4 border border-[var(--app-border)] bg-[var(--app-chip)] p-4">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">Motion type</label>
          <select
            ref={selectRef}
            value={motionId}
            onChange={(e) => setMotionId(e.target.value)}
            required
            className="mt-1.5 w-full border border-[var(--app-border)] bg-[var(--app-input)] p-3 text-sm text-[var(--app-text)]"
          >
            <option value="">Select a motion…</option>
            {motions.map((m) => (
              <option key={m.id} value={m.id}>
                {canonicalLabel(m)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">Proposer</label>
          <select
            value={delegationName}
            onChange={(e) => setDelegationName(e.target.value)}
            className="mt-1.5 w-full border border-[var(--app-border)] bg-[var(--app-input)] p-3 text-sm text-[var(--app-text)]"
          >
            <option value="">No delegation</option>
            {delegations.map((d) => (
              <option key={d.code ?? d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {showsTopicGroup && (
          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              placeholder="What's this caucus about?"
              className="mt-1.5 w-full border border-[var(--app-border)] bg-[var(--app-input)] p-3 text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-faint)]"
            />
          </div>
        )}

        {showsTotal && (
          <DurationField
            label={showsTopicGroup ? "Caucus duration" : "Duration"}
            amount={totalAmount}
            unit={totalUnit}
            onAmount={setTotalAmount}
            onUnit={setTotalUnit}
          />
        )}

        {showsSpeaking && (
          <DurationField
            label={showsTopicGroup ? "Speaking time per delegate" : "Speaking time"}
            amount={speakingAmount}
            unit={speakingUnit}
            onAmount={setSpeakingAmount}
            onUnit={setSpeakingUnit}
          />
        )}

        <button
          type="submit"
          disabled={!motionId || (showsTopicGroup && !topic.trim())}
          className="w-full border border-[var(--app-border)] bg-[var(--app-chip)] px-4 py-3 text-sm font-medium uppercase tracking-[0.14em] transition hover:border-[var(--app-border-hover)] hover:bg-[var(--app-chip-active)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add motion
        </button>
      </div>
    </form>
  );
});

export default MotionDropdownForm;
