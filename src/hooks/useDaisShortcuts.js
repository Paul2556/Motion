import { useEffect, useRef } from "react";
import { SHORTCUT_SCOPES } from "../shortcuts";
import { resolveKey } from "../shortcutPrefs";

// event.code rather than event.key: layout-independent, and the only way to
// tell "P" from "Shift+P", since Shift changes the character itself.
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

// One shared keydown listener per dais page; `active=false` fully disables it
// for the landing-page demo. Handlers are read from a ref so a fresh inline
// object each render doesn't tear down and re-add the window listener.
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
