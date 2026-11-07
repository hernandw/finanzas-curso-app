// backend/routes/apiRoutes.js

// Cerrar año escolar actual y habilitar el siguiente
router.post('/curso/admin/cerrar-anio', async (req, res) => {
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo;
        const dataAnio = datos.anios[anioActual];

        if (!dataAnio) return res.status(404).json({ error: "Año no encontrado" });

        // Marcar el año actual como cerrado
        dataAnio.cerrado = true;

        // Calcular saldo final de arrastre
        const cuotasRecaudadas = (dataAnio.apoderados || []).reduce((acc, a) => {
            let sub = 0;
            (dataAnio.meses || []).forEach(m => { if (a.pagos[m]?.monto) sub += Number(a.pagos[m].monto); });
            return acc + sub;
        }, 0);
        const gastosTotal = (dataAnio.gastos || []).reduce((acc, g) => acc + Number(g.monto), 0);
        const extraTotal = (dataAnio.ingresos_extra || []).reduce((acc, e) => acc + Number(e.monto), 0);
        const saldoCierre = Number(dataAnio.saldo_inicial || 0) + cuotasRecaudadas + extraTotal - gastosTotal;

        // Aperturar año siguiente si no existe
        const siguienteAnio = String(Number(anioActual) + 1);
        const meses = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        if (!datos.anios[siguienteAnio]) {
            datos.anios[siguienteAnio] = {
                cerrado: false,
                saldo_inicial: saldoCierre,
                cuota_mensual: dataAnio.cuota_mensual || 15000,
                meses: meses,
                nombre_curso: dataAnio.nombre_curso,
                profesor: dataAnio.profesor,
                presidente: dataAnio.presidente,
                tesorero: dataAnio.tesorero,
                apoderados: (dataAnio.apoderados || [])
                    .filter(a => a.activo !== false)
                    .map(a => ({
                        id: a.id,
                        nombre: a.nombre,
                        alumno: a.alumno,
                        activo: true,
                        pagos: meses.reduce((acc, m) => ({ ...acc, [m]: { pagado: false, monto: 0, fecha: null, responsable: null } }), {})
                    })),
                gastos: [],
                ingresos_extra: []
            };
        }

        datos.anio_activo = siguienteAnio;
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, anio_activo: siguienteAnio, saldo_arrastrado: saldoCierre });
    } catch (error) {
        console.error("Error al cerrar año:", error);
        res.status(500).json({ error: "Error al cerrar año escolar" });
    }
});