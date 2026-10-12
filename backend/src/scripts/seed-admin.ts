import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { database } from '../database';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required in backend/.env');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('ADMIN_EMAIL is invalid');
  if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');

  await database.createIndexes();
  const existing = await database.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists (${email}); nothing changed.`);
    return;
  }
  await database.user.create({
    data: {
      name: process.env.ADMIN_NAME?.trim() || 'E-Sewak Tarapur Administrator',
      email,
      password: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      department: 'E-Sewak Tarapur Administration',
      isActive: true
    }
  });
  console.log(`Admin created successfully for ${email}.`);
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => database.disconnect());
