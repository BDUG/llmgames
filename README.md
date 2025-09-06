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

### Node.js (CORS disabled)

For debugging scenarios where cross-origin requests should be blocked, a small
Node server is included. It serves files without adding any
`Access-Control-Allow-Origin` headers.

```sh
node server.js
```

## Asset structure and directional sprites

Ship graphics are defined in `pirates/assets.json` under a hierarchy of ship
`type`, `nation` and compass `direction`. Each nation may provide images for the
eight directions (`E`, `SE`, `S`, `SW`, `W`, `NW`, `N`, `NE`) as well as a
`default` sprite. The `getShipSprite` helper resolves a sprite by searching for
the requested direction first, then falling back to the nation's `default`
image and finally the type's own `default` entry. When no matching asset is
found a simple placeholder is generated. A ship's `angle` is normalised to one
of the eight direction keys, ensuring the correct sprite is selected as it
turns.

## Isometric coordinates and camera

The `pirates` demo renders its world using an isometric projection where
diamond-shaped tiles are drawn on the canvas.  Helper functions such as
`cartToIso` and `isoToCart` convert between world cartesian coordinates and
screen isometric coordinates.  To keep the player's ship centred on screen the
game converts the canvas midpoint from isometric pixels back into cartesian
space with `isoToCart` and uses the resulting offset for the camera.  The
conversion takes `tileIsoHeight` into account – this value defines the vertical
size of a tile's diamond, so changing it raises or lowers the computed centre
point and shifts the camera up or down in world units.

## World generation

The pirate world uses fractal noise to form islands. The `generateWorld` function
accepts a `frequencyScale` option that multiplies the normalised coordinates
before sampling noise. Increasing this value raises the noise frequency and
creates more fragmented terrain. A default of `3` is used to favour small
islands. The `minIslandSpacing` option enforces a minimum Chebyshev distance
between island coasts, eroding the smaller island when the spacing is not met.
By default this distance is `5` tiles.
