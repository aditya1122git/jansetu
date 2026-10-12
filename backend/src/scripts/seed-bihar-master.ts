import { database } from '../database';
import { BIHAR_CONSTITUENCIES, BIHAR_DISTRICTS, validateBiharMasterData } from '../data/bihar-master-data';

async function seedBiharMasterData() {
  console.log('🗺️ Seeding Bihar master data...');
  validateBiharMasterData();
  await database.createIndexes();

  for (const district of BIHAR_DISTRICTS) {
    const assemblySeatsCount = district.lastAc - district.firstAc + 1;
    await database.district.upsert({
      where: { id: district.id },
      update: {
        code: district.code,
        name: district.name,
        state: 'Bihar',
        assemblySeatsCount,
        isActive: true
      },
      create: {
        id: district.id,
        code: district.code,
        name: district.name,
        state: 'Bihar',
        assemblySeatsCount,
        isActive: true
      }
    });
  }

  for (const constituency of BIHAR_CONSTITUENCIES) {
    await database.assemblyConstituency.upsert({
      where: { id: constituency.id },
      update: constituency,
      create: constituency
    });
  }

  const [districtCount, constituencyCount] = await Promise.all([
    database.district.count({ where: { isActive: true } }),
    database.assemblyConstituency.count({ where: { isActive: true } })
  ]);

  if (districtCount !== 38 || constituencyCount !== 243) {
    throw new Error(`Seed verification failed: ${districtCount} districts and ${constituencyCount} constituencies found.`);
  }

  console.log(`✅ Bihar master data ready: ${districtCount} districts and ${constituencyCount} constituencies`);
}

seedBiharMasterData()
  .catch(error => {
    console.error('❌ Bihar master data seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => database.disconnect());
