# Contributing

## Development workflow

Changes should normally move through GitHub as:

1. **Issue** — describe the bug, feature, or maintenance work with acceptance criteria.
2. **Branch** — create a focused branch from `main` using a prefix such as `fix/`, `feature/`, `hotfix/`, or `docs/`.
3. **Implementation** — keep commits scoped to the issue and update documentation/tests when behavior changes.
4. **Pull request** — open a PR back to `main`, reference the tracked issue(s), and use `Closes #N` only for work the PR fully resolves.
5. **Validation** — complete the relevant checks in `docs/SMOKE_TESTS.md` and record any known limitations in the PR.
6. **Merge** — merge only after the PR diff and validation results are reviewed.

Direct commits to `main` should be reserved for exceptional repository administration or emergency recovery where a PR is impractical.

## Branch examples

```text
feature/response-headings
fix/code-block-labeling
hotfix/v0.2.3-recovery
docs/update-installation
```

## Pull request checklist

- [ ] Linked issue(s) exist.
- [ ] Acceptance criteria are addressed.
- [ ] Manifest version is updated when release behavior changes.
- [ ] README/documentation reflects user-visible changes.
- [ ] Relevant smoke/regression checks pass.
- [ ] No unnecessary permissions are added.
- [ ] DOM selectors remain centralized or clearly isolated.
