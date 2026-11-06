// routes/apiRoutes.js
// Agregar un nuevo apoderado al curso
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

// Eliminar / Retirar un apoderado del curso
router.delete('/curso/admin/apoderado/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const datos = await dbConfig.leerDatos();
        datos.apoderados = datos.apoderados.filter(a => a.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, mensaje: "Apoderado eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar apoderado" });
    }
});