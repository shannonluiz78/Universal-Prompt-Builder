"""Start a LOCAL Prompt Builder server on a safe, independent port.
python server.py --port 8765
Use http://127.0.0.1:8765 (never public-expose this development server).
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
import argparse
import json
import os
from api_core import process_post, status, MAX_BODY, live_models
from vault_core import key_status,public_config,vault_post,VaultError

BASE_DIR = os.path.dirname(os.path.realpath(__file__))
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)
    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self' https://esm.sh; style-src 'self'; img-src 'self' blob: data:; connect-src 'self' https://esm.sh https://*.supabase.co; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        super().end_headers()
    def _json(self,code,obj):
        body=json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def do_GET(self):
        path=urlparse(self.path).path
        if path=="/api/ai":return self._json(200,status())
        if path=="/api/config":return self._json(200,public_config())
        if path=="/api/vault":
            token=self.headers.get('Authorization','')
            try:return self._json(200,key_status(token[7:] if token.startswith('Bearer ') else ''))
            except VaultError as ex:return self._json(ex.status,{'error':ex.message})
        return super().do_GET()
    def do_POST(self):
        path=urlparse(self.path).path
        if path not in ("/api/ai","/api/vault","/api/models"):
            return self._json(404,{"error":"Not found"})
        origin=self.headers.get("Origin", "")
        host=self.headers.get("Host", "")
        # Basic Origin enforcement for same-origin browser clients.
        if origin and origin not in (f"http://{host}", f"https://{host}"):
            return self._json(403,{"error":"Origin is not allowed."})
        try:size=int(self.headers.get('Content-Length','0'))
        except ValueError:return self._json(400,{"error":"Invalid body length."})
        if size<=0 or size>MAX_BODY:return self._json(413,{"error":"Invalid body size."})
        body=self.rfile.read(size)
        local=self.client_address[0] in ("127.0.0.1","::1")
        bearer=self.headers.get('Authorization','')
        token=bearer[7:] if bearer.startswith('Bearer ') else ''
        if path=='/api/vault':code,result=vault_post(body,token)
        elif path=='/api/models':code,result=live_models(body,local=local,auth_token=token)
        else:code,result=process_post(body,local=local,auth_token=token)
        return self._json(code,result)
    def log_message(self,fmt,*args):
        # Only method/path/status; never logs request bodies or secrets.
        super().log_message(fmt,*args)
if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=8765)
    args=parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    print(f'Prompt Builder V1.2 running at http://127.0.0.1:{args.port}',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
