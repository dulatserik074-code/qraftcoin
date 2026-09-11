ALTER TABLE "Business" ADD CONSTRAINT "Business_rewardRateBps_check" CHECK ("rewardRateBps" BETWEEN 0 AND 10000);
ALTER TABLE "Business" ADD CONSTRAINT "Business_currency_check" CHECK ("currency" IN ('KZT', 'USD', 'EUR'));
ALTER TABLE "BusinessCustomer" ADD CONSTRAINT "BusinessCustomer_nonnegative" CHECK ("pointsBalance" >= 0 AND "lifetimePoints" >= 0 AND "totalSpent" >= 0 AND "totalPurchases" >= 0);
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_amount_check" CHECK ("points" <> 0 AND ("purchaseAmount" IS NULL OR "purchaseAmount" > 0));
CREATE FUNCTION prevent_loyalty_transaction_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Loyalty ledger is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER loyalty_ledger_immutable BEFORE UPDATE OR DELETE ON "LoyaltyTransaction"
FOR EACH ROW EXECUTE FUNCTION prevent_loyalty_transaction_mutation();
