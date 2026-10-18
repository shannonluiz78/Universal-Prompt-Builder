"""Vercel /api/vault and /api/vault?operation=status endpoint."""
from http.server import BaseHTTPRequestHandler
from vault_core import vault_post,key_status,VaultError
import json
class handler(BaseHTTPRequestHandler):
    def reply(self,code,obj):
        body=json.dumps(obj).encode()
        self.send_response(code)
        for k,v in [('Content-Type','application/json'),('Cache-Control','no-store'),('X-Content-Type-Options','nosniff'),('Content-Length',str(len(body)))]:self.send_header(k,v)
        self.end_headers();self.wfile.write(body)
    def _token(self):
        v=self.headers.get('Authorization','')
        return v[7:] if v.startswith('Bearer ') else ''
    def do_GET(self):
        try:self.reply(200,key_status(self._token()))
        except VaultError as ex:self.reply(ex.status,{'error':ex.message})
    def do_POST(self):
        origin=self.headers.get('Origin','');host=self.headers.get('Host','')
        if origin and origin!=f'https://{host}':return self.reply(403,{'error':'Invalid origin.'})
        try:size=int(self.headers.get('Content-Length','0'))
        except ValueError:return self.reply(400,{'error':'Invalid body length.'})
        if size<=0 or size>4096:return self.reply(413,{'error':'Invalid body size.'})
        code,obj=vault_post(self.rfile.read(size),self._token());self.reply(code,obj)
