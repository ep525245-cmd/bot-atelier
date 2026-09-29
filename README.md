# Bot Atelier — Master Creator Bot prototype

Рабочий vertical prototype универсальной AI-фабрики. Пользователь описывает
цифровой продукт, а система формирует единый Project Blueprint для Telegram-бота,
Mini App, сайта/лендинга и административной части.

## Запуск

```bash
npm run dev
```

Откройте `http://localhost:4173`.

## Проверка

```bash
npm test
```

## Что уже работает

- чатовый интерфейс Master Creator Bot;
- анализ свободного описания;
- определение необходимых артефактов;
- подбор capability modules;
- создание универсального Project Blueprint;
- визуальный preview структуры проекта;
- сохранение blueprint в `data/blueprints.json`.

## Следующий инженерный шаг

Заменить rule-based planner на LLM planner со строгим JSON Schema, добавить
Telegram webhook adapter и отдельные renderers для bot, Mini App и website.
