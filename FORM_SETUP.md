# Настройка отправки заявок

Формы отправляют данные в `php/formProcessor.php`. Обработчик требует PHP 8.0+
и рабочий SMTP либо поддержку PHP `mail()` на хостинге.

## Переменные окружения

```text
AUTOKONCEPT_PROJECT_NAME
AUTOKONCEPT_MAIL_TO
AUTOKONCEPT_MAIL_FROM
AUTOKONCEPT_MAIL_FROM_NAME
AUTOKONCEPT_SMTP_HOST
AUTOKONCEPT_SMTP_PORT
AUTOKONCEPT_SMTP_USER
AUTOKONCEPT_SMTP_PASSWORD
AUTOKONCEPT_SMTP_ENCRYPTION
```

Минимально необходимо задать `AUTOKONCEPT_MAIL_TO`. Пароль SMTP нельзя
записывать в файлы сайта или добавлять в архив.

После настройки проверьте обе формы на сервере. Переход на `thank-you.html`
происходит только после ответа обработчика `success: true`.

## Юридические данные

Перед публикацией замените текст о правообладателе в подвале и юридических
окнах на полное наименование компании, ОГРН/ОГРНИП и фактические реквизиты
оператора персональных данных.
