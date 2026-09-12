import test from "node:test";
import assert from "node:assert/strict";
import { friendlyError } from "../components/friendlyError";

test("pilot errors explain insufficient balance and invalid credentials", () => {
  assert.equal(friendlyError(new Error("Insufficient points")), "Недостаточно бонусов для списания.");
  assert.match(friendlyError(new Error("Invalid email or password")), /Неверный email или пароль/);
  assert.match(friendlyError(new Error("customer.phone: Invalid")), /В телефоне допустимы/);
});
test("unexpected errors never expose database or request internals to the owner", () => {
  for (const detail of ["Prisma P2002 secret connection string", "Idempotency key was used for a different request", "<script>stack trace</script>"]) {
    const message = friendlyError(new Error(detail));
    assert.match(message, /Не удалось выполнить действие/);
    assert.ok(!message.includes(detail));
  }
});
