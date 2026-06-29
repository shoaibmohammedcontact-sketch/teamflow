<!-- Thanks for contributing to TeamFlow! Please fill in the sections below. -->

## Summary

<!-- One or two sentences: what does this PR do? -->

## Type of change

<!-- Check one (or more if relevant). -->

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `refactor` — code change that neither fixes a bug nor adds a feature
- [ ] `perf` — performance improvement
- [ ] `docs` — documentation only
- [ ] `test` — adding or correcting tests
- [ ] `chore` — build, deps, config, tooling
- [ ] breaking change — would require a major version bump

## Scope

<!-- Which area does this touch? auth / rbac / board / api / ui / realtime / db / docs -->

## Related issues

<!-- "Closes #123" / "Refs #456". Leave blank if none. -->

## How to test

1.
2.
3.

## Checklist

- [ ] `bun run lint` passes with 0 errors
- [ ] `bun run typecheck` passes
- [ ] Every new org-scoped route is guarded by `authorizeInOrg`
- [ ] Every write path logs an `ActivityLog` entry (if applicable)
- [ ] No secrets / `.env` / `*.db` committed
- [ ] `README.md` updated if public API, schema, or scripts changed
- [ ] Conventional commit message used (`feat(scope):`, `fix(scope):`, etc.)

## Screenshots (if UI change)

<!-- Before / after -->
