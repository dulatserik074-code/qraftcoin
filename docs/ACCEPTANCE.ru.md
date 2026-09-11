Актуальная приёмка v0.4: FINAL_V04_REPORT.md и docs/PILOT_CHECKLIST.md. Ниже сохранены базовые сценарии v0.3 для регрессии.

# Критерии приёмки QazLoyal v0.3

1. Владелец регистрируется, создаёт Qaz Coffee с 500 BPS и первого клиента Ayan.
2. Начисление за покупку 10 000 KZT создаёт EARN +500 QL Points в PostgreSQL.
3. После перезагрузки и logout/login баланс остаётся 500.
4. Списание 800 отклоняется без новой операции; списание 100 оставляет 400.
5. История содержит успешные EARN и REDEEM, dashboard показывает реальные суммы и счётчики.
6. Business A получает 404 при обращении к customer/dashboard/transactions Business B; чужой QR не даёт доступа.
7. Повтор того же idempotencyKey и payload возвращает исходную операцию; изменённый payload отклоняется. Конкурентные списания не дают отрицательный баланс.
8. Ошибка после создания ledger-записи и до обновления баланса откатывает всю транзакцию PostgreSQL.
9. Работают создание/поиск клиента, QR generation/manual input, пагинация истории и owner-only настройки.
10. `/demo` изолирован от PostgreSQL. Legacy blockchain, контракты, адреса, ABI и payment security не изменены.
11. Node.js 22; npm ci, Prisma validate/generate/migrations, lint, typecheck, unit/integration/browser tests и production build проходят.

До публичного пилота требуются собственные PostgreSQL/HTTPS hosting, backup/restore, мониторинг, поддержка аккаунтов и правила обработки персональных данных. Встроенная камера, reset password, email verification и staff-management UI не заявляются реализованными. Приложение предоставляет owner flow и контролируемую модель employee membership.

