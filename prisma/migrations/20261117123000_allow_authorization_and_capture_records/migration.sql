DROP INDEX "payment_transactions_gateway_payment_id_key";

CREATE UNIQUE INDEX "payment_transactions_gateway_payment_id_transaction_type_key"
ON "payment_transactions"("gateway_payment_id", "transaction_type");
