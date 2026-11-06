// backend/routes/apiRoutes.js
import express from 'express';
import { dbConfig } from '../config/db.js';

const router = express.Router();

// 1. Obtener datos del año activo
router.get('/curso/datos', async (req, res) => {
    try {
        const datos = await dbConfig.leerDatos();
        const anioActivo = datos.anio_activo || "2026";
        
        // Si el año aún no existe en el objeto anios, lo inicializamos
        if (!datos.anios[anioActivo]) {
            datos.anios[anioActivo] = {
                saldo_inicial: 0,
                cuota_mensual: 15000,
                meses: ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
                apoderados: [],
                gastos: [],
                ingresos_extra: []
            };
        }

        const infoAnio = datos.anios[anioActivo];

        res.json({
            anio_activo: anioActivo,
            aniosDisponibles: Object.keys(datos.anios),
            configuracion: {
                saldo_inicial: infoAnio.saldo_inicial || 0,
                cuota_mensual: infoAnio.cuota_mensual || 15000,
                meses: infoAnio.meses
            },
            apoderados: infoAnio.apoderados || [],
            gastos: infoAnio.gastos || [],
            ingresos_extra: infoAnio.ingresos_extra || []
        });
    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error al obtener los datos" });
    }
});

// 2. Cambiar de año activo o crear uno nuevo arrastrando estudiantes
router.post('/curso/admin/cambiar-anio', async (req, res) => {
    const { nuevoAnio, cuotaMensual } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioAnterior = datos.anio_activo || "2026";
        const infoAnioAnt = datos.anios[anioAnterior];

        // 1. Calcular el saldo final del año anterior para usarlo como saldo inicial del nuevo año
        let totalRecaudadoAnt = 0;
        let totalGastosAnt = infoAnioAnt.gastos.reduce((acc, g) => acc + Number(g.monto), 0);
        let totalIngresosAnt = (infoAnioAnt.ingresos_extra || []).reduce((acc, e) => acc + Number(e.monto), 0);

        infoAnioAnt.apoderados.forEach(apo => {
            infoAnioAnt.meses.forEach(mes => {
                const p = apo.pagos[mes];
                if (p && p.monto) totalRecaudadoAnt += Number(p.monto);
            });
        });

        const saldoFinalAnterior = Number(infoAnioAnt.saldo_inicial) + totalRecaudadoAnt + totalIngresosAnt - totalGastosAnt;

        // 2. Si el nuevo año no existe, lo creamos arrastrando a los alumnos activos
        if (!datos.anios[nuevoAnio]) {
            const apoderadosActivos = infoAnioAnt.apoderados
                .filter(a => a.activo !== false)
                .map(a => ({
                    id: 'apo-' + Math.random().toString(36).substr(2, 9),
                    nombre: a.nombre,
                    alumno: a.alumno,
                    activo: true,
                    pagos: infoAnioAnt.meses.reduce((acc, mes) => ({ ...acc, [mes]: { pagado: false, monto: 0, fecha: null } }), {})
                }));

            datos.anios[nuevoAnio] = {
                saldo_inicial: saldoFinalAnterior,
                cuota_mensual: Number(cuotaMensual) || 15000,
                meses: infoAnioAnt.meses,
                apoderados: apoderadosActivos,
                gastos: [],
                ingresos_extra: []
            };
        }

        datos.anio_activo = String(nuevoAnio);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, anio_activo: datos.anio_activo });
    } catch (error) {
        console.error("Error al cambiar de año:", error);
        res.status(500).json({ error: "Error al cambiar de año" });
    }
});

// 3. Actualizar configuración (Cuota Mensual o Saldo Inicial)
router.put('/curso/admin/configuracion', async (req, res) => {
    const { saldo_inicial, cuota_mensual } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        if (saldo_inicial !== undefined) infoAnio.saldo_inicial = Number(saldo_inicial);
        if (cuota_mensual !== undefined) infoAnio.cuota_mensual = Number(cuota_mensual);

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, configuracion: infoAnio });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar configuración" });
    }
});