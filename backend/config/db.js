// backend/config/db.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVO_LOCAL = path.resolve(__dirname, '../data/curso_datos.json');

export const dbConfig = {
    async leerDatos() {
        const dir = path.dirname(ARCHIVO_LOCAL);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        if (!fs.existsSync(ARCHIVO_LOCAL)) {
            throw new Error(`El archivo de base de datos no existe en: ${ARCHIVO_LOCAL}`);
        }

        const raw = fs.readFileSync(ARCHIVO_LOCAL, 'utf-8');
        const datos = JSON.parse(raw);

        // Rehidratar en memoria: si un mes no está en disco, se provee el formato estándar
        // para que React / VistaAdmin jamás reciban valores undefined
        Object.keys(datos.anios || {}).forEach(anioKey => {
            const infoAnio = datos.anios[anioKey];
            const listaMeses = infoAnio.meses || [
                "Marzo", "Abril", "Mayo", "Junio", "Julio", 
                "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
            ];

            (infoAnio.apoderados || []).forEach(apo => {
                if (!apo.pagos) apo.pagos = {};
                if (apo.email === undefined) apo.email = '';

                listaMeses.forEach(m => {
                    if (!apo.pagos[m]) {
                        apo.pagos[m] = {
                            pagado: false,
                            monto: 0,
                            fecha: null,
                            exonerado: false,
                            transacciones: []
                        };
                    } else {
                        // Asegurar integridad de propiedades
                        apo.pagos[m].pagado = Boolean(apo.pagos[m].pagado);
                        apo.pagos[m].monto = Number(apo.pagos[m].monto || 0);
                        apo.pagos[m].exonerado = Boolean(apo.pagos[m].exonerado);
                        apo.pagos[m].transacciones = apo.pagos[m].transacciones || [];
                    }
                });
            });
        });

        return datos;
    },

    async guardarDatos(nuevosDatos) {
        const dir = path.dirname(ARCHIVO_LOCAL);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Clonar profundamente para no mutar el objeto en memoria de la sesión
        const datosAComprimir = JSON.parse(JSON.stringify(nuevosDatos));

        // Comprimir en disco: remover meses en $0 sin transacciones ni exoneración
        Object.keys(datosAComprimir.anios || {}).forEach(anioKey => {
            const infoAnio = datosAComprimir.anios[anioKey];
            (infoAnio.apoderados || []).forEach(apo => {
                if (apo.pagos) {
                    const pagosCompactos = {};
                    Object.keys(apo.pagos).forEach(m => {
                        const p = apo.pagos[m];
                        const tieneAbono = Number(p.monto || 0) > 0;
                        const tieneTransacciones = p.transacciones && p.transacciones.length > 0;
                        const estaExonerado = Boolean(p.exonerado);

                        if (tieneAbono || tieneTransacciones || estaExonerado) {
                            pagosCompactos[m] = p;
                        }
                    });
                    apo.pagos = pagosCompactos;
                }
            });
        });

        // Escritura síncrona inmediata
        fs.writeFileSync(ARCHIVO_LOCAL, JSON.stringify(datosAComprimir, null, 2), 'utf-8');
    }
};