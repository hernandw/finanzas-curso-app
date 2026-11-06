// backend/config/db.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHIVO_LOCAL = path.join(__dirname, '../data/curso_datos.json');

export const dbConfig = {
    async leerDatos() {
        const dir = path.dirname(ARCHIVO_LOCAL);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Si el archivo no existe o está completamente vacío (0 bytes)
        if (!fs.existsSync(ARCHIVO_LOCAL) || fs.readFileSync(ARCHIVO_LOCAL, 'utf-8').trim() === '') {
            const meses = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const apoderadosIniciales = Array.from({ length: 18 }, (_, i) => ({
                id: `apo-${i + 1}`,
                nombre: `Apoderado ${i + 1}`,
                alumno: `Alumno ${i + 1}`,
                pagos: meses.reduce((acc, mes) => ({ ...acc, [mes]: { pagado: false, monto: 0, fecha: null } }), {})
            }));

            const estructuraInicial = {
                configuracion: { cuota_mensual: 15000, meses },
                apoderados: apoderadosIniciales,
                gastos: []
            };
            
            fs.writeFileSync(ARCHIVO_LOCAL, JSON.stringify(estructuraInicial, null, 2), 'utf-8');
        }
        
        const contenido = fs.readFileSync(ARCHIVO_LOCAL, 'utf-8');
        return JSON.parse(contenido);
    },

    async guardarDatos(nuevosDatos) {
        const dir = path.dirname(ARCHIVO_LOCAL);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(ARCHIVO_LOCAL, JSON.stringify(nuevosDatos, null, 2), 'utf-8');
    }
};