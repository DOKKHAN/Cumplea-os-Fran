const { createServer } = require("node:http");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const { createReadStream } = require("node:fs");
const { extname, join, normalize } = require("node:path");

const port = Number(process.env.PORT || 3000);
const siteDir = join(__dirname, "site");
const dataDir = process.env.DATA_DIR || "/data";
const dataFile = join(dataDir, "rsvps.json");
const adminPasscode = process.env.ADMIN_PASSCODE || "frontrow";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

async function ensureDataFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(dataFile, "[]", "utf8");
      return;
    }
    throw error;
  }
}

async function readResponses() {
  await ensureDataFile();
  try {
    const data = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

async function writeResponses(responses) {
  await ensureDataFile();
  await writeFile(dataFile, `${JSON.stringify(responses, null, 2)}\n`, "utf8");
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

function sanitizeResponse(input) {
  const response = {
    id: String(input.id || `rsvp-${Date.now()}`),
    fullName: String(input.fullName || "").trim(),
    email: String(input.email || "").trim(),
    phone: String(input.phone || "").trim(),
    attendance: String(input.attendance || "").trim(),
    costume: String(input.costume || "").trim(),
    guests: Number(input.guests || 0),
    comments: String(input.comments || "").trim(),
    dressAgreement: Boolean(input.dressAgreement),
    updatedAt: new Date().toISOString()
  };

  if (!response.fullName || !response.email || !response.phone || !response.attendance || !response.costume) {
    throw new Error("Missing required RSVP fields");
  }
  if (!Number.isInteger(response.guests) || response.guests < 0 || response.guests > 10) {
    throw new Error("Invalid guests value");
  }
  if (!response.dressAgreement) {
    throw new Error("Dress code agreement is required");
  }

  return response;
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (url.pathname !== "/api/rsvps") return false;

  if (request.method === "GET") {
    if (url.searchParams.get("passcode") !== adminPasscode) {
      sendJson(response, 401, { error: "Unauthorized" });
      return true;
    }
    sendJson(response, 200, { responses: await readResponses() });
    return true;
  }

  if (request.method === "POST") {
    try {
      const body = await readRequestBody(request);
      const incoming = sanitizeResponse(JSON.parse(body || "{}"));
      const responses = await readResponses();
      const index = responses.findIndex((item) => item.id === incoming.id);
      if (index >= 0) {
        responses[index] = incoming;
      } else {
        responses.push(incoming);
      }
      await writeResponses(responses);
      sendJson(response, 200, { response: incoming });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return true;
  }

  sendJson(response, 405, { error: "Method not allowed" });
  return true;
}

function serveStatic(request, response, url) {
  const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = normalize(join(siteDir, pathname));
  const extension = extname(filePath);
  const cacheControl = [".html", ".css", ".js", ".json", ".md"].includes(extension)
    ? "no-store"
    : "public, max-age=604800, immutable";

  if (!filePath.startsWith(siteDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const stream = createReadStream(filePath);
  stream.on("open", () => {
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    });
    stream.pipe(response);
  });
  stream.on("error", () => {
    createReadStream(join(siteDir, "index.html")).pipe(response.writeHead(200, {
      "Content-Type": mimeTypes[".html"],
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }));
  });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (await handleApi(request, response, url)) return;
  serveStatic(request, response, url);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Birthday Fashion Party listening on port ${port}`);
});
