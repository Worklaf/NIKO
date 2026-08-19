# Настройка Push Уведомлений для N1K∅ (Vercel)

## Шаг 1: Получение Firebase Service Account Key

1. Зайдите в [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. Нажмите на ⚙️ (Settings) → Project Settings
4. Перейдите в раздел "Service accounts"
5. Нажмите "Generate new private key"
6. Сохраните файл как `api/firebase-service-account.json` (для локального тестирования)

**ВАЖНО:** Не коммитить этот файл в Git! Он уже в `.gitignore`.

## Шаг 2: VAPID ключи (уже получены из Firebase)

Вы уже получили VAPID ключ из Firebase Console:
- Public Key: `BO7gzbXFlUvJzea4rQozVRifl2evB6j-zwdBh7rGMBxiT2-UArp-abTloC5iQZ4IPRFcB9bAn1cFbALudJ67EYs`

Этот ключ уже добавлен в:
- `NIKO.html` (строка ~5192)
- `api/send-push-notification.js` (строка ~10)

## Шаг 3: Добавление Environment Variable в Vercel

1. Зайдите в [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект `niko-vert`
3. Перейдите в Settings → Environment Variables
4. Добавьте новую переменную:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Value:** Скопируйте содержимое файла `api/firebase-service-account.json` (весь JSON как строку)
5. Нажмите Save

## Шаг 4: Установка зависимостей

```bash
npm install
```

## Шаг 5: Конвертация иконок в PNG

Сконвертируйте SVG иконки в PNG:
- `icon-192.svg` → `icon-192.png` (192x192)
- `badge-72.svg` → `badge-72.png` (72x72)

Используйте любой онлайн конвертер или:
```bash
# Если установлен ImageMagick
convert icon-192.svg icon-192.png
convert badge-72.svg badge-72.png
```

## Шаг 6: Развертывание на Vercel

Если у вас уже настроен Vercel, просто запушьте изменения:
```bash
git add .
git commit -m "Add push notifications"
git push
```

Vercel автоматически развернет API функцию по адресу:
`https://niko-vert.vercel.app/api/send-push-notification`

## Шаг 5: Интеграция с добавлением треков

При добавлении нового трека в Firestore, вызовите API функцию:

```javascript
// Пример вызова из вашего кода
fetch('https://niko-vert.vercel.app/api/send-push-notification', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    trackId: 'new-track-id',
    track: {
      title: 'Название трека',
      artist: 'Артист',
      cover: 'https://url-to-cover.jpg'
    }
  })
});
```

## Шаг 6: Тестирование

1. Откройте сайт в браузере
2. Нажмите кнопку "🔔 Enable Notifications"
3. Разрешите уведомления
4. Добавьте новый трек и вызовите API функцию
5. Должно прийти push уведомление с обложкой трека!

## Дополнительные иконки

Для красивых уведомлений нужны иконки:
- `icon-192.png` - 192x192 пикселей
- `badge-72.png` - 72x72 пикселей

Разместите их в корне проекта рядом с `NIKO.html`.
