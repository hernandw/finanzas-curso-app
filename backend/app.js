// backend/app.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import apiRoutes from './routes/apiRoutes.js';
import { dbConfig } from './config/db.js'; // <-- Importar la configuración de la base de datos

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

// Exponer la carpeta uploads para descargas públicas directas
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

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