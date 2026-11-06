// app.js
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/apiRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de la API
app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`Servidor de Tesorería corriendo en http://localhost:${PORT}`);
    console.log(`Modo de almacenamiento: ${process.env.MODO_LOCAL === 'false' ? 'PostgreSQL' : 'Local File System (fs)'}`);
});