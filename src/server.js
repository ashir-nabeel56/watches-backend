import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const port = Number(process.env.PORT) || 5000;

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET kam az kam 32 characters ka hona chahiye');
  }
  await connectDB();
  app.listen(port, () => console.log(`API http://localhost:${port}/api`));
}

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});