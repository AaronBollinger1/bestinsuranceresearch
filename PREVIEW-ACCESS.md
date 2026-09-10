# Birch preview access

The current Birch build is a private review candidate. It is not the public
product and it must not be shared as though it were production.

## Access boundary

The `bestinsuranceresearch` Vercel project should use Vercel Authentication for
**preview deployments only**. That means:

- anonymous visitors are stopped at Vercel's login screen;
- an approved Vercel account can open the preview and review the work;
- there is no Birch signup flow in Research;
- production protection is not changed by this review setting;
- the application remains a static, noindex preview underneath the boundary.

Enable it in Vercel with the project protection control:

```sh
vercel project protection enable bestinsuranceresearch --sso
```

The dashboard/API setting must resolve to `ssoProtection.deploymentType` =
`preview`. Do not use `all` for the review pass unless production is also
intentionally meant to require Vercel login.

## What a reviewer should use

Use the newest `READY` deployment for the review branch, not an old deployment
URL and not a production alias. Confirm the deployment's commit SHA matches the
branch tip before reviewing.

If an anonymous browser can render the page without first authenticating with
Vercel, the gate is not active. Do not compensate with a frontend password,
`localStorage`, or a hidden route; those are not access control.

## Signup policy during review

Research has no account creation, sign-in, or public posting routes. Its local
contribution form only creates a browser-local draft and explicitly says that
nothing is sent. Commons has its own future account system, but its origin and
public links remain closed until `PUBLIC_COMMONS_READY=true` and its database,
mailer, moderation owner, and smoke test are complete.

## Release checks

Run both applications' suites before asking for a content or design review:

```sh
npm run validate
(cd commons && npm run validate)
```

The root suite must report 0 failures in preview posture. The Commons suite may
report one skipped Postgres conformance test when `COMMONS_DATABASE_URL` is not
present locally; that is expected for local development and is not production
approval. GitHub Actions runs the root preview suite, root production-posture
suite, on-page audit, and Commons suite on every push.

Never promote a preview with `vercel --prod` from this branch. Production is a
separate, explicit action after the content snapshot, domain, environment
variables, and live smoke checks are confirmed.
