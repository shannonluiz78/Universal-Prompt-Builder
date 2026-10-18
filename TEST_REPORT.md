# Prompt Builder V1.1 — QA Test Report

**Date:** 18 October 2026

## Test summary

| Area | Result | Evidence |
|---|---|---|
| Prompt compiler / 4 workflows | PASS | Node engine test suite: Core assertions + 12 starter template scenarios |
| Root-problem questioning | PASS | Coding/agent gap checks, blueprint generation |
| Smart Fill and safe Auto-Repair | PASS | Expected defaults; no fabricated user/project facts |
| Token Saver | PASS | Detailed/Balanced/Efficient output and approximate comparison |
| Preflight and contradiction checks | PASS | Missing tests, no human handoff, orientation conflict |
| Image-to-Video guidance | PASS | Start-frame/continuity/movement in final prompt |
| Gemini API proxy + security constraints | PASS (mocked) | 9 Python unit tests: free-key BYOK, private access, missing/wrong credentials, invalid model/body and visual critique |
| Desktop browser UX (1440×900) | PASS | Chromium + Playwright simulated document test; screenshot `tests/desktop.png` |
| Mobile browser UX (390×844) | PASS | Chromium + Playwright simulated document test; screenshot `tests/phone.png` |
| Beginner custom dropdowns | PASS | Browser test: select Other, type custom camera direction, verify in preview |
| Image reference upload | PASS | Browser test: PNG preview, local file name and bounded image type/size |
| Local prompt library | PASS (session) | Browser test: save, reopen, search UI |
| API status GET | PASS | Local HTTP response (see check below) |
| Real Gemini API key handshake | NOT RUN | Requires user-supplied API key |
| Live Gemini output accuracy | NOT RUN | Requires user-supplied API key |
| Deployed Vercel environment | NOT RUN | No cloud deployment requested or created |
| Cross-session localStorage persistence | NOT FULLY E2E TESTED | Browser sandbox used opaque origin; JS storage paths reviewed; verify online |
| Prior Supabase sync compatibility | NOT IMPLEMENTED | Standalone beta; cloud sync must be integrated before replacing old app |

## Test details

Executed successfully:

- `node tests/engine.test.mjs`
- `python -m unittest discover -s tests -v`
- `python tests/browser_check.py`

Browser test runner uses `page.set_content` + in-memory module injection because the automated browser in this environment blocks navigation to external and localhost URLs. It does exercise the real application JavaScript and responsive CSS. It cannot validate real cross-origin or deployed networking.

## Security notes

- API keys are never persisted in local prompt JSON, localStorage, or browser source files.
- Server environment keys require an access code for hosted use. For local loopback development, server-level key testing is permitted.
- Temporary user keys are transmitted to the same-origin proxy over HTTPS when deployed. Never enter keys on a site you don't control.
- A personal preview access code is not multi-user authentication. Avoid public deployment until authentication, rate limits and abuse controls are added.
- No automatic media upload, rendering or false claims of visual output.

## Release decision

**Ready for user-side local browser trial and personal API-key handshake. Not ready as a public commercial SaaS deployment.** Do not overwrite your old app/cloud library until remaining migration and live-API checks pass.
