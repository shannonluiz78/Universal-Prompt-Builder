from http.server import BaseHTTPRequestHandler
from api_core import live_models
import json
class handler(BaseHTTPRequestHandler):
 def do_POST(self):
  origin=self.headers.get('Origin','');host=self.headers.get('Host','')
  if origin and origin!=f'https://{host}':return self.reply(403,{'error':'Invalid origin.'})
  try:n=int(self.headers.get('Content-Length','0'))
  except ValueError:return self.reply(400,{'error':'Invalid request.'})
  if n<=0 or n>4096:return self.reply(413,{'error':'Invalid size.'})
  bearer=self.headers.get('Authorization','')
  token=bearer[7:] if bearer.startswith('Bearer ') else ''
  code,result=live_models(self.rfile.read(n),auth_token=token)
  self.reply(code,result)
 def reply(self,code,obj):
  raw=json.dumps(obj).encode();self.send_response(code)
  for k,v in [('Content-Type','application/json'),('Cache-Control','no-store'),('Content-Length',str(len(raw)))]:self.send_header(k,v)
  self.end_headers();self.wfile.write(raw)
