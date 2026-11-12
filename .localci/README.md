# LocalCI app-level validation contract

**Proposal only.** Central LocalCI schema, policy, scheduler integration and trusted executor are not yet active. This is source-versioned **data** at the same commit as the code, not permission for arbitrary commands or automatic release.

Profiles: javascript-syntax, browser-extension-manifest, content-script-smoke, permission-audit, privacy-regression.

The central LocalCI runner shall fetch the exact commit and contract, check compatibility against an independently approved policy, and reject unsupported changes before expensive tests. Existing workflows, signing, protected state, and release permissions remain unchanged.

RFC: https://github.com/DantyDCook/local-ci-bootstrap-test/pull/5
