// backend/routes/apiRoutes.js
router.post('/curso/admin/pago', async (req, res) => {
    const { apoderadoId, mes, pagado, monto } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo;
        const infoAnio = datos.anios[anioActual];
        
        const apoderado = infoAnio.apoderados.find(a => a.id === apoderadoId);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        const montoNuevo = Number(monto || 0);
        const cuotaOficial = infoAnio.cuota_mensual;

        // Recuperamos el estado actual del mes
        const pagoExistente = apo.pagos[mes] || { monto: 0, pagado: false, fechas: [] };
        
        // Sumamos el acumulado del mes
        const montoTotalAcumulado = Number(pagoExistente.monto || 0) + montoNuevo;
        const estaPagadoCompleto = montoTotalAcumulado >= cuotaOficial;

        // Formatear la fecha actual (DD/MM/YYYY o YYYY-MM-DD)
        const fechaActual = new Date().toISOString().slice(0, 10);
        
        // Mantenemos un registro de fechas o la última fecha de abono
        const historialFechas = pagoExistente.fechas ? [...pagoExistente.fechas, fechaActual] : [fechaActual];

        apoderado.pagos[mes] = {
            pagado: estaPagadoCompleto,
            monto: montoTotalAcumulado,
            fecha: fechaActual, // Guardamos la última fecha de modificación/pago
            fechas: historialFechas
        };

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar pago" });
    }
});