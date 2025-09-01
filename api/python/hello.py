from http.server import BaseHTTPRequestHandler
from datetime import datetime

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        message = {
            "message": "Hello from Python serverless function!",
            "timestamp": datetime.now().isoformat(),
            "path": self.path
        }
        
        self.wfile.write(str(message).encode())
        return
