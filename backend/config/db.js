// backend/config/db.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("⚠️ Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const dbConfig = {
    async leerDatos() {
        // 1. Leer configuración de años
        const { data: aniosRows, error: errAnios } = await supabase
            .from('configuracion_anios')
            .select('*');

        if (errAnios) throw errAnios;

        // Si la base está vacía, crear año 2026 por defecto
        if (!aniosRows || aniosRows.length === 0) {
            const defaultAnio = {
                anio: '2026',
                anio_activo: true,
                cerrado: false,
                saldo_inicial: 0,
                cuota_mensual: 21000,
                nombre_curso: '8° Básico B',
                profesor: '',
                presidente: '',
                tesorero: '',
                meses: ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
            };
            await supabase.from('configuracion_anios').insert(defaultAnio);
            return {
                anio_activo: '2026',
                anios: {
                    '2026': { ...defaultAnio, apoderados: [], gastos: [], ingresos_extra: [] }
                }
            };
        }

        // 2. Leer apoderados, gastos e ingresos extra en paralelo
        const [
            { data: apoderadosRows },
            { data: gastosRows },
            { data: ingresosRows }
        ] = await Promise.all([
            supabase.from('apoderados').select('*'),
            supabase.from('gastos').select('*'),
            supabase.from('ingresos_extra').select('*')
        ]);

        let anioActivoGlobal = '2026';
        const aniosMap = {};

        aniosRows.forEach(row => {
            if (row.anio_activo) anioActivoGlobal = row.anio;
            aniosMap[row.anio] = {
                cerrado: row.cerrado,
                saldo_inicial: Number(row.saldo_inicial || 0),
                cuota_mensual: Number(row.cuota_mensual || 21000),
                nombre_curso: row.nombre_curso,
                profesor: row.profesor,
                presidente: row.presidente,
                tesorero: row.tesorero,
                meses: row.meses || ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
                apoderados: (apoderadosRows || [])
                    .filter(a => a.anio === row.anio)
                    .map(a => ({
                        id: a.id,
                        nombre: a.nombre,
                        alumno: a.alumno,
                        email: a.email || '',
                        activo: a.activo !== false,
                        pagos: a.pagos || {}
                    })),
                gastos: (gastosRows || [])
                    .filter(g => g.anio === row.anio)
                    .map(g => ({
                        id: g.id,
                        mes: g.mes,
                        titulo: g.titulo,
                        monto: Number(g.monto),
                        fecha: g.fecha,
                        comprobante: g.comprobante
                    })),
                ingresos_extra: (ingresosRows || [])
                    .filter(e => e.anio === row.anio)
                    .map(e => ({
                        id: e.id,
                        titulo: e.titulo,
                        monto: Number(e.monto),
                        fecha: e.fecha
                    }))
            };
        });

        return {
            anio_activo: anioActivoGlobal,
            anios: aniosMap
        };
    },

    async guardarDatos(nuevosDatos) {
        const anioActivo = nuevosDatos.anio_activo || '2026';
        const aniosKeys = Object.keys(nuevosDatos.anios || {});

        for (const anio of aniosKeys) {
            const info = nuevosDatos.anios[anio];

            // 1. Upsert configuración del año
            await supabase.from('configuracion_anios').upsert({
                anio,
                anio_activo: anio === anioActivo,
                cerrado: Boolean(info.cerrado),
                saldo_inicial: Number(info.saldo_inicial || 0),
                cuota_mensual: Number(info.cuota_mensual || 21000),
                nombre_curso: info.nombre_curso || '',
                profesor: info.profesor || '',
                presidente: info.presidente || '',
                tesorero: info.tesorero || '',
                meses: info.meses || []
            });

            // 2. Sincronizar Apoderados
            await supabase.from('apoderados').delete().eq('anio', anio);
            if (info.apoderados && info.apoderados.length > 0) {
                const payloadApo = info.apoderados.map(a => ({
                    id: a.id,
                    anio,
                    nombre: a.nombre,
                    alumno: a.alumno,
                    email: a.email || '',
                    activo: a.activo !== false,
                    pagos: a.pagos || {}
                }));
                await supabase.from('apoderados').insert(payloadApo);
            }

            // 3. Sincronizar Gastos
            await supabase.from('gastos').delete().eq('anio', anio);
            if (info.gastos && info.gastos.length > 0) {
                const payloadGastos = info.gastos.map(g => ({
                    id: g.id,
                    anio,
                    mes: g.mes || 'Marzo',
                    titulo: g.titulo,
                    monto: Number(g.monto || 0),
                    fecha: g.fecha,
                    comprobante: g.comprobante || null
                }));
                await supabase.from('gastos').insert(payloadGastos);
            }

            // 4. Sincronizar Ingresos Extra
            await supabase.from('ingresos_extra').delete().eq('anio', anio);
            if (info.ingresos_extra && info.ingresos_extra.length > 0) {
                const payloadIngresos = info.ingresos_extra.map(e => ({
                    id: e.id,
                    anio,
                    titulo: e.titulo,
                    monto: Number(e.monto || 0),
                    fecha: e.fecha
                }));
                await supabase.from('ingresos_extra').insert(payloadIngresos);
            }
        }
    }
};