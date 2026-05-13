import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const preferredPort = Number.parseInt(process.env.PORT || "5173", 10);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function send(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
}

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, `http://${host}`);
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const resolved = path.resolve(root, `.${requestedPath}`);
  const insideRoot = resolved === root || resolved.startsWith(`${root}${path.sep}`);

  if (!insideRoot) {
    return null;
  }

  return resolved;
}

async function findFile(requestUrl) {
  const resolved = resolveRequestPath(requestUrl);
  if (!resolved) return null;

  try {
    const fileStat = await stat(resolved);
    if (fileStat.isDirectory()) {
      return path.join(resolved, "index.html");
    }
    return resolved;
  } catch {
    const hasExtension = path.extname(new URL(requestUrl, `http://${host}`).pathname);
    return hasExtension ? null : path.join(root, "index.html");
  }
}

const server = createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method || "")) {
    send(response, 405, "Method Not Allowed");
    return;
  }

  const filePath = await findFile(request.url || "/");

  if (!filePath) {
    send(response, 404, "Not Found");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      send(response, 404, "Not Found");
      return;
    }

    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Length": fileStat.size,
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(filePath).pipe(response);
  } catch {
    send(response, 500, "Internal Server Error");
  }
});

function listen(port, attemptsLeft = 20) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      listen(port + 1, attemptsLeft - 1);
      return;
    }

    throw error;
  });

  server.listen(port, host, () => {
    const address = server.address();
    const activePort = typeof address === "object" && address ? address.port : port;
    console.log(`Sprite cutter service running at http://${host}:${activePort}`);
  });
}

listen(preferredPort);
