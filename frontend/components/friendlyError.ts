// Translate known errors without exposing unexpected server details. Server logs stay unchanged.
export function friendlyError(error: unknown): string {
 const message = error instanceof Error ? error.message : String(error);
 const messages: Record<string, string> = {
 "Invalid email or password": "Неверный email или пароль. Проверьте данные и попробуйте снова.",
 "Unable to register this email": "Не удалось зарегистрировать этот email. Если аккаунт уже есть, войдите.",
 "Insufficient points": "Недостаточно бонусов для списания.",
 "Customer not found": "Клиент не найден в этом бизнесе. Откройте список клиентов.",
 "Business not found": "Бизнес не найден. Откройте «Мой бизнес».",
 "Your business already exists": "Бизнес уже создан. Откройте «Мой бизнес».",
 "Purchase must be greater than zero": "Введите сумму покупки больше нуля.",
 "Please sign in": "Войдите в аккаунт, чтобы продолжить.",
 "Please sign in again": "Войдите в аккаунт ещё раз.",
 "Enter a percentage from 0 to 100, with up to 2 decimals": "Введите процент от 0 до 100, не более двух знаков после точки.",
 "Reward rate must not exceed 100%": "Процент начисления не может превышать 100%.",
 "This QR does not belong to the current business": "Этот QR-код относится к другому бизнесу."
 };
 if (messages[message]) return messages[message];
 if (/too many|rate limit/i.test(message)) return "Слишком много попыток. Подождите несколько минут и повторите.";
 if (/^(?:customer\.)?phone:/.test(message)) return "В телефоне допустимы цифры, пробелы и знаки + ( ) -.";
 if (/^password:/.test(message)) return "Используйте пароль из 12–72 латинских символов.";
 if (/^(?:customer\.)?email:/.test(message)) return "Проверьте адрес email, например name@example.com.";
 if (/^(?:business\.|customer\.)?name:/.test(message)) return "Введите имя или название: от 1 до 120 символов.";
 if (/invalid input|validation|positive amount|positive whole|password exceeds/i.test(message)) return "Проверьте заполнение полей: имя обязательно, телефон — цифры и знаки + ( ) -, сумма — положительное число.";
 return "Не удалось выполнить действие. Проверьте соединение и повторите попытку. Если ошибка сохраняется, сообщите организатору пилота.";
}
