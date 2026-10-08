import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Seed script to populate initial DB state for dev

const url = process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/swepy';
const sql = postgres(url);

async function run() {
  console.log('Seeding database...');
  
  // 1 city
  const cityId = 'city_bangalore';
  await sql`
    INSERT INTO cities (id, name, state)
    VALUES (${cityId}, 'Bangalore', 'Karnataka')
    ON CONFLICT (id) DO NOTHING
  `;

  // Services
  const servicesData = [
    { id: 'svc_minor', code: 'minor_clean', name_en: 'Minor clean', description_en: 'Sweep, mop, dust' },
    { id: 'svc_major', code: 'major_clean', name_en: 'Major clean', description_en: 'Deep clean' },
    { id: 'svc_kitchen', code: 'kitchen_prep', name_en: 'Kitchen prep', description_en: 'Chopping' },
  ];

  for (const s of servicesData) {
    await sql`
      INSERT INTO services (id, code, name_en, description_en)
      VALUES (${s.id}, ${s.code}, ${s.name_en}, ${s.description_en})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Packages (1/2/3 BHK)
  const packagesData = [
    { id: 'pkg_minor_1bhk', service_id: 'svc_minor', city_id: cityId, home_size: '1BHK', duration_min: 60, price_paise: 24900 },
    { id: 'pkg_minor_2bhk', service_id: 'svc_minor', city_id: cityId, home_size: '2BHK', duration_min: 90, price_paise: 34900 },
    { id: 'pkg_minor_3bhk', service_id: 'svc_minor', city_id: cityId, home_size: '3BHK', duration_min: 120, price_paise: 44900 },
  ];

  for (const p of packagesData) {
    await sql`
      INSERT INTO service_packages (id, service_id, city_id, home_size, duration_min, price_paise)
      VALUES (${p.id}, ${p.service_id}, ${p.city_id}, ${p.home_size}, ${p.duration_min}, ${p.price_paise})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Customer Priya
  const customerId = 'usr_priya';
  await sql`
    INSERT INTO users (id, role, phone_e164, full_name, status)
    VALUES (${customerId}, 'customer', '+919876543210', 'Priya', 'active')
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    INSERT INTO addresses (id, user_id, label, city_id, line1, lat, lng)
    VALUES ('addr_priya_home', ${customerId}, 'Home', ${cityId}, 'Tower B, 402', 12.9698, 77.7500)
    ON CONFLICT (id) DO NOTHING
  `;

  // 4 helpers including Sunita
  const helpersData = [
    { id: 'usr_sunita', phone: '+919800000001', name: 'Sunita', lat: 12.9720, lng: 77.7480 },
    { id: 'usr_meena', phone: '+919800000002', name: 'Meena', lat: 12.9680, lng: 77.7520 },
    { id: 'usr_rekha', phone: '+919800000003', name: 'Rekha', lat: 12.9710, lng: 77.7460 },
    { id: 'usr_lakshmi', phone: '+919800000004', name: 'Lakshmi', lat: 12.9650, lng: 77.7550 },
  ];

  for (const h of helpersData) {
    await sql`
      INSERT INTO users (id, role, phone_e164, full_name, status)
      VALUES (${h.id}, 'helper', ${h.phone}, ${h.name}, 'active')
      ON CONFLICT (id) DO NOTHING
    `;
    await sql`
      INSERT INTO helpers (user_id, city_id, status, verification_status, is_online, last_lat, last_lng, service_radius_km)
      VALUES (${h.id}, ${cityId}, 'active', 'verified', true, ${h.lat}, ${h.lng}, 5.0)
      ON CONFLICT (user_id) DO NOTHING
    `;
  }

  console.log('Database seeded successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
