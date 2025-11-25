import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';

// =============== НАСТРОЙКИ ===============

// Основной бот (которому ты пишешь /start)
const MAIN_BOT_TOKEN = '8521336123:AAEHEqcB9tlF2_BoBakTESh9kLaEVotm2uY';

// Бот, который должен ПОЛУЧАТЬ УВЕДОМЛЕНИЯ с юзами
const NOTIFY_BOT_TOKEN = '8432492509:AAHEfvG4GOJ3J1piOF9DQxe3CtVshXMLrQA';

// ID чата, куда слать заявки этим ботом по уведомлениям.
// Сюда подставь свой user_id или id чата/канала, где ты ждёшь юзов.
const NOTIFY_CHAT_ID = '1398396668';

// URL твоего WebApp (где лежит index.html)
const WEBAPP_URL = 'https://niklateamworkbot-production.up.railway.app';

// =============== ЗАПУСК БОТА ===============

const bot = new TelegramBot(MAIN_BOT_TOKEN, { polling: true });

console.log('Бот запущен, жду /start...');

// /start -> кнопка с WebApp
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendMessage(
    chatId,
    'Открываю панель воркера 👇',
    {
      reply_markup: {
        keyboard: [
          [
            {
              text: 'Открыть панель воркера',
              web_app: { url: WEBAPP_URL }
            }
          ]
        ],
        resize_keyboard: true
      }
    }
  );
});

// Ловим данные из WebApp (sendData)
bot.on('message', async (msg) => {
  if (!msg.web_app_data) return;

  try {
    const data = JSON.parse(msg.web_app_data.data);
    console.log('Пришёл payload из WebApp:', data);

    if (data.type === 'user_submit' && data.user) {
      const text = `Новый юз из WebApp:\n@${data.user}`;

      // Отправляем уведомление через бота по уведомлениям
      const url = `https://api.telegram.org/bot${NOTIFY_BOT_TOKEN}/sendMessage`;

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: NOTIFY_CHAT_ID,
          text
        })
      });

      // Ответ тому, кто отправил юза
      await bot.sendMessage(msg.chat.id, 'Юз отправлен по уведомлениям ✅');
    }
  } catch (e) {
    console.error('Ошибка обработки web_app_data:', e);
    await bot.sendMessage(msg.chat.id, 'Ошибка обработки данных из WebApp.');
  }
});
