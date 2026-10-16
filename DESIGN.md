# ABPEDNAS

## Mission

Create implementation-ready, token-driven UI guidance for ABPEDNAS that is optimized for consistency, accessibility, and fast delivery across dashboard web app.

## Brand

- Product/brand: ABPEDNAS
- URL: https://abpednas.id/admin/bpd
- Audience: authenticated users and operators
- Product surface: dashboard web app

## Style Foundations

- Visual style: structured, tokenized, content-first
- Main font style: `font.family.primary=Inter`, `font.family.stack=Inter, sans-serif`, `font.size.base=14px`, `font.weight.base=400`, `font.lineHeight.base=20px`
- Typography scale: `font.size.xs=10px`, `font.size.sm=12px`, `font.size.md=14px`, `font.size.lg=16px`, `font.size.xl=20px`, `font.size.2xl=24px`, `font.size.3xl=30px`, `font.size.4xl=36px`
- Color palette: `color.text.primary=#6b7280`, `color.text.secondary=#009fe3`, `color.text.tertiary=#2563eb`, `color.text.inverse=#212121`, `color.surface.base=#000000`, `color.surface.muted=#fee2e2`, `color.surface.raised=#ffffff`, `color.surface.strong=#16a34a`, `color.border.default=#e5e7eb`, `color.border.muted=#ef4444`
- Spacing scale: `space.1=4px`, `space.2=6px`, `space.3=8px`, `space.4=12px`, `space.5=14px`, `space.6=16px`, `space.7=32px`
- Radius/shadow/motion tokens: `radius.xs=4px`, `radius.sm=8px`, `radius.md=12px`, `radius.lg=9999px` | `shadow.1=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px`, `shadow.2=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(30, 58, 138, 0.4) 0px 10px 15px -3px, rgba(30, 58, 138, 0.4) 0px 4px 6px -4px` | `motion.duration.instant=150ms`, `motion.duration.fast=200ms`, `motion.duration.normal=300ms`

## Accessibility

- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone

Concise, confident, implementation-focused.

## Rules: Do

- Use semantic tokens, not raw hex values, in component guidance.
- Every component must define states for default, hover, focus-visible, active, disabled, loading, and error.
- Component behavior should specify responsive and edge-case handling.
- Interactive components must document keyboard, pointer, and touch behavior.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't

- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.
- Do not ship component guidance without explicit state rules.

## Guideline Authoring Workflow

1. Restate design intent in one sentence.
2. Define foundations and semantic tokens.
3. Define component anatomy, variants, interactions, and state behavior.
4. Add accessibility acceptance criteria with pass/fail checks.
5. Add anti-patterns, migration notes, and edge-case handling.
6. End with a QA checklist.

## Required Output Structure

- Context and goals.
- Design tokens and foundations.
- Component-level rules (anatomy, variants, states, responsive behavior).
- Accessibility requirements and testable acceptance criteria.
- Content and tone standards with examples.
- Anti-patterns and prohibited implementations.
- QA checklist.

## Component Rule Expectations

- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.
- Include known page component density: buttons (173), links (7), inputs (4), lists (3), tables (2), navigation (1).

## Quality Gates

- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Teams should prefer system consistency over local visual exceptions.
