"""Public Supabase Auth configuration only. Never return service-role or vault keys."""
from http.server import BaseHTTPRequestHandler
from vault_core import public_config
import json
class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body=json.dumps(public_config()).encode()
        self.send_response(200)
        for k,v in [('Content-Type','application/json'),('Cache-Control','no-store'),('Content-Length',str(len(body)))]:self.send_header(k,v)
        self.end_headers();self.wfile.write(body)
