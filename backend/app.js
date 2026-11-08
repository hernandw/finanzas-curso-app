// backend/app.js
import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import apiRoutes from './routes/apiRoutes.js';
import { dbConfig } from './config/db.js'; // <-- Importar la configuración de la base de datos
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Habilitar CORS para recibir peticiones desde GitHub Pages
app.use(cors({
    origin: '*', // O si prefieres específico: 'https://hernandw.github.io'
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Ruta absoluta física a la carpeta uploads dentro de backend/
const carpetaUploads = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(carpetaUploads)) {
    fs.mkdirSync(carpetaUploads, { recursive: true });
}

// Servir la carpeta de forma pública
app.use('/uploads', express.static(carpetaUploads));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'recibo-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage });

// Montar rutas
app.use('/api', apiRoutes);

app.listen(PORT, async () => {
    console.log(`Backend corriendo en http://localhost:${PORT}`);
    
    // Forzar la creación del archivo JSON con los 18 apoderados al iniciar
    try {
        await dbConfig.leerDatos();
        console.log("📁 Archivo curso_datos.json verificado/creado exitosamente en data/");
    } catch (error) {
        console.error("Error al inicializar el archivo de datos:", error);
    }
});