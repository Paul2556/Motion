# Brand identity

Sourced from `README.md`'s "Brand Identity" section (the canonical pitch) plus the concrete
tokens that implement it in code. Update this file's implementation pointers if those tokens move;
the narrative content should stay in sync with `README.md` since that's the source of truth for
brand voice.

## Name

**Motion** — named for one of the most fundamental actions in MUN procedure. A motion starts
discussion, guides committee procedure, and moves debate forward. The name represents progress.

## Tagline

**"From motion to resolution."**

A committee begins with motions and concludes with resolutions — the tagline reflects both the
workflow of MUN and the purpose of the platform. Treat it as the canonical one-liner; don't
paraphrase it in marketing-facing copy.

## Lifecycle

```
Motion → Formation → Debate → Resolution
```

Every feature should map to one of these four stages. This lifecycle is also the logo's structure
(see below) — it's not just a tagline, it's the product's organizing metaphor.

## Logo

- A circle — a motion in progress.
- Four horizontal bars — the four lifecycle stages (Motion, Formation, Debate, Resolution).
- Together: movement, progression, structured debate.
- Implementation: `src/components/Logo.jsx`.

## Colors

### Primary palette — black & white

Represents professionalism, diplomacy, structure, neutrality, contrast. MUN is built around
opposing viewpoints, debate, and negotiation — the black-and-white palette reflects that
contrast while keeping a formal appearance. This is why the app is natively dark/light via the
two theme systems (see `CLAUDE.md`'s Theming section) rather than leaning on color for identity.

### Accent — brown

Represents warmth, community, approachability, the human side of MUN. MUN is professional, but
also a community of students who genuinely enjoy debate, diplomacy, and international affairs —
the accent is meant to carry that half of the experience. Any UI element claiming to be "the"
brand accent should trace back to this hue family, not an arbitrary color:

| Token | Light mode | Dark mode | Where |
|---|---|---|---|
| `--accent` | `#9a5b3a` (brown) | `#65a4c5` (pre-inverted so the *displayed* hue stays brown-adjacent under the `invert(1)` flip) | `src/themes.css`, both theme systems |

Secondary accents exist for specific UI affordances (country highlight, speaking-time highlight,
duration, topic, "motion in progress" nav dot) — these are functional color-coding, not brand
identity, and shouldn't be confused with the one true brand accent above:

- `--accent-alt`, `--accent-time`, `--accent-duration`, `--accent-topic` — `MotionInput.jsx`
  per-field highlights.
- `--motion-accent` — `SessionBoard`'s nav dot / `MotionPage`'s vote-in-progress indicator.

## Voice

Formal but not cold — "Built by delegates. Designed for chairs." The goal is explicitly *not* to
change MUN, only to remove the administrative friction around it ("The software should support
committee procedure, not replace it."). Copy should read as respectful of existing MUN procedure,
not as disrupting or reinventing it.

## What NOT to treat as brand identity

Anything not traceable to the above — an arbitrary new accent hue, a tagline variant, a logo
reinterpretation — is a deviation, not an extension. `README.md` is the source of truth for
narrative brand content; `.claude/motion.md` documents current implementation but explicitly
defers to `README.md` for brand meaning rather than duplicating it.
