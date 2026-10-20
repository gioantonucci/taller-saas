-- Habilitar Row Level Security (RLS) en todas las tablas del esquema público
-- Resuelve las 11 alertas críticas de Supabase Security Advisor (rls_disabled_in_public)
-- Protege los datos contra accesos no autorizados a través de la API pública PostgREST de Supabase

ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkOrderMultimedia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Part" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
