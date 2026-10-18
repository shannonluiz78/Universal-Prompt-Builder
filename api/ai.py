"""Optional Vercel Python function /api/ai.
Requires GEMINI_API_KEY and PROMPT_BUILDER_ACCESS_CODE for protected server-key mode;
or users may supply a temporary BYOK key over HTTPS.
"""
from http.server import BaseHTTPRequestHandler
from api_core import process_post, status, MAX_BODY
import json

class handler(BaseHTTPRequestHandler):
    def _reply(self, code, value):
        body=json.dumps(value).encode('utf-8')
        self.send_response(code)
        for k,v in [('Content-Type','application/json; charset=utf-8'),('Cache-Control','no-store'),('X-Content-Type-Options','nosniff'),('Content-Length',str(len(body)))]:self.send_header(k,v)
        self.end_headers()
        self.wfile.write(body)
    def do_GET(self):self._reply(200,status())
    def do_POST(self):
        try:size=int(self.headers.get('Content-Length','0'))
        except ValueError:return self._reply(400,{'error':'Invalid body length.'})
        if size<=0 or size>MAX_BODY:return self._reply(413,{'error':'Invalid body size.'})
        origin=self.headers.get('Origin','');host=self.headers.get('Host','')
        if origin and origin!=f'https://{host}':return self._reply(403,{'error':'Cross-origin requests not allowed.'})
        code,response=process_post(self.rfile.read(size),local=False)
        self._reply(code,response)
