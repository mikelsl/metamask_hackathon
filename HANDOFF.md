# Delegated MindGames Arena — Handoff for GitHub Upload + HackQuest Submission

## Objective

Next session: upload the MetaMask/1Shot hackathon project to GitHub safely, then submit to HackQuest. Do not skip safety review.

## Current status

- Status: **handoff-ready / upload-deferred**.
- No GitHub upload, commit, push, repo creation, release, or HackQuest submission has been performed yet.
- Local docs, video/PPTX, upload checklist, and security review are ready.
- 2026-05-14 16:24 update: `SUBMISSION_FINAL_ANSWERS.md` now explicitly includes the planned x402 + ERC-7710 extension path. Frame x402 as **planned / extension-track**, not as completed live MVP functionality.

## Key paths

```text
hackathon/metamask/
hackathon/metamask/mindgames-arena/
```

Important files:

```text
SUBMISSION_FINAL_ANSWERS.md
SUBMISSION_PREP.md
DEMO_SCRIPT.md
PRESENTATION_OUTLINE.md
GITHUB_UPLOAD_CHECKLIST.md
SECURITY_REVIEW.md
GITHUB_UPLOAD_MANIFEST.txt
submission-assets/presentation-video-2026-05-14-v2/Delegated-MindGames-Arena-Presentation-v2-2026-05-14.mp4
submission-assets/presentation-video-2026-05-14-v2/Delegated-MindGames-Arena-Presentation-v2-2026-05-14.pptx
mindgames-arena/
```

## Validation already completed

From `mindgames-arena/`:

```bash
npm run check
npm run build
npm run contracts:compile
npm run scan:legacy
npm audit --audit-level=moderate
```

Results:

- check/build/contracts/legacy scan: passed.
- npm audit: only 2 low-severity `solc -> tmp`; do not force-fix unless retesting compile.
- High-confidence sensitive-data scan over candidate upload manifest: no real credential values or local paths. One expected false positive remains in the 1Shot adapter because a variable name contains payment-token wording.

## Upload scope

Use `GITHUB_UPLOAD_MANIFEST.txt` and `.gitignore` as the current candidate source of truth.

Exclude:

- `.env`, `.env.*`, `.env.backup-*`
- `node_modules/`
- `.runtime/`
- `artifacts/`
- `dist/`
- logs / pid files
- generated `mindgames-arena/web/data/*.json` because they had local artifact paths
- `submission-assets/` by default unless Mike explicitly approves adding selected final MP4/PPTX

## Public identifiers requiring Mike approval

Before any upload, ask Mike to approve:

- Telegram bot: `https://t.me/metamask_mindgame_bot`
- Dashboard: `https://openclaw.yuzu-swap.com/dashboard/metamask/index.html`
- Deposit page: `https://openclaw.yuzu-swap.com/dashboard/metamask/deposit.html`
- Claim page: `https://openclaw.yuzu-swap.com/dashboard/metamask/claim.html`
- Base / Arbitrum / OP Sepolia vault address: `0x5677F20bD56538F20051Fe8Bf002e6D06780d85c`
- Mantle Sepolia legacy vault: `0xFbadd57084612223aA4D24eA61d7EBe7d470A35E`
- Artifact roots in `SUBMISSION_FINAL_ANSWERS.md`
- Contact email: `m@yuzu-swap.com`
- Whether to publish the v2 video/PPTX via repo, release, or external upload

## Recommended next steps

1. Read this file, `GITHUB_UPLOAD_CHECKLIST.md`, `SECURITY_REVIEW.md`, and the x402 section in `SUBMISSION_FINAL_ANSWERS.md`.
2. Create a clean staging copy outside the working tree or initialize git at `hackathon/metamask` only after checking `.gitignore`.
3. Run:

```bash
git status --short
git add .
git status --short
git diff --cached --stat
```

4. Confirm no excluded files are staged.
5. Ask Mike to approve public identifiers and staged summary.
6. Only after approval: create GitHub repo / push.
7. Fill GitHub URL and video URL in `SUBMISSION_FINAL_ANSWERS.md`.
8. When filling HackQuest, include x402 only as a planned paid-room / pay-per-agent-action extension using bounded ERC-7710 payment permissions.
9. Open HackQuest form and submit using prepared answers.

## Important caution

Mike's global rule: before any GitHub or external upload, perform strict sensitive-info review and wait for explicit confirmation. Public addresses/txs/endpoints are not secrets, but still require Mike approval because they are linkable identifiers.
