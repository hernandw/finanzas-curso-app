// backend/routes/apiRoutes.js
import express from 'express';
import { dbConfig } from '../config/db.js';

const router = express.Router();

// 1. Obtener todos los datos del año activo actual
router.get('/curso/datos', async (req, res) => {
    try {
        const datos = await dbConfig.leerDatos();
        const anioActivo = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActivo];

        res.json({
            anio_activo: anioActivo,
            aniosDisponibles: Object.keys(datos.anios),
            configuracion: {
                saldo_inicial: infoAnio.saldo_inicial,
                cuota_mensual: infoAnio.cuota_mensual,
                meses: infoAnio.meses
            },
            apoderados: infoAnio.apoderados,
            gastos: infoAnio.gastos
        });
    } catch (error) {
        console.error("Error al obtener los datos:", error);
        res.status(500).json({ error: "Error al obtener los datos" });
    }
});

// 2. Registrar o abonar pago mensual con acumulación y fecha
router.post('/curso/admin/pago', async (req, res) => {
    const { apoderadoId, mes, pagado, monto } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];
        
        const apoderado = infoAnio.apoderados.find(a => a.id === apoderadoId);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        const montoNuevo = Number(monto || 0);
        const cuotaOficial = infoAnio.cuota_mensual;

        // Recuperamos el pago actual del mes (si ya tenía un abono previo)
        const pagoExistente = apo.pagos[mes] || { monto: 0, pagado: false, fechas: [] };
        
        // Acumulamos el monto entregado
        const montoTotalAcumulado = Number(pagoExistente.monto || 0) + montoNuevo;
        const estaPagadoCompleto = montoTotalAcumulado >= cuotaOficial;

        // Fecha actual de la transacción
        const fechaActual = new Date().toISOString().slice(0, 10);
        const historialFechas = pagoExistente.fechas ? [...pagoExistente.fechas, fechaActual] : [fechaActual];

        apoderado.pagos[mes] = {
            pagado: estaPagadoCompleto,
            monto: montoTotalAcumulado,
            fecha: fechaActual,
            fechas: historialFechas
        };

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        console.error("Error al actualizar pago:", error);
        res.status(500).json({ error: "Error al actualizar pago" });
    }
});

// 3. Registrar gasto general del curso
router.post('/curso/admin/gasto', async (req, res) => {
    const { mes, titulo, monto } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        const nuevoGasto = {
            id: 'gasto-' + Date.now(),
            mes,
            titulo,
            monto: Number(monto),
            fecha: new Date().toISOString().slice(0, 10)
        };
        infoAnio.gastos.push(nuevoGasto);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, nuevoGasto });
    } catch (error) {
        console.error("Error al registrar gasto:", error);
        res.status(500).json({ error: "Error al registrar gasto" });
    }
});

// 4. Agregar nuevo apoderado al año activo
router.post('/curso/admin/apoderado/agregar', async (req, res) => {
    const { nombre, alumno } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];
        const meses = infoAnio.meses;

        const nuevoApoderado = {
            id: 'apo-' + Date.now(),
            nombre,
            alumno,
            activo: true,
            pagos: meses.reduce((acc, mes) => ({ ...acc, [mes]: { pagado: false, monto: 0, fecha: null } }), {})
        };
        infoAnio.apoderados.push(nuevoApoderado);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, nuevoApoderado });
    } catch (error) {
        console.error("Error al agregar apoderado:", error);
        res.status(500).json({ error: "Error al agregar apoderado" });
    }
});

// 5. Cambiar estado de apoderado (Ocultar / Activar en lugar de borrar)
router.put('/curso/admin/apoderado/estado/:id', async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        const apoderado = infoAnio.apoderados.find(a => a.id === id);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        apoderado.activo = Boolean(activo);

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        console.error("Error al actualizar estado del apoderado:", error);
        res.status(500).json({ error: "Error al actualizar estado del apoderado" });
    }
});

export default router;