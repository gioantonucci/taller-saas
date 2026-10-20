const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const tables = [
  'Vehicle',
  'WorkOrder',
  'Client',
  'WorkOrderMultimedia',
  'WorkLog',
  'InventoryItem',
  'TenantSettings',
  'User',
  'Part',
  'AuditLog',
  'Transaction'
];

async function main() {
  console.log('Iniciando activación de Row Level Security (RLS) en Supabase...');
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    console.log(`✓ RLS habilitado en: public."${table}"`);
  }
  console.log('\nÉxito: Las 11 tablas tienen RLS habilitado y están protegidas contra accesos no autorizados.');
}

main()
  .catch((err) => {
    console.error('Error al habilitar RLS:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
