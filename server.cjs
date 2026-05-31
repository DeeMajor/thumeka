// Phusion Passenger entry point for Plesk's Node.js extension.
//
// Plesk's Node.js panel expects a single startup file at the application
// root. This file boots Next.js programmatically — equivalent to running
// `next start` but inside a Node process that Passenger can manage.
//
// `PORT` is set by Passenger at runtime. `HOSTNAME` defaults to 0.0.0.0
// so the process is reachable from Passenger's worker pool.

const next = require("next");
const http = require("http");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    http
      .createServer((req, res) => handle(req, res))
      .listen(port, () => {
        console.log(`> Thumeka ready on http://${hostname}:${port}`);
      });
  })
  .catch((err) => {
    console.error("Thumeka failed to start:", err);
    process.exit(1);
  });
