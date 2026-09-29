import { randomUUID } from "node:crypto";

const has = (text, words) => words.some((word) => text.includes(word));

const ARTIFACT_RULES = [
  {
    type: "telegram_bot",
    title: "Telegram-бот",
    words: ["бот", "telegram", "телеграм", "ассистент", "поддержк"],
  },
  {
    type: "mini_app",
    title: "Telegram Mini App",
    words: ["mini app", "мини апп", "мини-прилож", "кабинет", "каталог"],
  },
  {
    type: "website",
    title: "Сайт",
    words: ["сайт", "портфолио", "корпоративн", "многостранич"],
  },
  {
    type: "landing",
    title: "Лендинг",
    words: ["лендинг", "запуск", "лид", "продаж", "реклам"],
  },
  {
    type: "admin_panel",
    title: "Админ-панель",
    words: ["админ", "управл", "crm", "оператор", "аналитик"],
  },
];

const CAPABILITY_RULES = [
  ["catalog", "Каталог", ["каталог", "товар", "услуг", "меню", "курс"]],
  ["commerce", "Продажи", ["продаж", "магазин", "корзин", "заказ", "оплат"]],
  ["booking", "Запись и бронирование", ["запис", "брон", "расписан", "слот"]],
  ["learning", "Обучение", ["обуч", "школ", "курс", "урок", "тест"]],
  ["support", "Поддержка", ["поддержк", "faq", "вопрос", "оператор"]],
  ["content", "Контент", ["контент", "новост", "стать", "медиа", "блог"]],
  ["community", "Сообщество", ["сообществ", "клуб", "участник", "реферал"]],
  ["notifications", "Уведомления", ["уведом", "напомин", "рассыл"]],
  ["analytics", "Аналитика", ["аналитик", "метрик", "отчёт", "воронк"]],
  ["ai_assistant", "AI-ассистент", ["ai", "ии", "нейросет", "ассистент"]],
];

const DESIGNS = [
  {
    id: "calm",
    title: "Calm System",
    description: "Чистая иерархия, спокойные поверхности, минимум шума.",
  },
  {
    id: "editorial",
    title: "Editorial Premium",
    description: "Выразительная типографика, истории и сильный бренд.",
  },
  {
    id: "expressive",
    title: "Expressive Motion",
    description: "Энергичная композиция, motion и интерактивные акценты.",
  },
];

function inferName(text) {
  const quoted = text.match(/[«"]([^»"]{2,40})[»"]/);
  if (quoted) return quoted[1];

  if (has(text, ["магазин", "товар", "продаж"])) return "Новый магазин";
  if (has(text, ["ассистент", "поддержк"])) return "AI-сервис";
  if (has(text, ["курс", "обуч", "школ"])) return "Образовательный проект";
  return "Новый цифровой продукт";
}

function inferArtifacts(text) {
  const matched = ARTIFACT_RULES.filter((rule) => has(text, rule.words));

  if (!matched.length) {
    return ARTIFACT_RULES.filter((rule) =>
      ["telegram_bot", "mini_app", "landing"].includes(rule.type),
    );
  }

  if (!matched.some((item) => item.type === "telegram_bot")) {
    matched.unshift(ARTIFACT_RULES[0]);
  }

  return matched;
}

function inferCapabilities(text) {
  const matched = CAPABILITY_RULES.filter(([, , words]) => has(text, words));
  const defaults = matched.length
    ? matched
    : CAPABILITY_RULES.filter(([id]) =>
        ["content", "notifications", "analytics"].includes(id),
      );

  return defaults.map(([id, title]) => ({ id, title }));
}

export function createBlueprint(input) {
  const brief = String(input ?? "").trim();
  if (brief.length < 12) {
    throw new Error("Опишите идею немного подробнее — хотя бы одним предложением.");
  }

  const normalized = brief.toLowerCase();
  const capabilities = inferCapabilities(normalized);
  const artifacts = inferArtifacts(normalized).map((artifact) => ({
    type: artifact.type,
    title: artifact.title,
    status: "planned",
    capabilities: capabilities.map((item) => item.id),
  }));

  return {
    id: randomUUID(),
    schemaVersion: "1.0",
    createdAt: new Date().toISOString(),
    status: "draft",
    project: {
      name: inferName(normalized),
      brief,
      locale: "ru",
      intent: "create_and_launch_digital_product",
    },
    artifacts,
    capabilities,
    designDirections: DESIGNS,
    nextQuestions: [
      "Какое главное действие должен совершить конечный пользователь?",
      "Есть ли готовое название, логотип или фирменные цвета?",
      "Какие данные или сервисы необходимо подключить?",
    ],
    pipeline: [
      "requirements",
      "blueprint",
      "design",
      "sandbox",
      "quality_gate",
      "publish",
    ],
  };
}
