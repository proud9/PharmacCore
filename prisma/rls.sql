-- Row-level security: the second lock that keeps each business to its own rows.
-- Applied by scripts/db.ts after `prisma db push`, as the database owner. Safe to re-run.
-- The app connects as parallax_app (not the owner, so these policies apply) and sets
-- app.org_id per transaction (lib/tenant.ts). With no org set, tenant tables return nothing.
-- The Parallax team's screens connect as parallax_admin, which has no grants on tenant tables.
-- Statements are separated by a semicolon at the end of a line.

GRANT USAGE ON SCHEMA public TO parallax_app, parallax_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO parallax_app;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM parallax_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Organization", "User", "Subscription", "SubscriptionPayment", "Announcement", "AnnouncementRead", "PlatformAudit", "DemoRequest" TO parallax_admin;

-- Tables owned by one business.
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Batch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockIntake" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockTake" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockTakeItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prescription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrescriptionItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductLink" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant ON "Category";
CREATE POLICY tenant ON "Category" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS tenant ON "Product";
CREATE POLICY tenant ON "Product" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS tenant ON "Batch";
CREATE POLICY tenant ON "Batch" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS tenant ON "StockIntake";
CREATE POLICY tenant ON "StockIntake" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS tenant ON "StockTake";
CREATE POLICY tenant ON "StockTake" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS tenant ON "StockTakeItem";
CREATE POLICY tenant ON "StockTakeItem" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS tenant ON "Patient";
CREATE POLICY tenant ON "Patient" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS tenant ON "Prescription";
CREATE POLICY tenant ON "Prescription" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS tenant ON "PrescriptionItem";
CREATE POLICY tenant ON "PrescriptionItem" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS tenant ON "Sale";
CREATE POLICY tenant ON "Sale" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS tenant ON "SaleItem";
CREATE POLICY tenant ON "SaleItem" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS tenant ON "AuditLog";
CREATE POLICY tenant ON "AuditLog" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS tenant ON "Contact";
CREATE POLICY tenant ON "Contact" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS tenant ON "Notification";
CREATE POLICY tenant ON "Notification" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS tenant ON "ProductLink";
CREATE POLICY tenant ON "ProductLink" USING ("orgId" = current_setting('app.org_id', true)) WITH CHECK ("orgId" = current_setting('app.org_id', true));

-- A business may leave a notification for another (e.g. "New inquiry"), but only read its own.
DROP POLICY IF EXISTS notify ON "Notification";
CREATE POLICY notify ON "Notification" FOR INSERT WITH CHECK (coalesce(current_setting('app.org_id', true), '') <> '');

-- Connected buyers may read a seller's offered, active items. The app only ever selects the
-- item's names from here (lib/trade.ts CATALOG_SELECT), never prices or stock.
DROP POLICY IF EXISTS catalog ON "Product";
CREATE POLICY catalog ON "Product" FOR SELECT USING ("offered" AND "active" AND EXISTS (SELECT 1 FROM "TradeLink" l WHERE l."sellerOrgId" = "Product"."orgId" AND l."buyerOrgId" = current_setting('app.org_id', true) AND l."status" = 'ACTIVE'));

-- Shared between exactly two businesses.
ALTER TABLE "TradeLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TradeOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TradeOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TradeOrderEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TradePayment" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS party ON "TradeLink";
CREATE POLICY party ON "TradeLink" USING ("sellerOrgId" = current_setting('app.org_id', true) OR "buyerOrgId" = current_setting('app.org_id', true)) WITH CHECK ("sellerOrgId" = current_setting('app.org_id', true) OR "buyerOrgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS party ON "TradeOrder";
CREATE POLICY party ON "TradeOrder" USING ("sellerOrgId" = current_setting('app.org_id', true) OR "buyerOrgId" = current_setting('app.org_id', true)) WITH CHECK ("sellerOrgId" = current_setting('app.org_id', true) OR "buyerOrgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS party ON "TradeOrderItem";
CREATE POLICY party ON "TradeOrderItem" USING (EXISTS (SELECT 1 FROM "TradeOrder" o WHERE o."id" = "orderId")) WITH CHECK (EXISTS (SELECT 1 FROM "TradeOrder" o WHERE o."id" = "orderId"));
DROP POLICY IF EXISTS party ON "TradeOrderEvent";
CREATE POLICY party ON "TradeOrderEvent" USING (EXISTS (SELECT 1 FROM "TradeOrder" o WHERE o."id" = "orderId")) WITH CHECK (EXISTS (SELECT 1 FROM "TradeOrder" o WHERE o."id" = "orderId"));
DROP POLICY IF EXISTS party ON "TradePayment";
CREATE POLICY party ON "TradePayment" USING (EXISTS (SELECT 1 FROM "TradeOrder" o WHERE o."id" = "orderId")) WITH CHECK (EXISTS (SELECT 1 FROM "TradeOrder" o WHERE o."id" = "orderId"));

-- Subscription payments: the team (parallax_admin) records them; a business may only read its own.
ALTER TABLE "SubscriptionPayment" ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON "SubscriptionPayment" FROM parallax_app;
DROP POLICY IF EXISTS tenant ON "SubscriptionPayment";
CREATE POLICY tenant ON "SubscriptionPayment" FOR SELECT TO parallax_app USING ("orgId" = current_setting('app.org_id', true));
DROP POLICY IF EXISTS team ON "SubscriptionPayment";
CREATE POLICY team ON "SubscriptionPayment" TO parallax_admin USING (true) WITH CHECK (true);
