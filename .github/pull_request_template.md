## What

<!-- What this PR changes, in 1–3 sentences. Screens affected. -->

## Why

<!-- The feature/bug and why it matters. -->

## What I directed the agent to do

<!-- The prompts/instructions given to the AI agent and the plan it followed. -->

-

## What I corrected

<!-- What the agent got wrong or I changed after review, and why.
     "Nothing" is a valid answer — but say what you checked. -->

-

## Needs a backend change?

- [ ] No
- [ ] Yes — backend PR:

## How it was tested

- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass locally
- [ ] New/updated tests:
- [ ] Manual check against the local backend (screens / flows):

## Checklist

- [ ] API types regenerated from the backend spec if the API changed (`npm run gen:api`)
- [ ] Money stays a decimal string (no `parseFloat`/`Number()`, no totals computed in the browser)
- [ ] Errors from the API (ProblemDetail) are shown to the user
- [ ] No secrets or tokens committed or logged; new env vars in `.env.example`
- [ ] New dependencies are justified above
