"""Authenticated, encrypted, per-user credential vault for Prompt Builder.

Deployment needs Supabase Auth + PostgREST, a service-role secret in the SERVER,
plus a Fernet encryption key. Never expose any of those secrets to the client.
No unencrypted API key or ciphertext is ever returned to the browser.
"""
from __future__ import annotations
import json,os,re
from urllib import request,error,parse

class VaultError(Exception):
    def __init__(self,status,message):
        self.status,self.message=status,message
        super().__init__(message)

CONFIG_NAMES=('SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','PROMPT_BUILDER_VAULT_KEY')
def _service_key():
    return os.getenv('SUPABASE_SECRET_KEY','').strip() or os.getenv('SUPABASE_SERVICE_ROLE_KEY','').strip()

def configured():
    return all(os.getenv(k,'').strip() for k in CONFIG_NAMES) and bool(_service_key())

def public_config():
    if not configured():return {'configured':False, 'vaultEnabled':False}
    return {'configured':True,'vaultEnabled':True,'supabaseUrl':os.environ['SUPABASE_URL'].rstrip('/'), 'supabasePublishableKey':os.environ['SUPABASE_PUBLISHABLE_KEY']}

def _settings():
    if not configured():raise VaultError(503,'Encrypted account vault is not configured on this server.')
    base=os.environ['SUPABASE_URL'].rstrip('/')
    if not re.fullmatch(r'https://[a-zA-Z0-9.-]+',base):raise VaultError(503,'Invalid Supabase server URL.')
    return base,os.environ['SUPABASE_PUBLISHABLE_KEY'],_service_key()

def _request(url,headers,*,data=None,method='GET',opener=None):
    req=request.Request(url,data=data,headers=headers,method=method)
    try:
        with (opener or request.urlopen)(req,timeout=12) as resp:
            raw=resp.read(200000)
            return json.loads(raw) if raw else {}
    except error.HTTPError as exc:
        # Never relay raw Supabase error content; it might include sensitive data.
        if exc.code in (400,401,403):raise VaultError(401,'Sign in again to use the encrypted vault.')
        raise VaultError(502,'The credential vault could not complete this request.')
    except (OSError,ValueError) as exc:
        raise VaultError(502,'The credential vault is temporarily unavailable.') from exc

def _get_user_id(token,opener=None):
    if not isinstance(token,str) or len(token)<20 or len(token)>10000:
        raise VaultError(401,'Sign in before using your saved API key.')
    base,pub,_=_settings()
    doc=_request(base+'/auth/v1/user',{'apikey':pub,'Authorization':'Bearer '+token},opener=opener)
    uid=doc.get('id') if isinstance(doc,dict) else None
    if not uid or not re.fullmatch(r'[0-9a-fA-F-]{36}',uid):raise VaultError(401,'Your sign-in session is invalid.')
    return uid

def _fernet():
    from cryptography.fernet import Fernet
    try:return Fernet(os.environ['PROMPT_BUILDER_VAULT_KEY'].encode())
    except (ValueError,KeyError) as exc:raise VaultError(503,'Vault encryption configuration is invalid.') from exc

def _db_headers():
    base,_,secret=_settings()
    headers={'apikey':secret,'Content-Type':'application/json','Accept':'application/json'}
    if secret.startswith('eyJ'):headers['Authorization']='Bearer '+secret  # legacy JWT service-role only
    return base,headers

def _credential_row(uid,opener=None):
    base,h=_db_headers()
    query=parse.urlencode({'user_id':'eq.'+uid,'provider':'eq.gemini','select':'encrypted_key,updated_at'})
    result=_request(base+'/rest/v1/prompt_builder_api_keys?'+query,h,opener=opener)
    if not isinstance(result,list):raise VaultError(502,'Unexpected vault response.')
    return result[0] if result else None

def key_status(token,opener=None):
    uid=_get_user_id(token,opener)
    row=_credential_row(uid,opener)
    return {'saved':bool(row),'provider':'gemini','updatedAt':row.get('updated_at') if row else None}

def get_saved_key(token,opener=None):
    uid=_get_user_id(token,opener)
    row=_credential_row(uid,opener)
    if not row:raise VaultError(404,'No saved API key. Save a key in AI Settings first.')
    try:return _fernet().decrypt(row['encrypted_key'].encode(),ttl=None).decode()
    except Exception as exc:raise VaultError(503,'Saved key could not be decrypted. Ask the site owner to restore the original vault encryption key.') from exc

def save_key(token,key,opener=None):
    uid=_get_user_id(token,opener)
    if not isinstance(key,str) or not 12<=len(key)<=512 or any(c in key for c in '\r\n'):
        raise VaultError(400,'Enter a valid API key (12–512 characters).')
    encrypted=_fernet().encrypt(key.encode()).decode()
    base,h=_db_headers()
    h['Prefer']='resolution=merge-duplicates,return=minimal'
    payload=json.dumps({'user_id':uid,'provider':'gemini','encrypted_key':encrypted}).encode()
    _request(base+'/rest/v1/prompt_builder_api_keys?on_conflict=user_id,provider',h,data=payload,method='POST',opener=opener)
    return {'saved':True,'provider':'gemini'}

def delete_key(token,opener=None):
    uid=_get_user_id(token,opener)
    base,h=_db_headers()
    query=parse.urlencode({'user_id':'eq.'+uid,'provider':'eq.gemini'})
    _request(base+'/rest/v1/prompt_builder_api_keys?'+query,h,method='DELETE',opener=opener)
    return {'saved':False,'provider':'gemini'}

def vault_post(body:bytes,token:str):
    if len(body)>4096:return 413,{'error':'Request too large.'}
    try:doc=json.loads(body)
    except (ValueError,TypeError):return 400,{'error':'Invalid JSON.'}
    if not isinstance(doc,dict):return 400,{'error':'Invalid request.'}
    try:
        if doc.get('operation')=='save':return 200,save_key(token,doc.get('apiKey',''))
        if doc.get('operation')=='delete':return 200,delete_key(token)
        return 400,{'error':'Unsupported vault operation.'}
    except VaultError as exc:return exc.status,{'error':exc.message}
