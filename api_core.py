"""Gemini proxy for Prompt Builder V1.1. Stdlib-only; no credential persistence.

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

ALLOWED_MODELS = {"gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.1-flash-lite"}
ALLOWED_MODES = {"text", "image", "video", "image2video"}
ALLOWED_OPERATIONS = {"ping", "enhance", "test"}
MAX_BODY = 32000
MAX_PROMPT = 12000


def status():
    return {"configured": bool(os.getenv("GEMINI_API_KEY")), "provider": "Gemini", "hint": "Temporary key or protected server secret"}


def process_post(body: bytes, *, local: bool = False, opener=None):
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
    model = data.get("model", "gemini-2.5-flash")
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
    # When using a server-funded key, enforce a private access code on hosted
    # deployments. BYOK always uses the caller's own key instead.
    if temp_key.strip():
        key = temp_key.strip()
    else:
        key = os.getenv("GEMINI_API_KEY", "").strip()
        expected = os.getenv("PROMPT_BUILDER_ACCESS_CODE", "")
        if not key:
            return 503, {"error": "No API key configured. Paste a temporary Gemini key in AI Settings or set GEMINI_API_KEY on the server."}
        if not local and not expected:
            return 403, {"error": "Server API key is disabled for public access. Configure PROMPT_BUILDER_ACCESS_CODE."}
        if expected and not hmac.compare_digest(access_code, expected):
            return 403, {"error": "Private access code is incorrect."}
    if any(c in key for c in "\r\n") or len(key) > 512:
        return 400, {"error": "Invalid API key format."}
    if operation == "ping":
        user_input = "Reply with just: READY"
    elif operation == "enhance":
        user_input = ("Rewrite the PROMPT below into an efficient, specific, well-structured prompt. "
                      "Preserve all verified facts, requirements, constraints, and output conditions. "
                      "Remove duplication. Do not invent facts, promise unsupported model features, or answer the prompt. "
                      "If essential details are missing, explicitly flag them rather than guessing.\n\nPROMPT:\n" + prompt)
    elif mode != "text":
        user_input = ("You are reviewing an IMAGE or VIDEO generation prompt, not generating media. "
                      "Provide a concise critique: (1) feasibility, (2) missing creative details, "
                      "(3) contradictions and visual consistency risks, (4) up to 3 improvements. "
                      "Do not claim you rendered, saw or evaluated an actual generated image or video.\n\nPROMPT:\n"+prompt)
    else:
        user_input = "Answer the following user prompt faithfully, briefly, and without inventing facts.\n\n"+prompt
    payload = json.dumps({
        "contents": [{"parts": [{"text": user_input}]}],
        "generationConfig": {"maxOutputTokens": 650, "temperature": 0.3}
    }).encode("utf-8")
    url = "https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent"
    req = request.Request(url, data=payload, headers={
        "Content-Type": "application/json", "x-goog-api-key": key,
        "User-Agent": "PromptBuilder/1.1"
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
