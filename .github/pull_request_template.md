<!--
Describe the change, not the conversation that produced it. Write for someone who never saw
the discussion: what changed, why, how to validate. No "as requested", no "validated after
two iterations".
-->

## Summary

## Why

## How to validate

<!-- The exact steps a reviewer follows to see this working. -->

## Checks actually run

<!-- Tick only what you have really run, and say so. "Should work" is not a validation.
     Delete the rows that do not apply to the workspaces this PR touches. -->

- [ ] `npm run lint --workspace @pethouse/api`
- [ ] `npm run build --workspace @pethouse/api`
- [ ] `npm run test --workspace @pethouse/api`
- [ ] `npm run test:e2e --workspace @pethouse/api`
- [ ] API started, affected endpoints exercised for real
- [ ] `npm run lint --workspace @pethouse/mobile`
- [ ] `npm run typecheck --workspace @pethouse/mobile`
- [ ] `npm run test --workspace @pethouse/mobile`
- [ ] App run on an Android emulator, affected screens exercised for real

## Contract

- [ ] This PR does not change the OpenAPI surface
- [ ] It does, and `packages/api-client` has been regenerated in this same PR

## Notes

<!-- Follow-ups deliberately left out of scope, migrations that need running, new environment
     variables, anything a reviewer would otherwise discover the hard way. -->
