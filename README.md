# Prompt Builder V1.2 — Beta Test Pack

**Status:** Locally built and tested beta, 18 October 2026. Not deployed or verified against your live GitHub/Vercel website. **Back up your V1.1 repository before replacing it.**

Prompt Builder helps users discover the real problem before generating a prompt, save unnecessary tokens, and catch conflicting or missing instructions before sending them to an AI.

## What's new in V1.2

- **Target AI app + model version** in every builder workflow: text, images, video, and image-to-video. Choose the *destination* app, independently from the *Gemini API model* used to optimize, critique or test a prompt.
- **Model lifecycle labels** (Active, Preview, Legacy/Watch, or account-specific) with last verification date and official provider documentation links. A dated catalog is **not** a guarantee a particular account can access a model. Gemini `Check available models` verifies the API model list accessible to your key.
- **AI Optimizer** with goals (Efficient, Balanced, Creative, Accuracy), before/after comparison, estimated token counts, and accept/revert choice. Original prompts remain unless you approve an AI suggestion.
- **Prompt Troubleshooter:** paste a failed result or error for AI-assisted root-cause analysis and improved instructions.
- **Optional encrypted Gemini key vault**: sign in with your own Supabase account; save your Gemini API key once, then reuse after browser reload or next visit without retyping it. Key encrypted on the backend, not in browser storage. Users can delete their saved key.
- Continues V1.1 Problem Detective, Token Saver, Preflight, guided options/custom answers, image-to-video, local prompt library, and browser-first operation without an API key.

**Not yet included:** generating actual images/videos, APIs for Claude/OpenAI/other text-model calls, cloud prompt-library syncing, real-time automatic model-catalog sync for third-party image/video tools. The **destination** selection adapts prompt wording only, not which paid AI service is executed. Actual AI optimize/test uses your connected **Gemini** key.

## Quick local start (Windows)

1. Extract the ZIP. Open `Prompt_Builder_V1_2`.
2. Install Python 3.11+ if it is not already installed.
3. Run `START_WINDOWS.bat` (uses **port 8765** to avoid your earlier port 8080 conflict).
4. Open `http://127.0.0.1:8765`.
5. Free prompt-building works immediately. For live Gemini optimization/testing, enter a **temporary** Gemini API key under **AI Settings**. You may need to select a model that your AI Studio project supports. No account vault is needed for temporary testing.

> To use *permanent* saved Gemini API keys, configure the authenticated cloud vault described below and redeploy. Local testing without vault setup deliberately cannot retain secret API keys across reloads.

## Updating GitHub / Vercel safely

1. Create a backup branch or download your existing V1.1 repository. **Do not paste API keys into GitHub files.**
2. Copy the *contents* of `Prompt_Builder_V1_2/` to your application's repository root. Include the `api/` directory, `catalog.mjs`, `requirements.txt` and `vercel.json`. Avoid copying `__pycache__` or test screenshots to production, although they are harmless.
3. Deploy to a **Vercel Preview** environment before moving production. Test `/api/config` (it should say `vaultEnabled:false` until the vault is configured), `/api/ai` (public safe status only), prompt workflow and mobile layout.
4. Once happy, enable the vault with the steps below and deploy again. If the Vercel Python function runtime rejects imports/dependencies, review its build log rather than putting keys in frontend JavaScript.

### Configure secure account-based API-key saving (optional, but required for persistence)

**Why an account?** For other users, you must prevent one person's key being available to someone else. A user is authenticated before the backend retrieves the encrypted secret.

1. Create or use a Supabase project. Under **Authentication → Providers**, enable Email/Password authentication; configure email confirmation and allowed site URLs for your Vercel deployment. Do not disable security features for convenience.
2. Open **Supabase → SQL Editor**. Run all statements from `supabase_vault.sql`. The key table has row-level security enabled and is blocked from normal browser database roles; only your trusted server can access it.
3. In your **Vercel project → Settings → Environment Variables**, configure:

| Variable | Value / where to find it |
|---|---|
| `SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` (Supabase project URL) |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase **publishable** key (safe for browser) |
| `SUPABASE_SECRET_KEY` | Supabase **secret** key, server-only (`sb_secret_...`) — *OR* legacy `SUPABASE_SERVICE_ROLE_KEY` service-role JWT |
| `PROMPT_BUILDER_VAULT_KEY` | Unique Fernet encryption key generated below; **server-only** |

Generate the Fernet key on your own trusted computer, from the same project folder after installing requirements:

```bash
python -m pip install -r requirements.txt
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Copy the printed output into `PROMPT_BUILDER_VAULT_KEY` in Vercel. **Never add it to source code, GitHub, chat, screenshots or browser settings.** Retain a secure backup: losing/changing this key makes previously saved API keys undecryptable. Keep all the above private except the Supabase URL/publishable key. Enable them only for the Vercel environments you intend to use.

4. Redeploy Vercel for the environment-variable changes. Check `/api/config`: it should now report `vaultEnabled:true` and display *only* the public Supabase URL/publishable key, never any secret or encrypted credential.
5. Open Prompt Builder → **AI Settings → Save API key for future visits**. Create account / sign in with your email and password, confirm email if required. Paste your Gemini key, then choose **Save key securely**. The field clears after saving. Reload the app, sign in (if necessary), choose **Test AI connection**; the backend uses the saved key automatically. You can **Delete saved key** at any time.
6. Each user can register their own account and save **their own** key; their API requests are billed/limited under their own Gemini API project. Gemini consumer subscriptions (Google AI Pro) **do not include paid Gemini API usage**. Use an eligible API free-tier model initially; quotas, model eligibility and price can change.

**Security warning for public SaaS:** This is a beta vault foundation, not a production security certification. Add durable per-account rate limits, anti-abuse controls, encryption-key rotation, monitoring and incident handling, privacy terms, and an authentication/security review before onboarding untrusted large-scale users. Do not place one unrestricted paid admin Gemini API key on an unauthenticated public deployment. Deploy via HTTPS only.

### API mode options

| Connection approach | API key persists? | Setup |
|---|---|---|
| Temporary BYOK in AI Settings | No | Free/quick manual entry every reload |
| Signed-in encrypted Supabase vault | **Yes** | Four Vercel env vars, Supabase SQL + Auth |
| Site-owner `GEMINI_API_KEY` server secret | Yes, site-owned, **not per-user** | Optional; require private `PROMPT_BUILDER_ACCESS_CODE` to prevent unapproved public use |

*The app never writes a user's Gemini API key to `localStorage` or the saved prompt library. Supabase Auth may remember the user's **login session**, which is different from saving the API credential. Reference images are used for local previews and must be attached separately to the destination generator.*

## Model dropdown update policy

- Snapshot last reviewed: **2026-10-18**, in `catalog.mjs`. UI includes model status/date and provider documentation link. The catalog may become stale; update version names/status after consulting **official** sources.
- **Google Gemini:** older 2.5 Flash and Lite may be unavailable to new API projects; they are labelled legacy rather than falsely retired. Preferred free-tier test starting point is Gemini 3.5 Flash-Lite, subject to account availability. 4 Argon is labelled paid API.
- **Claude:** Haiku 4.5 is **watch**, not marked retired without an official retirement announcement. Current Sonnet/Opus/Fable alternatives listed from official documentation.
- **Image and video:** Nano Banana, Midjourney V8.2, Google Flow/Veo 3.1, Runway Gen-4.5, Hailuo 3.0, plus various account-dependent choices. Native Hailuo app access is not guaranteed by availability on Runway. If model IDs differ among web UI / API, use the label as a prompt-style target, not as a guaranteed API identifier.
- **Gemini API availability check:** `Check available Gemini models` asks Google for the list accessible to the connected account and filters for supported Gemini text models. It doesn't verify external destinations such as Midjourney or Hailuo.
- Adding a version to the dropdown does **not** automatically add its API endpoint or paid media generation.

## Test commands

```bash
python -m pip install -r requirements.txt
python -m unittest discover -s tests -q
node tests/engine.test.mjs
python tests/browser_v12.py   # optional: Python Playwright + Chromium installed
```

See `TEST_REPORT.md` for results, limitations, and unverified live-integration steps.
