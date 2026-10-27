# StudentPal

Node.js + TypeScript student learning prototype with a responsive interface, **Neon Postgres through Prisma ORM**, private **Neon S3-compatible Object Storage**, and direct OpenAI PDF understanding. No SQLite, local document storage, Python, Base44 or Lovable runtime is required.

## Configure Neon

1. Create a Neon staging project/branch in a region supporting Object Storage. Keep database and storage on the same intended branch.
2. Copy the pooled Postgres connection string into `DATABASE_URL`, preserving `sslmode=require`. Optionally set `DIRECT_URL` to the direct connection string for migrations.
3. Create a **private** bucket such as `studentpal-materials`. Obtain the branch's S3 endpoint, region, access key and secret key with storage read/write access. Copy them to `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and set `S3_BUCKET` to the actual bucket name. These are storage credentials, not a Neon account API key.
4. Set `OPENAI_API_KEY` in your server environment. Never commit or share credentials in chat.

Official setup: https://neon.com/docs/storage/get-started and https://neon.com/docs/guides/prisma

## Start locally

Use Node.js 24 or newer. Copy `.env.example` to `.env` and fill in the values, then run:

```sh
npm ci
npm run build
npm run db:migrate
npm start
```

Open http://127.0.0.1:8000. `OPENAI_MODEL` defaults to `gpt-4.1`. OpenAI API usage requires separate API credits. Merely configuring a key is not a verified successful AI connection.

## Render staging (free)

Choose **New > Blueprint**, connect this repository and select the root `render.yaml`. It creates one free service on `main`; no paid disk or Render database is provisioned. Fill the secret environment fields with Neon and OpenAI values. If you need a direct migration connection, also add `DIRECT_URL` in the service Environment settings.

Render runs Prisma generation, TypeScript checks and offline tests during build. Startup applies committed migrations with `prisma migrate deploy` before listening on Render's supplied `PORT` and `0.0.0.0`. The deployment will fail clearly until Neon credentials and bucket are configured. Never run `prisma migrate dev` or `db push` during deployment.

Retrieve Render's generated `STAGING_PASSWORD` from the service Environment page. Sign in using username `studentpal` and that password. This is a shared staging workspace, not separate student accounts. Public `/healthz` is a process liveness check; startup verifies database access but health checks do not call OpenAI or prove bucket access.

Free Render services can sleep, restart and lose their local filesystem. Course data and PDFs now live externally and survive those events, subject to your Neon project's retention and plan limits. A running document job is interrupted if Render stops; retry resumes after the last saved five-page section. Sleep can still cause cold-start delays. Use one staging instance: distributed processing leases and durable job workers are not implemented.

## Storage design

Prisma's `Course` table stores the existing course document in JSONB with timestamps, preserving the current API/UI format during migration. The document includes plans, extracted content, quiz history and private active quiz answer keys. This is an incremental migration, not a normalized multi-user schema. PDFs use random course-ID object keys, private S3 requests, and path-style addressing; no public URLs are needed.

Upload stores the PDF before saving its record and attempts object cleanup if the database write fails. Deletion removes the object first, preserving the record if storage deletion fails. Database and object storage cannot share an atomic transaction; interrupted operations can require orphan cleanup. Full account ownership and distributed locking remain future work.

There is deliberately no automatic local fallback. Existing SQLite databases and local PDFs are **not imported** by this migration. Preserve/export any old data before retiring an old deployment, or re-upload test materials after switching.

## Current features

- Multiple courses, PDF uploads up to 20 MB, private remote storage.
- OpenAI extracts text, equations, tables and visual page descriptions in five-page sections with source labels.
- Visible processing progress, saved partial work and retry/restart recovery.
- Source-grounded lessons and examples.
- Nonconsecutive study dates and completion tracking.
- Quick Quiz (5-15) and Main Quiz (15-100), MCQ/theory/mixed formats, backend answer keys, deterministic MCQ grading and theory model-answer self-review.
- Attempt history, resource search links and deletion.

## Development and validation

```sh
npm run build
npm test
```

Unit tests inject explicit in-memory storage doubles. They verify API flows, errors, restart recovery, staging login and host/origin validation without cloud credentials. They are **not** proof of a live Neon or OpenAI connection. Validate an actual PDF upload, read, server restart, history retrieval and deletion once staging credentials are configured.

For schema changes use `prisma migrate dev` against an isolated development Neon branch, review the generated SQL and commit it. Prisma Client is generated during build and excluded from Git.

## Current boundaries

Single shared workspace protected by a staging password; not production multi-user ready. No SQLite is used even in tests. PDF uploads only: export slides/images/Word documents as PDF. Automatic topic allocation, AI theory grading, flashcards, notes, reminders and clickable source viewers remain to be built. Quiz UI answers/countdowns do not yet recover after refresh; timers are not secure exam controls. Duplicate detection checks exact wording, not semantic paraphrases. Retrieval ranks extracted sections by keywords within a bounded context. Large documents incur OpenAI usage per section; start with a short file.
