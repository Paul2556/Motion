import { useEffect, useRef } from "react";
import { SHORTCUT_SCOPES, findAction } from "../shortcuts";
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

// A focused SELECT counts too: it uses the arrow keys to change its value.
export function isTextEditingTarget(target) {
  const tag = target.tagName;
  return tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT" || Boolean(target.isContentEditable);
}

// Global is merged into every view-scope first, so a view can't
// accidentally shadow a global binding for the same physical key. Voting is
// a standalone override map, so it never includes global.
export function buildKeyMap(scopeName) {
  const map = new Map();
  const actions = scopeName === "voting" ? [] : SHORTCUT_SCOPES.global;
  for (const action of [...actions, ...(SHORTCUT_SCOPES[scopeName] ?? [])]) {
    map.set(resolveKey(action.id), action.id);
  }
  return map;
}

// The action a key press triggers, or null. Held keys only repeat actions
// marked `repeatable` (selection, vote counting).
export function shortcutFor(event, keyMap) {
  if (isTextEditingTarget(event.target)) return null;
  const actionId = keyMap.get(eventToKeyId(event));
  if (!actionId) return null;
  if (event.repeat && !findAction(actionId)?.repeatable) return null;
  return actionId;
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
      if (votingActiveRef.current && voteHandlersRef.current) {
        const votingAction = shortcutFor(event, buildKeyMap("voting"));
        if (votingAction && voteHandlersRef.current[votingAction]) {
          event.preventDefault();
          voteHandlersRef.current[votingAction](event);
          return;
        }
      }

      const keyMap = buildKeyMap(scopeName);
      const actionId = shortcutFor(event, keyMap);
      if (actionId && handlersRef.current[actionId]) {
        event.preventDefault();
        handlersRef.current[actionId](event);
      } else if (event.repeat && !isTextEditingTarget(event.target) && keyMap.has(eventToKeyId(event))) {
        // A swallowed repeat must not fall through to a focused button's own
        // click, or holding Enter on "Next" would still skip speakers.
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scopeName, active]);
}
