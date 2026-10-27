# StudentPal

Standalone student learning prototype with a **Node.js + TypeScript backend**, a responsive HTML/CSS/JavaScript interface, SQLite persistence and direct OpenAI Responses API integration. No Python, Base44 or Lovable runtime is required.

## Start locally

Install Node.js 24 or newer, then:

```sh
npm ci
```

Copy `.env.example` to `.env`, set `OPENAI_API_KEY` using your own OpenAI developer API key, then:

```sh
npm start
```

Open http://127.0.0.1:8000. Set `OPENAI_MODEL` to override the default `gpt-4.1`. Keys are read on the server and never sent to the browser. API usage requires available OpenAI API credits. A configured key has not necessarily been validated.

## Current features

- Multiple courses and private local PDF storage (20 MB upload limit).
- OpenAI reads PDF text and visual page content in five-page sections, preserving original page labels.
- Background processing with visible progress, useful errors and resume from the last saved section after a failure/restart.
- Source-grounded lessons with examples and textual page references.
- Manually selected nonconsecutive study dates and completion tracking.
- Timed Quick Quiz (5-15 questions) and Main Quiz (15-100), with MCQ, theory or mixed questions.
- Backend answer keys, validated question structure and deterministic MCQ grading.
- Theory model-answer self-review and saved attempt history.
- External resource search links and course deletion.

## Development

```sh
npm run typecheck
npm test
```

Tests cover HTTP serving, PDF upload/validation, plan dates, missing-key handling, deletion and cross-origin rejection. Live OpenAI calls require a key and are not part of the automated tests.

## Current boundaries

This is a single-user local prototype, bound to localhost. Production hosting requires authentication, per-user authorization, rate limits and deployment hardening. Uploaded PDFs and the SQLite database live in `data/`, which is excluded from Git. Do not commit `.env`, keys, documents or user data.

PDF only: export slides, images and Word documents to PDF first. The study calendar stores the topic you enter on each selected date; automatic workload allocation and editable topic outlines remain to be built. Theory AI grading, flashcards, notes, reminders, clickable source viewers and semantic duplicate detection remain to be built. Quiz countdowns and answers do not yet recover in the UI after refresh, and the timer is not a secure exam boundary. AI theory answers are for self-review, not scored mastery.

Large documents incur usage for each analyzed section. Start with a short PDF. Lesson retrieval selects relevant text by keywords with a bounded context, so it is not exhaustive whole-book synthesis. Treat AI explanations and extracted visual details as reviewable output.
