// backend/routes/apiRoutes.js
import express from 'express';
import { dbConfig } from '../config/db.js';

const router = express.Router();

// 1. Obtener todos los datos
router.get('/curso/datos', async (req, res) => {
    try {
        const datos = await dbConfig.leerDatos();
        res.json(datos);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener los datos" });
    }
});

// 2. Actualizar pago mensual de un apoderado
router.post('/curso/admin/pago', async (req, res) => {
    const { apoderadoId, mes, pagado, monto } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const apoderado = datos.apoderados.find(a => a.id === apoderadoId);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        apoderado.pagos[mes] = {
            pagado: Boolean(pagado),
            monto: pagado ? Number(monto) : 0,
            fecha: pagado ? new Date().toISOString().slice(0, 10) : null
        };

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar pago" });
    }
});

// 3. Registrar gasto del curso
router.post('/curso/admin/gasto', async (req, res) => {
    const { mes, titulo, monto } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const nuevoGasto = {
            id: 'gasto-' + Date.now(),
            mes,
            titulo,
            monto: Number(monto),
            fecha: new Date().toISOString().slice(0, 10)
        };
        datos.gastos.push(nuevoGasto);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, nuevoGasto });
    } catch (error) {
        res.status(500).json({ error: "Error al registrar gasto" });
    }
});

// 4. Agregar nuevo apoderado
router.post('/curso/admin/apoderado/agregar', async (req, res) => {
    const { nombre, alumno } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const meses = datos.configuracion.meses;
        const nuevoApoderado = {
            id: 'apo-' + Date.now(),
            nombre,
            alumno,
            pagos: meses.reduce((acc, mes) => ({ ...acc, [mes]: { pagado: false, monto: 0, fecha: null } }), {})
        };
        datos.apoderados.push(nuevoApoderado);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, nuevoApoderado });
    } catch (error) {
        res.status(500).json({ error: "Error al agregar apoderado" });
    }
});

// 5. Editar apoderado (Ruta PUT)
router.put('/curso/admin/apoderado/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, alumno } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const apoderado = datos.apoderados.find(a => a.id === id);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        if (nombre) apoderado.nombre = nombre;
        if (alumno) apoderado.alumno = alumno;

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar apoderado" });
    }
});

// 6. Eliminar apoderado (Ruta DELETE)
router.delete('/curso/admin/apoderado/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const datos = await dbConfig.leerDatos();
        datos.apoderados = datos.apoderados.filter(a => a.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar apoderado" });
    }
});

export default router;