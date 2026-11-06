// config/db.js
import fs from 'fs';
import path from 'path';

const MODO_LOCAL = process.env.MODO_LOCAL !== 'false'; // Por defecto true para desarrollo local
const ARCHIVO_LOCAL = path.resolve('data/curso_datos.json');

export const dbConfig = {
    modo: MODO_LOCAL ? 'LOCAL_FILESYSTEM' : 'POSTGRESQL',
    
    async leerDatos() {
        if (this.modo === 'LOCAL_FILESYSTEM') {
            if (!fs.existsSync(path.dirname(ARCHIVO_LOCAL))) {
                fs.mkdirSync(path.dirname(ARCHIVO_LOCAL), { recursive: true });
            }
            if (!fs.existsSync(ARCHIVO_LOCAL)) {
                // Estructura inicial para los 18 apoderados de Marzo a Diciembre
                const meses = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                const apoderadosIniciales = Array.from({ length: 18 }, (_, i) => ({
                    id: `apo-${i + 1}`,
                    nombre: `Apoderado ${i + 1} (Alumno ${i + 1})`,
                    pagos: meses.reduce((acc, mes) => ({ ...acc, [mes]: { pagado: false, monto: 0, fecha: null } }), {})
                }));

                const estructuraInicial = {
                    configuracion: { cuota_mensual: 15000, meses },
                    apoderados: apoderadosIniciales,
                    gastos: []
                };
                fs.writeFileSync(ARCHIVO_LOCAL, JSON.stringify(estructuraInicial, null, 2));
            }
            return JSON.parse(fs.readFileSync(ARCHIVO_LOCAL, 'utf-8'));
        } else {
            // Conexión a PostgreSQL en Render
            console.log("Conectando a PostgreSQL en Render...");
        }
    },

    async guardarDatos(nuevosDatos) {
        if (this.modo === 'LOCAL_FILESYSTEM') {
            fs.writeFileSync(ARCHIVO_LOCAL, JSON.stringify(nuevosDatos, null, 2));
        } else {
            // Guardar en PostgreSQL
        }
    }
};