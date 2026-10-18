# Prompt Builder V1.2 — Beta Test Report

**Built:** 18 October 2026  
**Environment:** Python 3, Node.js, Chromium via Playwright (restricted test container).  
**Release status:** Pre-deployment beta. Back up the existing GitHub repo before uploading.

## Automated checks

- `node tests/engine.test.mjs` — task classification, problem detective, safe repairs, generated prompt composition, token estimates, image-to-video requirements, twelve example scenarios.
- `python -m unittest discover -s tests -q` — Gemini proxy request guards, server owner-key protection, image/video critique-only behavior, optimization goal instructions, Supabase vault sign-in validation, Fernet encryption round-trip, key deletion, no leakage in public config, modern Supabase secret key header rules, live-model-list filtering (mocked provider).
- `python tests/browser_v12.py` — desktop 1440×900 and mobile 390×844, 4 prompt categories, model selectors for Claude/Midjourney/Hailuo, a Prompt Troubleshooter entry point, vault UI disabled gracefully when unconfigured, no uncaught frontend JavaScript errors. Tested using module injection in restricted Chromium because localhost navigation is blocked in this environment.

## Not yet live tested

1. **Real Gemini API call** to a project model using your API key. Requires your own credentials; none were supplied to tests.
2. **Persisted key across sessions with a real Supabase instance.** Automated tests mock Supabase and encryption. Real account signup, email verification, save/reload/reuse/delete must be checked after Vercel vault environment variables and SQL installation.
3. **Vercel deployment on your account.** Package has been locally built, not pushed to your repository nor deployed to production/preview.
4. **Current availability of external image/video apps by subscription and geography** — a provider version appearing on its website does not guarantee access via a particular account or API.
5. **Actual image/video generation** — explicitly not part of this prompt-authoring beta. Gemini visual prompt test yields textual critique only.
6. **Cloud sync of saved prompts** — still local-browser only. API key persistence uses the separate optional encrypted vault.

## Before beta goes public

Use a preview URL first. Configure Supabase account confirmation and redirect URLs; confirm a second account can never read the first user's saved credential. Protect Supabase `sb_secret_...`, Fernet and any server provider API key as server-side environment variables only. Add durable rate limits and misuse monitoring for large public usage, and periodically reverify model catalog entries. Ensure an operator can rotate credentials without losing access to old encrypted keys. Avoid sensitive real customer data with free API tiers. Review `/api/config`, `/api/vault` and `/api/models` in browser network tools to confirm no secret values are returned.
