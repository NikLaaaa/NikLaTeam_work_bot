import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";

// ====== НАСТРОЙКИ ======

// основной бот (ему пишешь /start)
const MAIN_BOT_TOKEN =
  "8399797924:AAHgUPN-21xGGaXBM6Z_TtStAGNkD2CDCMA";

// бот, который принимает уведомления с юзами
const NOTIFY_BOT_TOKEN =
  "7850373738:AAGJqfdUcrq8XwbvbYnWot1HNevFb8bhc3E";

// chat_id, куда слать юзы ботом-уведомителем
// Поставь сюда свой ID (узнать можно через @userinfobot, @getmyid_bot и т.п.)
const NOTIFY_CHAT_ID = 6427969683; // !!! замени на свой ID

// URL WebApp — домен Railway (замени на свой)
const WEBAPP_URL = "https://niklateamworkbot-production.up.railway.app";

// ====== HTTP-СЕРВЕР ДЛЯ RAILWAY ======
const app = express();
const PORT = process.env.PORT || 8080;

// раздаём ВСЁ из корня (index.html тоже лежит в корне)
app.use(express.static("."));

app.get("/health", (_, res) => {
  res.send("OK");
});

app.listen(PORT, () => {
  console.log("✅ HTTP сервер запущен на порту", PORT);
});

// ====== TELEGRAM-БОТ ОСНОВНОЙ ======
const bot = new TelegramBot(MAIN_BOT_TOKEN, { polling: true });

console.log("🤖 Бот запущен, жду /start...");

// /start -> кнопка с WebApp
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendMessage(
    chatId,
    "Открываю панель воркера 👇",
    {
      reply_markup: {
        keyboard: [
          [
            {
              text: "Открыть панель воркера",
              web_app: { url: WEBAPP_URL }
            }
          ]
        ],
        resize_keyboard: true
      }
    }
  );
});

// Приём данных из WebApp
bot.on("message", async (msg) => {
  if (!msg.web_app_data) return;

  try {
    const data = JSON.parse(msg.web_app_data.data);
    console.log("Пришёл payload из WebApp:", data);

    if (data.type === "user_submit" && data.user) {
      const worker = msg.from || {};
      let workerTag = "";

      if (worker.username) {
        workerTag = "@" + worker.username;
      } else {
        const name = [worker.first_name, worker.last_name]
          .filter(Boolean)
          .join(" ");
        workerTag = name || `id:${worker.id}`;
      }

      const targetUser = data.user.startsWith("@")
        ? data.user
        : "@" + data.user;

      const text =
        `📩 Новый юз из WebApp:\n` +
        `• Юз: ${targetUser}\n` +
        `• Отправил: ${workerTag}`;

      // шлём уведомление через второго бота
      await fetch(
        `https://api.telegram.org/bot${NOTIFY_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: NOTIFY_CHAT_ID,
            text
          })
        }
      );

      // отвечаем воркеру, что всё ок
      await bot.sendMessage(msg.chat.id, "✅ Юз отправлен по уведомлениям");
    }
  } catch (e) {
    console.error("Ошибка обработки web_app_data:", e);
    await bot.sendMessage(msg.chat.id, "❌ Ошибка обработки данных из WebApp.");
  }
});
