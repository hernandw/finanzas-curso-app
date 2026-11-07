// backend/routes/apiRoutes.js
import express from 'express';
import { dbConfig } from '../config/db.js';

const router = express.Router();

// 1. Obtener datos del año activo
router.get('/curso/datos', async (req, res) => {
    try {
        const datos = await dbConfig.leerDatos();
        const anioActivo = datos.anio_activo || "2026";
        
        if (!datos.anios || !datos.anios[anioActivo]) {
            return res.status(404).json({ error: "Año no inicializado" });
        }

        const dataAnio = datos.anios[anioActivo];
        res.json({
            anio_activo: anioActivo,
            aniosDisponibles: Object.keys(datos.anios),
            configuracion: {
                cuota_mensual: dataAnio.cuota_mensual || 15000,
                saldo_inicial: dataAnio.saldo_inicial || 0,
                meses: dataAnio.meses,
                nombre_curso: dataAnio.nombre_curso || '4° Medio A',
                profesor: dataAnio.profesor || 'Juan Pérez',
                presidente: dataAnio.presidente || 'Ana Gómez',
                tesorero: dataAnio.tesorero || 'María González'
            },
            apoderados: dataAnio.apoderados || [],
            gastos: dataAnio.gastos || [],
            ingresos_extra: dataAnio.ingresos_extra || []
        });
    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// 2. Cambiar de año o aperturar uno nuevo
router.post('/curso/admin/cambiar-anio', async (req, res) => {
    const { nuevoAnio, cuotaMensual } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        
        if (!datos.anios[nuevoAnio]) {
            const anioAnterior = datos.anio_activo;
            const dataAnterior = datos.anios[anioAnterior] || {};
            
            // Calcular saldo de arrastre
            const cuotasRecaudadas = (dataAnterior.apoderados || []).reduce((acc, a) => {
                let sub = 0;
                (dataAnterior.meses || []).forEach(m => { if (a.pagos[m]?.monto) sub += Number(a.pagos[m].monto); });
                return acc + sub;
            }, 0);
            const gastosAnt = (dataAnterior.gastos || []).reduce((acc, g) => acc + Number(g.monto), 0);
            const extraAnt = (dataAnterior.ingresos_extra || []).reduce((acc, e) => acc + Number(e.monto), 0);
            const saldoArrastre = Number(dataAnterior.saldo_inicial || 0) + cuotasRecaudadas + extraAnt - gastosAnt;

            const meses = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            
            // Traspasar apoderados conservando alumnos activos
            const apoderadosNuevos = (dataAnterior.apoderados || []).map(a => ({
                id: a.id,
                nombre: a.nombre,
                alumno: a.alumno,
                activo: a.activo !== false,
                pagos: meses.reduce((acc, m) => ({ ...acc, [m]: { pagado: false, monto: 0, fecha: null, responsable: null } }), {})
            }));

            datos.anios[nuevoAnio] = {
                saldo_inicial: saldoArrastre,
                cuota_mensual: Number(cuotaMensual) || 15000,
                meses: meses,
                nombre_curso: dataAnterior.nombre_curso || '4° Medio A',
                profesor: dataAnterior.profesor || 'Juan Pérez',
                presidente: dataAnterior.presidente || 'Ana Gómez',
                tesorero: dataAnterior.tesorero || 'María González',
                apoderados: apoderadosNuevos,
                gastos: [],
                ingresos_extra: []
            };
        }

        datos.anio_activo = nuevoAnio;
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, anio_activo: nuevoAnio });
    } catch (error) {
        console.error("Error al cambiar año:", error);
        res.status(500).json({ error: "Error al cambiar o aperturar año" });
    }
});

// 3. Actualizar configuración general y datos del curso (con rebalanceo si cambia la cuota)
router.put('/curso/admin/configuracion', async (req, res) => {
    const { cuota_mensual, saldo_inicial, nombre_curso, profesor, presidente, tesorero } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const dataAnio = datos.anios[datos.anio_activo];

        if (saldo_inicial !== undefined) dataAnio.saldo_inicial = Number(saldo_inicial);
        if (nombre_curso !== undefined) dataAnio.nombre_curso = nombre_curso.trim();
        if (profesor !== undefined) dataAnio.profesor = profesor.trim();
        if (presidente !== undefined) dataAnio.presidente = presidente.trim();
        if (tesorero !== undefined) dataAnio.tesorero = tesorero.trim();

        // Si cambia el valor de la cuota, redistribuir abonos acumulados
        if (cuota_mensual !== undefined && Number(cuota_mensual) > 0) {
            const nuevaCuota = Number(cuota_mensual);
            dataAnio.cuota_mensual = nuevaCuota;

            dataAnio.apoderados.forEach(apo => {
                let fondoTotal = 0;
                let ultimaFecha = null;
                let ultimoResp = null;

                dataAnio.meses.forEach(m => {
                    const p = apo.pagos[m];
                    if (p && p.monto > 0) {
                        fondoTotal += Number(p.monto);
                        if (p.fecha) ultimaFecha = p.fecha;
                        if (p.responsable) ultimoResp = p.responsable;
                    }
                });

                dataAnio.meses.forEach(mes => {
                    if (fondoTotal >= nuevaCuota) {
                        apo.pagos[mes] = { pagado: true, monto: nuevaCuota, fecha: ultimaFecha, responsable: ultimoResp };
                        fondoTotal -= nuevaCuota;
                    } else if (fondoTotal > 0) {
                        apo.pagos[mes] = { pagado: false, monto: fondoTotal, fecha: ultimaFecha, responsable: ultimoResp };
                        fondoTotal = 0;
                    } else {
                        apo.pagos[mes] = { pagado: false, monto: 0, fecha: null, responsable: null };
                    }
                });
            });
        }

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, configuracion: dataAnio });
    } catch (error) {
        console.error("Error al actualizar configuración:", error);
        res.status(500).json({ error: "Error al actualizar configuración" });
    }
});

// 4. Pago / Abono global distribuido progresivamente
router.post('/curso/admin/pago-global', async (req, res) => {
    const { apoderadoId, montoEntregado, fecha, responsable } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const dataAnio = datos.anios[datos.anio_activo];
        const cuotaOficial = dataAnio.cuota_mensual || 15000;
        const apoderado = dataAnio.apoderados.find(a => a.id === apoderadoId);

        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        let montoRestante = Number(montoEntregado);

        for (const mes of dataAnio.meses) {
            if (montoRestante <= 0) break;
            const pagoActual = apoderado.pagos[mes] || { pagado: false, monto: 0 };
            const abonoPrevio = Number(pagoActual.monto || 0);

            if (abonoPrevio < cuotaOficial) {
                const faltante = cuotaOficial - abonoPrevio;
                if (montoRestante >= faltante) {
                    apoderado.pagos[mes] = {
                        pagado: true,
                        monto: cuotaOficial,
                        fecha: fecha || new Date().toISOString().slice(0, 10),
                        responsable: responsable || apoderado.nombre
                    };
                    montoRestante -= faltante;
                } else {
                    apoderado.pagos[mes] = {
                        pagado: false,
                        monto: abonoPrevio + montoRestante,
                        fecha: fecha || new Date().toISOString().slice(0, 10),
                        responsable: responsable || apoderado.nombre
                    };
                    montoRestante = 0;
                }
            }
        }

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        console.error("Error al procesar pago global:", error);
        res.status(500).json({ error: "Error al procesar pago global" });
    }
});

// 5. Eliminar o revertir el pago de un mes
router.delete('/curso/admin/pago/:apoderadoId/:mes', async (req, res) => {
    const { apoderadoId, mes } = req.params;
    try {
        const datos = await dbConfig.leerDatos();
        const dataAnio = datos.anios[datos.anio_activo];
        const apoderado = dataAnio.apoderados.find(a => a.id === apoderadoId);

        if (!apoderado || !apoderado.pagos[mes]) {
            return res.status(404).json({ error: "Registro no encontrado" });
        }

        apoderado.pagos[mes] = { pagado: false, monto: 0, fecha: null, responsable: null };
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        console.error("Error al eliminar pago:", error);
        res.status(500).json({ error: "Error al eliminar pago" });
    }
});

// 6. Agregar nuevo apoderado
router.post('/curso/admin/apoderado/agregar', async (req, res) => {
    const { nombre, alumno } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const dataAnio = datos.anios[datos.anio_activo];
        const nuevoApo = {
            id: `apo-${Date.now()}`,
            nombre: nombre.trim(),
            alumno: alumno.trim(),
            activo: true,
            pagos: dataAnio.meses.reduce((acc, m) => ({ ...acc, [m]: { pagado: false, monto: 0, fecha: null, responsable: null } }), {})
        };

        dataAnio.apoderados.push(nuevoApo);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado: nuevoApo });
    } catch (error) {
        console.error("Error al agregar apoderado:", error);
        res.status(500).json({ error: "Error al agregar apoderado" });
    }
});

// 7. Modificar datos de apoderado y alumno
router.put('/curso/admin/apoderado/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, alumno } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const dataAnio = datos.anios[datos.anio_activo];
        const apo = dataAnio.apoderados.find(a => a.id === id);

        if (!apo) return res.status(404).json({ error: "Apoderado no encontrado" });

        if (nombre) apo.nombre = nombre.trim();
        if (alumno) apo.alumno = alumno.trim();

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado: apo });
    } catch (error) {
        console.error("Error al modificar apoderado:", error);
        res.status(500).json({ error: "Error al modificar apoderado" });
    }
});

// 8. Cambiar estado activo/oculto de apoderado
router.put('/curso/admin/apoderado/estado/:id', async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const dataAnio = datos.anios[datos.anio_activo];
        const apo = dataAnio.apoderados.find(a => a.id === id);

        if (!apo) return res.status(404).json({ error: "Apoderado no encontrado" });

        apo.activo = activo;
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado: apo });
    } catch (error) {
        console.error("Error al cambiar estado:", error);
        res.status(500).json({ error: "Error al cambiar estado" });
    }
});

// 9. Eliminar apoderado permanentemente
router.delete('/curso/admin/apoderado/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const datos = await dbConfig.leerDatos();
        const dataAnio = datos.anios[datos.anio_activo];
        dataAnio.apoderados = dataAnio.apoderados.filter(a => a.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, mensaje: "Apoderado eliminado" });
    } catch (error) {
        console.error("Error al eliminar apoderado:", error);
        res.status(500).json({ error: "Error al eliminar apoderado" });
    }
});

// 10. Gastos: Registrar y Eliminar
router.post('/curso/admin/gasto', async (req, res) => {
    const { mes, titulo, monto, fecha } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const dataAnio = datos.anios[datos.anio_activo];
        const nuevoGasto = {
            id: `gas-${Date.now()}`,
            mes,
            titulo: titulo.trim(),
            monto: Number(monto),
            fecha: fecha || new Date().toISOString().slice(0, 10)
        };
        dataAnio.gastos.push(nuevoGasto);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, gasto: nuevoGasto });
    } catch (error) {
        console.error("Error al registrar gasto:", error);
        res.status(500).json({ error: "Error al registrar gasto" });
    }
});

router.delete('/curso/admin/gasto/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const datos = await dbConfig.leerDatos();
        const dataAnio = datos.anios[datos.anio_activo];
        dataAnio.gastos = dataAnio.gastos.filter(g => g.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, mensaje: "Gasto eliminado" });
    } catch (error) {
        console.error("Error al eliminar gasto:", error);
        res.status(500).json({ error: "Error al eliminar gasto" });
    }
});

// 11. Ingresos Extra: Registrar y Eliminar
router.post('/curso/admin/ingreso-extra', async (req, res) => {
    const { titulo, monto, fecha } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const dataAnio = datos.anios[datos.anio_activo];
        const nuevoIngreso = {
            id: `ext-${Date.now()}`,
            titulo: titulo.trim(),
            monto: Number(monto),
            fecha: fecha || new Date().toISOString().slice(0, 10)
        };
        dataAnio.ingresos_extra.push(nuevoIngreso);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, ingreso_extra: nuevoIngreso });
    } catch (error) {
        console.error("Error al registrar ingreso extra:", error);
        res.status(500).json({ error: "Error al registrar ingreso extra" });
    }
});

router.delete('/curso/admin/ingreso-extra/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const datos = await dbConfig.leerDatos();
        const dataAnio = datos.anios[datos.anio_activo];
        dataAnio.ingresos_extra = dataAnio.ingresos_extra.filter(e => e.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, mensaje: "Ingreso extra eliminado" });
    } catch (error) {
        console.error("Error al eliminar ingreso extra:", error);
        res.status(500).json({ error: "Error al eliminar ingreso extra" });
    }
});

// 12. Backup, Restauración y Reset de Fábrica
router.get('/curso/backup', async (req, res) => {
    try {
        const datos = await dbConfig.leerDatos();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=backup_tesoreria.json');
        res.send(JSON.stringify(datos, null, 2));
    } catch (error) {
        res.status(500).json({ error: "Error al generar backup" });
    }
});

router.post('/curso/backup/restaurar', async (req, res) => {
    try {
        const nuevoContenido = req.body;
        if (!nuevoContenido || !nuevoContenido.anios) {
            return res.status(400).json({ error: "Backup inválido" });
        }
        await dbConfig.guardarDatos(nuevoContenido);
        res.json({ success: true, mensaje: "Restauración exitosa" });
    } catch (error) {
        res.status(500).json({ error: "Error al restaurar backup" });
    }
});

router.delete('/curso/reset', async (req, res) => {
    try {
        const datosVacia = {
            anio_activo: "2026",
            anios: {
                "2026": {
                    saldo_inicial: 0,
                    cuota_mensual: 15000,
                    meses: ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
                    nombre_curso: '4° Medio A',
                    profesor: 'Juan Pérez',
                    presidente: 'Ana Gómez',
                    tesorero: 'María González',
                    apoderados: [],
                    gastos: [],
                    ingresos_extra: []
                }
            }
        };
        await dbConfig.guardarDatos(datosVacia);
        res.json({ success: true, mensaje: "Sistema reiniciado" });
    } catch (error) {
        res.status(500).json({ error: "Error al reiniciar" });
    }
});

export default router;