"""Gemini proxy for Prompt Builder V1.2. Optional encrypted vault credential lookup.

Access patterns:
1) BYOK: user enters a temporary Gemini API key in Settings. The key is sent
   only to this same-origin endpoint via HTTPS; no browser storage, no server logs.
2) Deployment secret: GEMINI_API_KEY environment variable and a REQUIRED
   PROMPT_BUILDER_ACCESS_CODE env variable for hosted access (or explicit local-only).

This is a private beta gateway, NOT a multi-tenant SaaS authorization system.
"""
from __future__ import annotations

import json
import os
import hmac
from urllib import request, error

ALLOWED_MODELS = {"gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.8-flash", "gemini-4-argon", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"}
ALLOWED_MODES = {"text", "image", "video", "image2video"}
ALLOWED_OPERATIONS = {"ping", "enhance", "test", "troubleshoot"}
MAX_BODY = 32000
MAX_PROMPT = 12000


def status():
    from vault_core import configured
    return {"configured": bool(os.getenv("GEMINI_API_KEY")), "vaultConfigured": configured(), "provider": "Gemini", "hint": "Temporary key or private encrypted account vault"}


def process_post(body: bytes, *, local: bool = False, opener=None, auth_token=""):
    if len(body) > MAX_BODY:
        return 413, {"error": "Request too large."}
    try:
        data = json.loads(body)
    except (ValueError, TypeError):
        return 400, {"error": "Invalid JSON request."}
    if not isinstance(data, dict):
        return 400, {"error": "Request must be an object."}
    operation = data.get("operation")
    mode = data.get("mode", "text")
    model = data.get("model", "gemini-3.5-flash-lite")
    if operation not in ALLOWED_OPERATIONS or model not in ALLOWED_MODELS or (operation != "ping" and mode not in ALLOWED_MODES):
        return 400, {"error": "Unknown operation, model, or prompt type."}
    prompt = data.get("prompt", "")
    if not isinstance(prompt, str) or len(prompt) > MAX_PROMPT:
        return 400, {"error": "Prompt must be text under 12,000 characters."}
    if operation != "ping" and not prompt.strip():
        return 400, {"error": "Enter a prompt first."}
    temp_key = data.get("apiKey", "")
    access_code = data.get("accessCode", "")
    if not isinstance(temp_key, str) or not isinstance(access_code, str):
        return 400, {"error": "Invalid credential fields."}
    # Prefer a temporary user-supplied key, then a verified account's encrypted
    # server-side credential, and only then a protected deployment key.
    if temp_key.strip():
        key = temp_key.strip()
    elif auth_token:
        from vault_core import get_saved_key,VaultError
        try:key = get_saved_key(auth_token)
        except VaultError as ex:return ex.status, {"error":ex.message}
    else:
        key = os.getenv("GEMINI_API_KEY", "").strip()
        expected = os.getenv("PROMPT_BUILDER_ACCESS_CODE", "")
        if not key:
            return 503, {"error": "No API key configured. Paste a temporary Gemini key or sign in and save one in AI Settings."}
        if not local and not expected:
            return 403, {"error": "Server API key is disabled for public access. Configure PROMPT_BUILDER_ACCESS_CODE."}
        if expected and not hmac.compare_digest(access_code, expected):
            return 403, {"error": "Private access code is incorrect."}
    if any(c in key for c in "\r\n") or len(key) > 512:
        return 400, {"error": "Invalid API key format."}
    if operation == "ping":
        user_input = "Reply with just: READY"
    elif operation == "enhance":
        optimization = {
            "efficient": "Prefer concise language; remove needless repeated directions, not necessary details.",
            "balanced": "Balance clear instructions, concise wording and enough context for a good result.",
            "creative": "Improve visual or writing direction with concrete, optional creative suggestions; avoid inventing factual details.",
            "accuracy": "Prioritise unambiguous requirements, verifiable assumptions and explicit acceptance checks."
        }
        goal = data.get("optimizeGoal", "balanced")
        if not isinstance(goal, str) or goal not in optimization:
            return 400, {"error": "Unsupported optimization goal."}
        user_input = ("Rewrite the PROMPT below into an efficient, specific, well-structured prompt. "
                      "Preserve all verified facts, requirements, constraints, and output conditions. "
                      "Remove duplication. Do not invent facts, promise unsupported model features, or answer the prompt. "
                      "If essential details are missing, explicitly flag them rather than guessing. "
                      + optimization[goal] + "\n\nPROMPT:\n" + prompt)
    elif operation == "troubleshoot":
        user_input = ("Diagnose the root cause of the following failed AI output or error. "
                      "State which source instructions were ambiguous, missing, contradictory, "
                      "or unsupported. Recommend a revised prompt, without inventing facts or "
                      "claiming a successful test.\n\nORIGINAL PROMPT AND FAILURE:\n"+prompt)
    elif mode != "text":
        user_input = ("You are reviewing an IMAGE or VIDEO generation prompt, not generating media. "
                      "Provide a concise critique: (1) feasibility, (2) missing creative details, "
                      "(3) contradictions and visual consistency risks, (4) up to 3 improvements. "
                      "Do not claim you rendered, saw or evaluated an actual generated image or video.\n\nPROMPT:\n"+prompt)
    else:
        user_input = "Answer the following user prompt faithfully, briefly, and without inventing facts.\n\n"+prompt
    payload = json.dumps({
        "contents": [{"parts": [{"text": user_input}]}],
        "generationConfig": {"maxOutputTokens": 2048}
    }).encode("utf-8")
    url = "https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent"
    req = request.Request(url, data=payload, headers={
        "Content-Type": "application/json", "x-goog-api-key": key,
        "User-Agent": "PromptBuilder/1.2"
    }, method="POST")
    try:
        response = (opener or request.urlopen)(req, timeout=24)
        with response as resp:
            doc = json.loads(resp.read(700000))
        parts = doc.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        result = "\n".join(p.get("text", "") for p in parts if isinstance(p, dict) and p.get("text"))
        if not result.strip():
            return 502, {"error": "Gemini returned no readable text. Try a different model or shorter prompt."}
        usage = doc.get("usageMetadata", {})
        return 200, {"result": result[:24000], "operation": operation, "model": model, "usage": {
            "inputTokens": usage.get("promptTokenCount"), "outputTokens": usage.get("candidatesTokenCount")
        }}
    except error.HTTPError as exc:
        # Don't relay raw provider bodies, which may contain identifiers.
        if exc.code in (401,403):
            return 401, {"error": "Gemini rejected the API key or this model is not available to your project."}
        if exc.code == 404:
            return 404, {"error": "Model not available on this API endpoint. Select a supported model."}
        if exc.code == 429:
            return 429, {"error": "Gemini rate limit or free-tier quota reached. Check AI Studio usage."}
        if exc.code == 400:
            return 400, {"error": "Gemini rejected this request. Check model and input length."}
        return 502, {"error": f"Gemini request failed (provider HTTP {exc.code})."}
    except (OSError, ValueError, KeyError, IndexError):
        return 502, {"error": "Could not contact Gemini or read its response. Please retry."}


def live_models(body:bytes, *,local=False,auth_token='',opener=None):
    """Return only currently allowed text models visible to the caller's Gemini project."""
    if len(body)>4096:return 413,{'error':'Request too large.'}
    try:doc=json.loads(body)
    except (ValueError,TypeError):return 400,{'error':'Invalid JSON.'}
    if not isinstance(doc,dict):return 400,{'error':'Invalid request.'}
    key=doc.get('apiKey','')
    if not isinstance(key,str):return 400,{'error':'Invalid key.'}
    if not key.strip() and auth_token:
        from vault_core import get_saved_key,VaultError
        try:key=get_saved_key(auth_token)
        except VaultError as ex:return ex.status,{'error':ex.message}
    if not key.strip():
        key=os.getenv('GEMINI_API_KEY','')
        expected=os.getenv('PROMPT_BUILDER_ACCESS_CODE','')
        if not local and (not expected or not hmac.compare_digest(str(doc.get('accessCode','')),expected)):
            return 403,{'error':'A private access code is needed to test server model availability.'}
    if not key or len(key)>512 or any(c in key for c in '\r\n'):return 400,{'error':'API key not available.'}
    req=request.Request('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100',headers={'x-goog-api-key':key,'User-Agent':'PromptBuilder/1.2'},method='GET')
    try:
        with (opener or request.urlopen)(req,timeout=16) as resp:payload=json.loads(resp.read(2000000))
        rows=payload.get('models',[])
        live=sorted({m.get('name','').split('/')[-1] for m in rows if isinstance(m,dict) and 'generateContent' in m.get('supportedGenerationMethods',[]) and m.get('name','').split('/')[-1] in ALLOWED_MODELS})
        return 200,{'models':live,'catalogDate':'2026-10-18','note':'Only your project-visible allowlisted text models are shown. Availability may still vary with billing and quota.'}
    except error.HTTPError as exc:
        return (401 if exc.code in (401,403) else 429 if exc.code==429 else 502),{'error':'Gemini model listing failed. Check key, quota or project access.'}
    except (OSError,ValueError):return 502,{'error':'Could not retrieve the Gemini model list.'}
