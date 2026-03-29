Add a new Telegram notification type to the Iqro Learn project at:
D:\User data\Downloads\a0-project\a0-project

Notification context: $ARGUMENTS

Steps:
1. Read convex/telegram.ts fully to understand the dispatchNotification pattern
2. Read convex/schema.ts for notificationLogs and telegramLinks tables
3. Add the notification message templates in all 4 languages: ru, uz_latin, uz_cyrillic, en
4. Use HTML parse mode for formatting (<b>bold</b>, <i>italic</i> supported by Telegram)
5. Find the right mutation to trigger this notification from (after the data change succeeds)
6. Log the notification to notificationLogs table with delivery status
7. Handle Telegram API failures gracefully — wrap in try/catch so main mutation doesn't fail
8. The notification should clearly state:
   - What happened (attendance marked, grade added, payment received, class cancelled, etc.)
   - Which student is affected
   - Which class/subject
   - Relevant details (amount, grade value, date/time)
   - Learning center name for context

Only send to users who have a linked Telegram account (check telegramLinks table).
