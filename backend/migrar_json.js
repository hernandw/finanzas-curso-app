// backend/migrar_json.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rutaArchivo = path.resolve(__dirname, 'data/curso_datos.json');

if (!fs.existsSync(rutaArchivo)) {
    console.error("No se encontró el archivo:", rutaArchivo);
    process.exit(1);
}

// 1. Crear respaldo preventivo automático
const rutaBackup = path.resolve(__dirname, `data/curso_datos_backup_${Date.now()}.json`);
fs.copyFileSync(rutaArchivo, rutaBackup);
console.log(`Respaldo de seguridad creado en: ${rutaBackup}`);

const datosOriginales = JSON.parse(fs.readFileSync(rutaArchivo, 'utf-8'));

// 2. Optimizar cada año
Object.keys(datosOriginales.anios || {}).forEach(anioKey => {
    const anioObj = datosOriginales.anios[anioKey];
    
    (anioObj.apoderados || []).forEach(apo => {
        // Asegurar campo email en todos los años
        if (apo.email === undefined) {
            apo.email = "";
        }

        const pagosOptimizados = {};

        // Recorrer meses y guardar únicamente los que tengan datos reales
        Object.entries(apo.pagos || {}).forEach(([mes, info]) => {
            if (info.exonerado) {
                pagosOptimizados[mes] = { exonerado: true };
            } else if (Number(info.monto || 0) > 0 || (info.transacciones && info.transacciones.length > 0)) {
                pagosOptimizados[mes] = {
                    pagado: Boolean(info.pagado),
                    monto: Number(info.monto || 0),
                    fecha: info.fecha || null,
                    transacciones: info.transacciones || []
                };
            }
        });

        apo.pagos = pagosOptimizados;
    });
});

// 3. Sobrescribir con la estructura limpia y optimizada
fs.writeFileSync(rutaArchivo, JSON.stringify(datosOriginales, null, 2), 'utf-8');
console.log("¡Migración completada exitosamente! Estructura optimizada.");