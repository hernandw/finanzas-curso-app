// backend/config/db.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resuelve la ruta hacia data/curso_datos.json independientemente de dónde se ejecute Node
const ARCHIVO_DATOS = path.resolve(__dirname, '../data/curso_datos.json');

export const dbConfig = {
    async leerDatos() {
        const dir = path.dirname(ARCHIVO_DATOS);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (!fs.existsSync(ARCHIVO_DATOS) || fs.readFileSync(ARCHIVO_DATOS, 'utf-8').trim() === '') {
            const meses = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const apoderadosIniciales = Array.from({ length: 18 }, (_, i) => ({
                id: `apo-${i + 1}`,
                nombre: `Apoderado ${i + 1}`,
                alumno: `Alumno ${i + 1}`,
                email: '',
                activo: true,
                pagos: meses.reduce((acc, mes) => ({ ...acc, [mes]: { pagado: false, monto: 0, fecha: null, exonerado: false, transacciones: [] } }), {})
            }));

            const estructuraInicial = {
                anio_activo: "2026",
                anios: {
                    "2026": {
                        cerrado: false,
                        saldo_inicial: 0,
                        cuota_mensual: 11000,
                        nombre_curso: "8° Básico B",
                        profesor: "Aylin Chong",
                        presidente: "Ingrid Brito",
                        tesorero: "Natalya Zakharova",
                        meses,
                        apoderados: apoderadosIniciales,
                        gastos: [],
                        ingresos_extra: []
                    }
                }
            };
            fs.writeFileSync(ARCHIVO_DATOS, JSON.stringify(estructuraInicial, null, 2), 'utf-8');
        }

        try {
            const contenido = fs.readFileSync(ARCHIVO_DATOS, 'utf-8');
            return JSON.parse(contenido);
        } catch (err) {
            console.error("Error al parsear JSON, reintentando estructura limpia:", err);
            return { anio_activo: "2026", anios: {} };
        }
    },

    async guardarDatos(nuevosDatos) {
        const dir = path.dirname(ARCHIVO_DATOS);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(ARCHIVO_DATOS, JSON.stringify(nuevosDatos, null, 2), 'utf-8');
    }
};