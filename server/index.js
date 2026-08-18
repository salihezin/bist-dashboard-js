import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import scannerRouter from './routes/scanner.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Sembol havuzu, tarama ve kayıtlı sonuçlar için uygulama API'si.
app.use('/api', scannerRouter);

app.listen(PORT, () => {
  console.log(`Backend sunucusu http://localhost:${PORT} üzerinde çalışıyor`);
});
