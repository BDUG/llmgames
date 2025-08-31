# llmgames
Sharing games generated via language models 

This project was started as a test if a full functioning game can be created via simple chat bot prompts. 

Every folder contain a game. The objective to have single file, browser games. But, happy to extend it as far we come.

Note: It is by far not production ready and is only used for evaluation purposes. No warranty and liability is given. Private person targeting no commercial benefits spend spere time.

## Local development

Opening `index.html` through a `file://` URL can block `fetch` requests in many browsers. Run a small web server instead, which will provide permissive CORS headers.

### Python

```sh
python3 - <<'PY'
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()
ThreadingHTTPServer(("localhost", 8000), Handler).serve_forever()
PY
```

### Node.js

```sh
npx http-server . -p 8000 --cors
```
