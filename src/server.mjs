import http from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBlueprint } from "./planner.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const BLUEPRINTS = path.join(DATA, "blueprints.json");
const PORT = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(body);
}

async function readJsonBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 100_000) throw new Error("Запрос слишком большой.");
  }
  return JSON.parse(body || "{}");
}

async function saveBlueprint(blueprint) {
  await mkdir(DATA, { recursive: true });
  let current = [];
  try {
    current = JSON.parse(await readFile(BLUEPRINTS, "utf8"));
  } catch {}
  current.unshift(blueprint);
  await writeFile(BLUEPRINTS, JSON.stringify(current.slice(0, 50), null, 2));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return send(res, 200, JSON.stringify({ ok: true }));
    }

    if (req.method === "POST" && url.pathname === "/api/blueprints") {
      const body = await readJsonBody(req);
      const blueprint = createBlueprint(body.brief);
      await saveBlueprint(blueprint);
      return send(res, 201, JSON.stringify(blueprint));
    }

    if (req.method !== "GET") {
      return send(res, 405, JSON.stringify({ error: "Method not allowed" }));
    }

    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(PUBLIC, safePath);
    if (!filePath.startsWith(PUBLIC)) throw new Error("Invalid path");

    const data = await readFile(filePath);
    send(
      res,
      200,
      data,
      types[path.extname(filePath)] || "application/octet-stream",
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return send(res, 404, JSON.stringify({ error: "Not found" }));
    }
    send(res, 400, JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Bot Atelier prototype: http://localhost:${PORT}`);
});
