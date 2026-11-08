// backend/app.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import apiRoutes from './routes/apiRoutes.js';

// Configuración de rutas de archivos en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuración de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Aumentar el límite del parser JSON para permitir restaurar backups grandes (evita error 413)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Ruta absoluta física garantizada
const carpetaUploads = path.resolve(process.cwd(), 'backend/uploads');
if (!fs.existsSync(carpetaUploads)) {
    fs.mkdirSync(carpetaUploads, { recursive: true });
}

// Servir públicamente la carpeta
app.use('/uploads', express.static(carpetaUploads));

// Rutas de la API
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Ruta de comprobación de salud del servidor
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manejador general de errores
app.use((err, req, res, next) => {
    console.error("Error no capturado:", err);
    if (err.status === 413 || err.type === 'entity.too.large') {
        return res.status(413).json({ error: "El archivo enviado supera el tamaño máximo permitido." });
    }
    res.status(err.status || 500).json({ error: err.message || "Error interno del servidor" });
});

// Inicialización del puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de Tesorería ejecutándose en el puerto ${PORT}`);
    console.log(`Carpeta de uploads servida en: ${carpetaUploads}`);
});

export default app;