import { useEffect, useRef } from "react";
import { SHORTCUT_SCOPES } from "../shortcuts";
import { resolveKey } from "../shortcutPrefs";

// event.code (physical key position, e.g. "KeyP", "Digit1") rather than
// event.key - layout-independent, and the only way to unambiguously tell
// "P" from "Shift+P" apart (event.key alone can't: Shift changes the
// character itself for letters, so there's no way to recover "was Shift
// held" from the produced character alone).
export function eventToKeyId(event) {
  const parts = [];
  if (event.metaKey || event.ctrlKey) parts.push("Mod");
  if (event.shiftKey) parts.push("Shift");
  parts.push(event.code);
  return parts.join("+");
}

function isTextEditingTarget(target) {
  const tag = target.tagName;
  return tag === "TEXTAREA" || tag === "INPUT" || target.isContentEditable;
}

// Global is merged into every view-scope first, so a view can't
// accidentally shadow a global binding for the same physical key.
function buildKeyMap(scopeName) {
  const map = new Map();
  for (const action of SHORTCUT_SCOPES.global) {
    map.set(resolveKey(action.id), action.id);
  }
  for (const action of SHORTCUT_SCOPES[scopeName] ?? []) {
    map.set(resolveKey(action.id), action.id);
  }
  return map;
}

function buildVotingKeyMap() {
  const map = new Map();
  for (const action of SHORTCUT_SCOPES.voting) {
    map.set(resolveKey(action.id), action.id);
  }
  return map;
}

// One shared keydown listener per dais page. `scopeName` is one of
// speakerList/motions/rollCall. `handlers` is { [actionId]: (event) => void }
// - a page only needs an entry for the actions it actually implements.
// `active=false` fully disables the hook (used for SessionBoard's
// landing-page demo instance, which must never respond to keys). While
// `votingActive`, 1/2/3/+/- are hijacked straight to `voteHandlers`, taking
// priority over the view's own bindings for those same physical keys -
// matches the spec's fixed voting override (view-switch on 1/2/3 resumes
// automatically once the vote closes).
//
// `handlers`/`voteHandlers` are read from a ref updated every render (same
// pattern as Timer.jsx's onCompleteRef) so passing a fresh inline object
// each render doesn't tear down and re-add the window listener every time.
export function useDaisShortcuts(scopeName, handlers, { active = true, votingActive = false, voteHandlers = null } = {}) {
  const handlersRef = useRef(handlers);
  const voteHandlersRef = useRef(voteHandlers);
  const votingActiveRef = useRef(votingActive);

  useEffect(() => {
    handlersRef.current = handlers;
    voteHandlersRef.current = voteHandlers;
    votingActiveRef.current = votingActive;
  });

  useEffect(() => {
    if (!active) return undefined;

    function handleKeyDown(event) {
      if (isTextEditingTarget(event.target)) return;

      const keyId = eventToKeyId(event);

      if (votingActiveRef.current && voteHandlersRef.current) {
        const votingAction = buildVotingKeyMap().get(keyId);
        if (votingAction && voteHandlersRef.current[votingAction]) {
          event.preventDefault();
          voteHandlersRef.current[votingAction](event);
          return;
        }
      }

      const actionId = buildKeyMap(scopeName).get(keyId);
      if (actionId && handlersRef.current[actionId]) {
        event.preventDefault();
        handlersRef.current[actionId](event);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scopeName, active]);
}
