# Antigravity Guardrails — Café Piza

**Repository**: [https://github.com/Princeg0210/Cafe-Server](https://github.com/Princeg0210/Cafe-Server)  
**Purpose**: Protect the existing application from unnecessary AI-generated changes, maintain recoverable Git checkpoints, and require inspection, approval, testing, and diff review for every task.

---

## PHASE 1 — INSPECT THE EXISTING PROJECT
Before creating or modifying any file:
1. Inspect the repository root and identify the existing frontend, backend, configuration, tests, and Git setup.
2. Preserve the current project structure:
   - `frontend/` — Next.js, React, TypeScript, Tailwind CSS.
   - `backend/` — FastAPI, Python, SQLAlchemy, PostgreSQL.
   - Existing Redis, Celery, WebSocket, authentication, and deployment configuration.
3. Inspect `git status`, recent commits, existing instruction files, `.gitignore`, and the complete diff of pre-existing changes.
4. Identify existing Antigravity rules and supported project instruction mechanisms.
5. **Do not overwrite, discard, reset, or revert pre-existing user work.**

---

## PHASE 2 — PLAN BEFORE EDITING
For every task:
1. Summarize the requested change in one sentence.
2. Inspect relevant components, services, API routes, schemas, tests, and dependencies.
3. Identify the smallest set of files that need to change.
4. Explain why each file needs modification.
5. Identify shared components, API contracts, authentication flows, database changes, and regression risks.
6. Ask for clarification if the request is ambiguous or requires a broader change.
7. **Wait for explicit approval before editing files.**
8. Do not implement additional improvements simply because they seem useful.

---

## PHASE 3 — IMPLEMENT ONLY THE APPROVED SCOPE
1. Make the smallest targeted changes possible.
2. Preserve existing architecture, naming conventions, component boundaries, interfaces, and responsive behavior.
3. Do not rewrite entire files to solve localized problems.
4. Do not refactor unrelated code or silently remove existing functionality.
5. Do not add, remove, or upgrade dependencies without approval.
6. Do not modify environment configuration, API contracts, database schemas, authentication, authorization, payment processing, or deployment settings without approval.
7. If the scope needs to expand, stop and request approval.

### Café Piza Protected Functionality
Preserve existing behavior for:
- POS login, authentication, sessions, and role-based permissions.
- Table management, dining sessions, and table QR tokens.
- Orders, order items, KOT generation, numbering, and printing.
- Billing, financial calculations, payment verification, and settlement.
- Reservations, booking deposits, availability, and capacity enforcement.
- Pizza dough capacity and protected production inventory.
- Inventory, suppliers, stock alerts, and owner analytics.
- Customer QR ordering and bill viewing.
- WebSockets, Redis, Celery, and real-time updates.
- Existing database records and production configuration.
*Do not change these systems during an unrelated task.*

---

## PHASE 4 — VERIFY BEFORE FINISHING
1. Inspect the complete Git diff.
2. Investigate every unexpected changed file.
3. Run `git diff --check`.
4. Run relevant existing backend tests, frontend tests, linting, type checks, and production builds where available.
5. Verify the requested behavior and test related functionality for regressions.
6. Do not claim that tests passed unless they actually ran and passed.
7. Fix only problems introduced by the approved change.
8. Ask before expanding the scope to fix unrelated issues.

---

## PHASE 5 — REPORT RESULTS
Every completed task must report:
1. The exact change implemented.
2. Every changed file and the reason for changing it.
3. Tests and checks actually executed, including failures.
4. Any remaining risks, limitations, or unverified behavior.
5. Confirmation that the complete diff was reviewed.
6. Confirmation that no unrelated changes were intentionally introduced.

---

## PROTECTED OPERATIONS — EXPLICIT APPROVAL REQUIRED
Always obtain explicit approval before:
- Deleting or renaming files or directories.
- Installing, removing, or upgrading dependencies.
- Running database migrations or destructive database commands.
- Changing authentication, authorization, payments, deployment, CI/CD, or production settings.
- Changing API contracts or database schemas.
- Resetting, overwriting, or deleting user or production data.
- Performing broad refactors or edits across unrelated modules.
- *Never expose, print, commit, or transmit secrets, API keys, passwords, or private credentials.*

---

## GIT SAFETY RULES
1. Inspect `git status` before editing.
2. Preserve all pre-existing user changes.
3. **NEVER run:**
   - `git reset --hard`
   - `git clean -fd`
   - `git checkout .`
   - `git restore .`
   - Destructive history-rewriting commands.
4. Never automatically revert existing changes.
5. **Never commit, push, deploy, or publish without explicit approval.**
6. Review `git diff` and `git diff --check` before finishing.
7. Stage only files that belong to the approved task.
8. If a change is wrong, explain a safe, targeted rollback instead of deleting unrelated work.

---

## GIT CHECKPOINT WORKFLOW
- **Before beginning a task**:
  - Inspect the working tree and review existing changes.
  - If the project state is understood and safe, create a checkpoint before starting.
  - If existing uncommitted work is present, preserve it and explain how to checkpoint it without mixing unrelated changes.
- **After completing a task**:
  - Review the complete diff.
  - Run relevant tests and builds.
  - Stage only the verified files.
  - Create a descriptive commit only after approval.

---

## SECRETS AND PRODUCTION SAFETY
- Inspect `.gitignore` before staging files.
- Exclude `.env`, `.env.*`, credentials, private keys, and secret files as appropriate.
- Do not commit local secrets or production credentials.
- Never print secret values in command output or reports.
- Do not access or modify production databases unnecessarily.
- Never run destructive database operations against production.
- Do not deploy or push without explicit approval.

---

## DEFINITION OF DONE
A task is complete only when:
- The approved change is implemented.
- Existing functionality is preserved.
- The final diff is reviewed.
- Relevant checks are reported honestly.
- Unexpected changes are investigated.
- No unnecessary unrelated modifications remain.
