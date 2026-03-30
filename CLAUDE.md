# CLAUDE.md

This file provides guidance to AI assistants (Claude Code and others) working in this repository.

---

## Repository Status

This repository is currently **empty** — no source files, dependencies, or configuration exist yet. This CLAUDE.md serves as a living document; update it as the project takes shape.

---

## Project Overview

- **Repository:** `nathomps-cloud/repurpose`
- **Purpose:** *(To be filled in as the project is defined)*
- **Tech stack:** *(To be filled in)*
- **Language(s):** *(To be filled in)*

---

## Repository Structure

*(Update this section once the project structure is established. Example layout:)*

```
repurpose/
├── CLAUDE.md          # This file
├── README.md          # User-facing documentation
├── src/               # Source code
├── tests/             # Test suite
├── docs/              # Extended documentation
└── .github/
    └── workflows/     # CI/CD pipelines
```

---

## Development Setup

*(Fill in once the stack is chosen. Common examples:)*

### Install dependencies
```bash
# Node.js
npm install

# Python
pip install -e ".[dev]"

# Go
go mod download
```

### Run the project
```bash
# Fill in the start/run command
```

### Run tests
```bash
# Fill in the test command
```

---

## Key Conventions

### Git workflow
- **Development branch:** `claude/add-claude-documentation-Obvn4` (current feature branch)
- Default branch: `main`
- Branch naming: `<type>/<short-description>` (e.g., `feat/add-auth`, `fix/null-check`)
- Commit messages: use conventional commits style — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

### Code style
- *(Fill in linter/formatter preferences, e.g., ESLint + Prettier, Black + isort, gofmt)*
- Run the formatter before committing
- Do not suppress linter warnings without a documented reason

### Testing
- All new functionality must include tests
- Tests live alongside source in `tests/` (or colocated, depending on stack)
- Aim for high coverage on business logic; avoid testing framework internals

### Documentation
- Public APIs and exported functions must have docstrings/JSDoc
- Update this CLAUDE.md when project structure or conventions change
- Keep README.md current with setup and usage instructions

---

## CI/CD

*(Describe pipeline once configured. Example:)*

- Pull requests trigger lint, type-check, and test runs
- Merges to `main` trigger deployment to staging
- Tagged releases (`v*`) trigger production deploy

---

## AI Assistant Guidelines

When working in this repository, follow these rules:

1. **Read before editing** — always read a file before modifying it.
2. **Minimal changes** — make only the changes needed for the task; do not refactor surrounding code.
3. **No speculative features** — implement exactly what is asked, not hypothetical future needs.
4. **Security first** — never introduce command injection, SQL injection, XSS, or other OWASP Top 10 vulnerabilities.
5. **Tests required** — new logic should come with tests unless the user explicitly says otherwise.
6. **No secrets in code** — never hardcode credentials, tokens, or keys; use environment variables.
7. **Confirm before destructive actions** — deleting files, dropping data, or force-pushing requires explicit user confirmation.
8. **Keep this file updated** — after significant structural changes, update CLAUDE.md to reflect the new state.

---

## Environment Variables

*(List required environment variables once known. Example:)*

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Connection string for the database | Yes |
| `API_KEY` | External service API key | Yes |
| `DEBUG` | Enable debug logging (`true`/`false`) | No |

Copy `.env.example` to `.env` and fill in values before running locally.

---

## Useful Commands

*(Fill in as the project grows. Example:)*

```bash
# Lint
npm run lint

# Format
npm run format

# Type-check
npm run typecheck

# Test
npm test

# Build
npm run build
```

---

*Last updated: 2026-03-30 — repository initialized, no source code yet.*
