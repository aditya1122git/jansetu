import 'dotenv/config';
import { database } from '../database';

database.createIndexes()
  .then(() => console.log('MongoDB collections and indexes are ready.'))
  .catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => database.disconnect());
