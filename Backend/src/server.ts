import app from './app';
import { testConnection } from './config/database';
import dotenv from 'dotenv';
dotenv.config();
const PORT = parseInt(process.env.PORT || '3000',10);
testConnection().then(() => app.listen(PORT,() => console.log('Backend iniciado')))
  .catch(error => { console.error(error); process.exit(1); });