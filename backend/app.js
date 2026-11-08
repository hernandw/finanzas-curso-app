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

// Aumentar el límite del parser JSON para backups y datos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 1. DEFINIR Y CREAR LA CARPETA FÍSICA UPLOADS
const carpetaUploads = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(carpetaUploads)) {
    fs.mkdirSync(carpetaUploads, { recursive: true });
}

// 2. SERVIR PÚBLICAMENTE LA CARPETA UPLOADS
app.use('/uploads', express.static(carpetaUploads));

// 3. RUTAS DE LA API
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Ruta de estado del servidor
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manejador general de errores
app.use((err, req, res, next) => {
    console.error("Error capturado:", err);
    if (err.status === 413 || err.type === 'entity.too.large') {
        return res.status(413).json({ error: "El archivo enviado supera el tamaño máximo permitido." });
    }
    res.status(err.status || 500).json({ error: err.message || "Error interno del servidor" });
});

// Inicialización del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de Tesorería ejecutándose en el puerto ${PORT}`);
    console.log(`Carpeta de uploads servida en: ${carpetaUploads}`);
});

export default app;