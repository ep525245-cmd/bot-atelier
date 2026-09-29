import http from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBlueprint } from "./src/planner.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const BLUEPRINTS = path.join(DATA, "blueprints.json");
const PORT = Number(process.env.PORT || 4173);

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const BOT_USERNAME = process.env.BOT_USERNAME || "BotAtelierCreatorBot";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const PUBLIC_URL = (process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || "")
  .replace(/\/$/, "");

const telegramApi = (method) =>
  `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

const contentTypes = {
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

async function telegram(method, payload) {
  if (!BOT_TOKEN) throw new Error("BOT_TOKEN не настроен.");
  const response = await fetch(telegramApi(method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.description || `Telegram ${method} failed`);
  return result.result;
}

function blueprintSummary(blueprint) {
  const artifacts = blueprint.artifacts.map((item) => `• ${item.title}`).join("\n");
  const capabilities = blueprint.capabilities.map((item) => item.title).join(", ");
  return [
    `Проект: ${blueprint.project.name}`,
    "",
    "Создам:",
    artifacts,
    "",
    `Возможности: ${capabilities}`,
    "",
    "Это первый blueprint. Откройте Studio, чтобы увидеть структуру и продолжить настройку.",
  ].join("\n");
}

async function handleTelegramUpdate(update) {
  const message = update.message;
  if (!message?.chat?.id) return;

  const chatId = message.chat.id;
  const text = String(message.text || message.caption || "").trim();

  if (text === "/start") {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: [
        "Я Bot Atelier — универсальный AI-конструктор.",
        "",
        "Опишите, что хотите создать: Telegram-бота, Mini App, сайт, лендинг или связанную систему.",
        "",
        "Пример:",
        "«Создай бота, Mini App и сайт для магазина с каталогом, оплатой и уведомлениями».",
      ].join("\n"),
      reply_markup: PUBLIC_URL
        ? {
            inline_keyboard: [
              [{ text: "Открыть Bot Atelier Studio", web_app: { url: PUBLIC_URL } }],
            ],
          }
        : undefined,
    });
    return;
  }

  if (text.startsWith("/")) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: "Опишите проект обычным сообщением или используйте /start.",
    });
    return;
  }

  try {
    await telegram("sendChatAction", { chat_id: chatId, action: "typing" });
    const blueprint = createBlueprint(text);
    await saveBlueprint(blueprint);
    await telegram("sendMessage", {
      chat_id: chatId,
      text: blueprintSummary(blueprint),
      reply_markup: PUBLIC_URL
        ? {
            inline_keyboard: [
              [{ text: "Посмотреть blueprint", web_app: { url: PUBLIC_URL } }],
            ],
          }
        : undefined,
    });
  } catch (error) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: error.message || "Не удалось создать blueprint. Опишите идею подробнее.",
    });
  }
}

async function configureTelegram() {
  if (!BOT_TOKEN || !PUBLIC_URL || !WEBHOOK_SECRET) {
    console.log("Telegram webhook skipped: add BOT_TOKEN, WEBHOOK_SECRET and PUBLIC_URL.");
    return;
  }

  const me = await telegram("getMe", {});
  console.log(`Telegram bot connected: @${me.username || BOT_USERNAME}`);

  await telegram("setWebhook", {
    url: `${PUBLIC_URL}/telegram/webhook`,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });

  await telegram("setMyCommands", {
    commands: [
      { command: "start", description: "Начать создание проекта" },
    ],
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return send(
        res,
        200,
        JSON.stringify({
          ok: true,
          telegramConfigured: Boolean(BOT_TOKEN && WEBHOOK_SECRET && PUBLIC_URL),
        }),
      );
    }

    if (req.method === "POST" && url.pathname === "/api/blueprints") {
      const body = await readJsonBody(req);
      const blueprint = createBlueprint(body.brief);
      await saveBlueprint(blueprint);
      return send(res, 201, JSON.stringify(blueprint));
    }

    if (req.method === "POST" && url.pathname === "/telegram/webhook") {
      if (!WEBHOOK_SECRET) {
        return send(res, 503, JSON.stringify({ error: "Webhook is not configured" }));
      }
      if (req.headers["x-telegram-bot-api-secret-token"] !== WEBHOOK_SECRET) {
        return send(res, 403, JSON.stringify({ error: "Forbidden" }));
      }
      const update = await readJsonBody(req);
      send(res, 200, JSON.stringify({ ok: true }));
      handleTelegramUpdate(update).catch((error) =>
        console.error("Telegram update error:", error.message),
      );
      return;
    }

    if (req.method !== "GET") {
      return send(res, 405, JSON.stringify({ error: "Method not allowed" }));
    }

    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(PUBLIC, safePath);
    if (!filePath.startsWith(PUBLIC)) throw new Error("Invalid path");

    const data = await readFile(filePath);
    return send(
      res,
      200,
      data,
      contentTypes[path.extname(filePath)] || "application/octet-stream",
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return send(res, 404, JSON.stringify({ error: "Not found" }));
    }
    console.error(error);
    return send(res, 400, JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Bot Atelier: http://localhost:${PORT}`);
  configureTelegram().catch((error) =>
    console.error("Telegram setup error:", error.message),
  );
});