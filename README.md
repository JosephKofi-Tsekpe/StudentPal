# StudentPal

Node.js + TypeScript learning app with Neon Postgres through Prisma, private Neon Object Storage, OpenAI PDF understanding, and **Better Auth email/password accounts**. Better Auth runs inside our Node app and persists its users, hashed passwords and sessions in Neon Postgres. This setup does not require enabling Neon Managed Auth or a second identity service.

## Signup and sign-in

New visitors see the StudentPal signup page with name, email, password and password confirmation. Existing students can switch to sign-in. Signup creates an account and signs the student in; reload restores the session. Sign-out revokes the session and clears the app's displayed data.

The old browser Basic Auth challenge and shared staging password have been removed. Existing `STAGING_PASSWORD` / `STAGING_USERNAME` settings are ignored and can be deleted from Render. They are not student credentials.

Better Auth hashes passwords, issues HttpOnly SameSite cookies (Secure on Render HTTPS), validates sessions on protected APIs and limits auth request rates. Passwords need at least 12 characters. Email verification and forgotten-password email delivery are not configured yet; the UI does not pretend those services are available. Social login is not enabled.

Courses now have a relational `ownerId`. Listing and all course operations check the signed-in user. Private PDFs remain reachable only by backend storage credentials. Old shared courses with no owner remain hidden; they are not assigned automatically to the next signup. An administrator must explicitly assign/import them after verifying their owner, or students can re-upload test materials.

## Neon configuration

Use your existing intended Neon project and branch in a region with Object Storage. The checked-in `neon.ts` declares a private bucket named `assets` and leaves Neon Managed Auth disabled because auth runs in the app.

Required server variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Pooled Neon Postgres connection string, preserving SSL settings |
| `DATABASE_URL_UNPOOLED` | Direct Neon connection string for migrations (recommended) |
| `AWS_ENDPOINT_URL_S3` | Neon branch's S3-compatible storage endpoint |
| `AWS_REGION` | Neon storage region |
| `AWS_ACCESS_KEY_ID` | Neon storage access key |
| `AWS_SECRET_ACCESS_KEY` | Neon storage secret |
| `S3_BUCKET` | `assets` unless you deliberately override the bucket |
| `BETTER_AUTH_SECRET` | Stable random secret, at least 32 characters |
| `OPENAI_API_KEY` | Your OpenAI developer API key for lessons and PDF reading |

`BETTER_AUTH_URL` is optional: on Render the app uses `https://` plus `RENDER_EXTERNAL_HOSTNAME`; locally it defaults to `http://127.0.0.1:8000`. If using a custom domain or different local address, set `BETTER_AUTH_URL` to the exact browser origin. The server host allowlist currently supports localhost and Render's provided hostname only. Keep the session secret stable across deploys; rotating it signs users out.

The `AWS_*` names are Neon's standard object-storage variables. **No AWS account or Amazon S3 bucket is needed.** Official setup: https://neon.com/docs/storage/get-started

## Local setup

Use Node.js 24+. Copy `.env.example` to `.env` and set the real credentials, or let Neon pull `.env.local`. Never commit either file.

```sh
npm ci
npm run build
npm run db:migrate
npm start
```

Open http://127.0.0.1:8000 and create an account. The app and Prisma load `.env.local` then `.env` without overriding hosted environment variables. Prisma migrations prefer `DATABASE_URL_UNPOOLED`, then `DIRECT_URL`, then `DATABASE_URL`. Runtime queries use the pooled `DATABASE_URL`.

Optional Neon CLI setup using the previously supplied project:

```sh
npx neon@latest init -y --org-id org-divine-recipe-31994909 --project-id dark-king-17816320 --branch production --services postgres,object-storage
npx neon@latest deploy
```

Complete browser authentication if requested. A local `.neon` link alone is not verification that provisioning succeeded. CLI authentication was previously blocked in this development session, so live Neon verification remains pending.

## Render staging on the free plan

Connect the repository with **New > Blueprint** using `render.yaml`, or sync the existing Blueprint. The Blueprint generates `BETTER_AUTH_SECRET`; check that the new variable exists before deployment. For a manually configured Render service, generate a stable random secret yourself (for example `openssl rand -base64 32`) and add it securely.

The build runs Prisma generation, TypeScript checks and local tests. Startup runs `prisma migrate deploy` before starting the server. The new account migration creates Better Auth tables and adds the nullable course-owner relation without deleting old courses. Do not bypass migrations. No paid Render disk or database is provisioned.

`HOST=0.0.0.0`, Render's assigned `PORT`, and `/healthz` support service networking. `/`, `/signup` and `/signin` are public app shells. The health endpoint makes no AI calls and is only a liveness check. Private API calls return JSON 401 when unauthenticated, never a `WWW-Authenticate` browser challenge.

Free Render can sleep and restart. Persistent data lives in Neon. Document reading resumes from the last saved section when retried. Use one instance until durable processing leases and distributed jobs are implemented. Auth rate limits use an app-controlled client-IP header derived from the socket, not client-provided forwarded headers. Behind Render's proxy some users can share a rate-limit bucket; multi-instance rate-limit storage/proxy tuning remains future work.

## Features and current boundaries

- Multiple private courses with PDF uploads up to 20 MB.
- OpenAI reads text, equations, tables and visual page content in five-page sections; saved partial work and source labels.
- Lessons, nonconsecutive study dates, completion tracking.
- Quick Quiz (5-15) and Main Quiz (15-100), MCQ/theory/mixed, private backend answer keys, MCQ grading, theory self-review and saved history.
- Resource search links and course deletion.

Automatic topic allocation, theory AI grading, flashcards, notes, reminders, clickable source viewers, quiz refresh recovery and semantic duplicate checks are still pending. PDF only: export slides or images to PDF first. AI output needs review; OpenAI API usage requires separate credits. No old SQLite data is imported automatically.

Storage uses Prisma's `Course` JSONB document plus an authoritative owner column, and random PDF object keys. Upload attempts object cleanup after a failed database save; failed object deletion preserves the course record. Cross-service transactions are not atomic, so interrupted operations may need orphan cleanup. Full production account recovery, email verification and distributed processing are not implemented.

## Validation

```sh
npm run build
npm test
```

Tests exercise real Better Auth handlers and password/cookie logic using an explicit test-only memory database, along with injected course/object storage doubles. They cover signup, weak passwords, duplicate signup, incorrect sign-in, sign-out revocation, session reload/restart, origin rejection, owner isolation, legacy-course isolation, upload failures and restart recovery. They do not prove a live Neon connection.

For live Postgres/object checks, create a disposable account in the app, configure `NEON_TEST_EMAIL` and `NEON_TEST_PASSWORD`, apply migrations, then run:

```sh
npm run test:neon
```

The script starts a local app on port 8010, signs in, uploads a generated PDF, checks the real database record and byte-identical object download, restarts the server, checks saved dates, and deletes its own test record/object. It leaves the test user account intact and does not call OpenAI. Auth session checks against the actual deployed Neon database remain to be verified after credentials are available.
