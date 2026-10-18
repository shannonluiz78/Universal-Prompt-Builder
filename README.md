# Prompt Builder V1.1 — Private Beta

**Tagline:** Think smarter. Prompt better. Waste less.

This is a new standalone V1.1 candidate based on the previous PromptCraft product requirements. It does **not** overwrite your old application. Keep your old PromptCraft deployment and files as a backup.

## What's built

- New youthful, responsive desktop and mobile workspace branded **Prompt Builder**.
- Four workflows: Text, Image, Video, Image → Video.
- Beginner questions, dropdown presets, **Other — type my own**, and one-click **Smart Fill**.
- **Smart Start** picks the likely studio/task from your idea (you can change it).
- **Problem Detective** asks about root causes, audiences, missing requirements and acceptance criteria.
- **Token Saver** produces Efficient, Balanced and Detailed versions; displays approximate token comparisons (characters/4, not actual billed tokens).
- **Preflight & Auto-Repair** flags missing requirements and adds only safe generic defaults. It never assumes real project facts.
- 12 starter templates, local library, search, JSON import/export, TXT output.
- Gemini connection tester and text answer/enhance/visual critique. No actual image/video generation.
- Image-to-Video references: local-only image preview (JPG/PNG/WebP, max 5 MB); the image is NOT uploaded automatically or sent to Gemini; upload it separately at your video destination.
- English and Simplified Chinese **output-language selection**. Chinese interface labels are **partially translated** in this beta.

## Quick start on a Windows PC

1. Extract the ZIP **entirely** to a folder, e.g. `Documents\\Prompt_Builder_V1_1`.
2. Install **Python 3** if you don't already have it (python.org). This app needs no third-party Python packages.
3. Double-click `START_WINDOWS.bat`, or open Command Prompt in that folder and run:

   ```bat
   py -3 server.py --port 8765
   ```

4. Open **http://127.0.0.1:8765** in your browser. Leave the Command Prompt window open.
5. Choose a prompt category and try the **Smart Start**, **Smart Fill**, **Preflight** and **Token Saver** tools.

**Important:** The app runs on **port 8765**, not port 8080. This avoids your earlier local-site port collision. If port 8765 is occupied, use `py -3 server.py --port 8766` and open `http://127.0.0.1:8766` instead.

**Do not double-click `index.html` to run it:** ES modules and API requests need an HTTP server.

## Get a free Gemini API key

1. Visit https://aistudio.google.com/api-keys, sign in, and create an API key for a project in the **Free Tier**.
2. Do **not** activate billing merely to test a free-tier supported model.
3. Open **AI Settings** in Prompt Builder.
4. Choose `Gemini 2.5 Flash` (or an available free-tier model).
5. Paste your key into **Gemini API key** and choose **Test AI connection**.
6. If you see **Connected**, return to **Create prompt**, make a prompt, and select **Test with AI**.

**Important:** Google AI Pro and Gemini API usage/billing are separate. Google can change free-tier model eligibility and rate limits; check https://ai.google.dev/gemini-api/docs/pricing.

### What is and isn't saved

- Temporary API keys are kept only in the Settings input while the current page stays open. They are sent to the same-origin backend for requests. They are not stored in localStorage or the library JSON.
- The backend does not store or log submitted keys or prompt content (the provider may process data under its terms).
- Local drafts and saved prompts are stored in browser localStorage. Clearing browser storage loses local items; export JSON for backups.
- Legacy PromptCraft local-library entries under `pc_library_v1` are imported **only if** the new library is initially empty, when both apps use the same browser origin. The old entries are not deleted. If the apps use different origins/domains, use export/import instead.
- The private beta does **not** replicate the old Supabase cloud sign-in/cloud sync; treat that integration as a required follow-up before replacing the old production app.
- The browser UI is currently English-first; the output language can be Chinese.

## Optional online preview with Vercel

The project contains an optional Python `/api/ai` endpoint and `vercel.json`. Deploy the whole folder to a **new** Vercel project/repository rather than overwriting PromptCraft. Vercel runtime compatibility should be confirmed during staging deployment.

There are two AI connection modes:

**Private server key (recommended for online personal testing):** Set `GEMINI_API_KEY` and `PROMPT_BUILDER_ACCESS_CODE` as encrypted Vercel environment variables; redeploy; leave Gemini API key field blank, enter the access code in Settings. The server rejects public use of its environment key unless protected by an access code. This access code is a simple personal-beta gate, **not** enterprise-grade identity, abuse protection, or rate limiting. Do not publicly promote a deployment funded with your key.

**Temporary BYOK (Bring Your Own Key):** Leave server Gemini key unset; paste your personal key in Settings and send it over **HTTPS** to your own hosted backend. This key is not saved or shared by the app, but untrusted public hosting, browser extensions, and malicious scripts can pose risks. Use only on a site you control.

Before opening this as a public SaaS, add proper user authentication, provider quotas/rate limiting, reliable database persistence, privacy terms, user deletion, audit logs, and abuse protection.

## Run tests

```bat
node tests/engine.test.mjs
py -3 -m unittest discover -s tests -v
```

Playwright browser smoke test (optional, requires Playwright Python and Chromium):

```bat
py -3 tests/browser_check.py
```

Browser smoke test loads the UI into a sandbox document with inline-injected local modules because this test environment blocks Chromium navigation. It tests interactions and basic responsiveness, but does not establish a live deployed site's behaviour.

## Known limitations

- No live Gemini test was possible without a personal API key. The HTTP client, response parsing, errors, and credential gates were tested with mocks.
- No image/video rendering. Visual AI "Test" is critique-only.
- Image references are not persistently saved. They must be re-selected and supplied separately to destination media tools.
- Root cause detective, safety checks and Smart Fill are rule-based; complex or ambiguous briefs may still need more questions.
- Token counts are approximate and cannot guarantee the lowest cost or best response.
- No cloud sync yet in this standalone V1.1, and old PromptCraft data migration is limited to compatible local library records.
- Full Chinese UI translation, multi-provider APIs, server-side user accounts and cost reporting are later phases.

## Files

- `index.html` — responsive user interface
- `styles.css` — visual design
- `app.js` — interactive UI state and browser library
- `engine.mjs` — pure prompt builder and intelligence engine
- `api_core.py` — Gemini API proxy (server-side only)
- `api/ai.py` — optional Vercel serverless adapter
- `server.py` — local Python server
- `vercel.json` — basic web response headers
- `tests/` — automated test code and screenshots
- `TEST_REPORT.md` — executed tests and limitations
