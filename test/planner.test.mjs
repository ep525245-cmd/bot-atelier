import test from "node:test";
import assert from "node:assert/strict";
import { createBlueprint } from "../src/planner.mjs";

test("creates a connected commerce project", () => {
  const result = createBlueprint(
    "Создай Telegram-бота, Mini App и лендинг для магазина с каталогом, корзиной и оплатой",
  );

  assert.equal(result.schemaVersion, "1.0");
  assert.deepEqual(
    result.artifacts.map((item) => item.type),
    ["telegram_bot", "mini_app", "landing"],
  );
  assert.ok(result.capabilities.some((item) => item.id === "commerce"));
  assert.ok(result.capabilities.some((item) => item.id === "catalog"));
});

test("adds the bot as the control surface", () => {
  const result = createBlueprint(
    "Мне нужен сайт-портфолио фотографа с заявками и аналитикой",
  );
  assert.equal(result.artifacts[0].type, "telegram_bot");
  assert.ok(result.artifacts.some((item) => item.type === "website"));
});

test("rejects an empty brief", () => {
  assert.throws(() => createBlueprint("бот"), /подробнее/);
});
