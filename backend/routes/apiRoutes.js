// backend/routes/apiRoutes.js
import express from 'express';
import { dbConfig } from '../config/db.js';

const router = express.Router();

// 1. Obtener datos con recálculo automático y redistribución de cuotas
router.get('/curso/datos', async (req, res) => {
    try {
        const datos = await dbConfig.leerDatos();
        const anioActivo = datos.anio_activo || "2026";
        
        if (!datos.anios[anioActivo]) {
            datos.anios[anioActivo] = {
                saldo_inicial: 0,
                cuota_mensual: 15000,
                nombre_curso: "4° Medio A",
                profesor: "Juan Pérez",
                presidente: "Ana Gómez",
                tesorero: "María González",
                meses: ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
                apoderados: [],
                gastos: [],
                ingresos_extra: []
            };
        }

        const infoAnio = datos.anios[anioActivo];
        const cuotaOficial = Number(infoAnio.cuota_mensual || 15000);

        // Redistribución automática de cuotas (rebalanceo)
        (infoAnio.apoderados || []).forEach(apo => {
            let dineroTotalAcumuladoApo = 0;
            
            infoAnio.meses.forEach(mes => {
                const p = apo.pagos[mes];
                if (p) {
                    if (p.transacciones && p.transacciones.length > 0) {
                        dineroTotalAcumuladoApo += p.transacciones.reduce((acc, t) => acc + Number(t.monto), 0);
                    } else if (p.monto) {
                        dineroTotalAcumuladoApo += Number(p.monto);
                    }
                }
            });

            let dineroRestante = dineroTotalAcumuladoApo;
            infoAnio.meses.forEach(mes => {
                if (dineroRestante > 0) {
                    const abonoEsteMes = Math.min(dineroRestante, cuotaOficial);
                    dineroRestante -= abonoEsteMes;
                    
                    apo.pagos[mes] = {
                        ...apo.pagos[mes],
                        monto: abonoEsteMes,
                        pagado: abonoEsteMes >= cuotaOficial
                    };
                } else {
                    apo.pagos[mes] = {
                        pagado: false,
                        monto: 0,
                        fecha: null,
                        transacciones: []
                    };
                }
            });
        });

        res.json({
            anio_activo: anioActivo,
            aniosDisponibles: Object.keys(datos.anios),
            configuracion: {
                saldo_inicial: infoAnio.saldo_inicial || 0,
                cuota_mensual: cuotaOficial,
                nombre_curso: infoAnio.nombre_curso || "4° Medio A",
                profesor: infoAnio.profesor || "Juan Pérez",
                presidente: infoAnio.presidente || "Ana Gómez",
                tesorero: infoAnio.tesorero || "María González",
                meses: infoAnio.meses
            },
            apoderados: infoAnio.apoderados || [],
            gastos: infoAnio.gastos || [],
            ingresos_extra: infoAnio.ingresos_extra || []
        });
    } catch (error) {
        console.error("Error al obtener los datos:", error);
        res.status(500).json({ error: "Error al obtener los datos" });
    }
});

// 2. Cambiar de año activo
router.post('/curso/admin/cambiar-anio', async (req, res) => {
    const { nuevoAnio, cuotaMensual } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioAnterior = datos.anio_activo || "2026";
        const infoAnioAnt = datos.anios[anioAnterior];

        let totalRecaudadoAnt = 0;
        let totalGastosAnt = (infoAnioAnt.gastos || []).reduce((acc, g) => acc + Number(g.monto), 0);
        let totalIngresosAnt = (infoAnioAnt.ingresos_extra || []).reduce((acc, e) => acc + Number(e.monto), 0);

        (infoAnioAnt.apoderados || []).forEach(apo => {
            infoAnioAnt.meses.forEach(mes => {
                const p = apo.pagos[mes];
                if (p && p.monto) totalRecaudadoAnt += Number(p.monto);
            });
        });

        const saldoFinalAnterior = Number(infoAnioAnt.saldo_inicial || 0) + totalRecaudadoAnt + totalIngresosAnt - totalGastosAnt;

        if (!datos.anios[nuevoAnio]) {
            const apoderadosActivos = (infoAnioAnt.apoderados || [])
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
                cuota_mensual: Number(cuotaMensual) || infoAnioAnt.cuota_mensual || 15000,
                nombre_curso: infoAnioAnt.nombre_curso || "4° Medio A",
                profesor: infoAnioAnt.profesor || "Juan Pérez",
                presidente: infoAnioAnt.presidente || "Ana Gómez",
                tesorero: infoAnioAnt.tesorero || "María González",
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

// 3. Actualizar configuración (incluyendo datos del curso, saldo inicial y cuota)
router.put('/curso/admin/configuracion', async (req, res) => {
    const { saldo_inicial, cuota_mensual, nombre_curso, profesor, presidente, tesorero } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        if (saldo_inicial !== undefined) infoAnio.saldo_inicial = Number(saldo_inicial);
        if (cuota_mensual !== undefined) infoAnio.cuota_mensual = Number(cuota_mensual);
        if (nombre_curso !== undefined) infoAnio.nombre_curso = nombre_curso;
        if (profesor !== undefined) infoAnio.profesor = profesor;
        if (presidente !== undefined) infoAnio.presidente = presidente;
        if (tesorero !== undefined) infoAnio.tesorero = tesorero;

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, configuracion: infoAnio });
    } catch (error) {
        console.error("Error al actualizar configuración:", error);
        res.status(500).json({ error: "Error al actualizar la configuración" });
    }
});

// 4. Registrar pago global con distribución automática
router.post('/curso/admin/pago-global', async (req, res) => {
    const { apoderadoId, montoEntregado, fecha, responsable } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];
        
        const apoderado = infoAnio.apoderados.find(a => a.id === apoderadoId);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        let dineroRestante = Number(montoEntregado || 0);
        const cuotaOficial = Number(infoAnio.cuota_mensual);
        const fechaTransaccion = fecha || new Date().toISOString().slice(0, 10);
        const personaResponsable = responsable || apoderado.nombre;

        for (const mes of infoAnio.meses) {
            if (dineroRestante <= 0) break;

            const pagoMes = apoderado.pagos[mes] || { monto: 0, pagado: false, transacciones: [] };
            const saldoPendienteEsteMes = cuotaOficial - Number(pagoMes.monto || 0);

            if (saldoPendienteEsteMes > 0) {
                const abonoParaEsteMes = Math.min(dineroRestante, saldoPendienteEsteMes);
                const nuevoMontoMes = Number(pagoMes.monto || 0) + abonoParaEsteMes;
                
                dineroRestante -= abonoParaEsteMes;
                const estaPagadoCompleto = nuevoMontoMes >= cuotaOficial;

                const transaccionNueva = {
                    monto: abonoParaEsteMes,
                    fecha: fechaTransaccion,
                    responsable: personaResponsable
                };

                apoderado.pagos[mes] = {
                    pagado: estaPagadoCompleto,
                    monto: nuevoMontoMes,
                    fecha: fechaTransaccion,
                    transacciones: pagoMes.transacciones ? [...pagoMes.transacciones, transaccionNueva] : [transaccionNueva]
                };
            }
        }

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        console.error("Error al procesar pago global:", error);
        res.status(500).json({ error: "Error al procesar el pago global" });
    }
});

// 5. Eliminar pago de un mes
router.delete('/curso/admin/pago/:apoderadoId/:mes', async (req, res) => {
    const { apoderadoId, mes } = req.params;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];
        
        const apoderado = infoAnio.apoderados.find(a => a.id === apoderadoId);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        apoderado.pagos[mes] = {
            pagado: false,
            monto: 0,
            fecha: null,
            transacciones: []
        };

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        console.error("Error al eliminar el pago:", error);
        res.status(500).json({ error: "Error al eliminar el pago" });
    }
});

// 6. Registrar gasto
router.post('/curso/admin/gasto', async (req, res) => {
    const { mes, titulo, monto, fecha } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        const nuevoGasto = {
            id: 'gasto-' + Date.now(),
            mes,
            titulo,
            monto: Number(monto),
            fecha: fecha || new Date().toISOString().slice(0, 10)
        };
        infoAnio.gastos.push(nuevoGasto);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, nuevoGasto });
    } catch (error) {
        console.error("Error al registrar gasto:", error);
        res.status(500).json({ error: "Error al registrar gasto" });
    }
});

// 6.1 Eliminar Gasto
router.delete('/curso/admin/gasto/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        infoAnio.gastos = (infoAnio.gastos || []).filter(g => g.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al eliminar gasto:", error);
        res.status(500).json({ error: "Error al eliminar gasto" });
    }
});

// 7. Registrar Ingreso Extra
router.post('/curso/admin/ingreso-extra', async (req, res) => {
    const { titulo, monto, fecha } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        if (!infoAnio.ingresos_extra) infoAnio.ingresos_extra = [];

        const nuevoIngreso = {
            id: 'ext-' + Date.now(),
            titulo,
            monto: Number(monto),
            fecha: fecha || new Date().toISOString().slice(0, 10)
        };
        infoAnio.ingresos_extra.push(nuevoIngreso);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, nuevoIngreso });
    } catch (error) {
        console.error("Error al registrar ingreso extra:", error);
        res.status(500).json({ error: "Error al registrar el ingreso extra" });
    }
});

// 7.1 Eliminar Ingreso Extra
router.delete('/curso/admin/ingreso-extra/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        infoAnio.ingresos_extra = (infoAnio.ingresos_extra || []).filter(e => e.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al eliminar ingreso extra:", error);
        res.status(500).json({ error: "Error al eliminar ingreso extra" });
    }
});

// 8. Agregar apoderado
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

// 9. Cambiar estado apoderado
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

// 10. Backup y Restauración
router.get('/curso/backup', async (req, res) => {
    try {
        const datos = await dbConfig.leerDatos();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=backup_tesoreria.json');
        res.send(JSON.stringify(datos, null, 2));
    } catch (error) {
        res.status(500).json({ error: "Error al generar el backup" });
    }
});

router.post('/curso/backup/restaurar', async (req, res) => {
    const nuevoContenido = req.body;
    try {
        if (!nuevoContenido || !nuevoContenido.anios) {
            return res.status(400).json({ error: "Estructura de backup inválida" });
        }
        await dbConfig.guardarDatos(nuevoContenido);
        res.json({ success: true, mensaje: "Aplicación restaurada con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error al restaurar los datos" });
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
                    nombre_curso: "4° Medio A",
                    profesor: "Juan Pérez",
                    presidente: "Ana Gómez",
                    tesorero: "María González",
                    meses: ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
                    apoderados: [],
                    gastos: [],
                    ingresos_extra: []
                }
            }
        };
        await dbConfig.guardarDatos(datosVacia);
        res.json({ success: true, mensaje: "Aplicación reiniciada" });
    } catch (error) {
        res.status(500).json({ error: "Error al reiniciar" });
    }
});

// Eliminar apoderado por ID
router.delete('/curso/admin/apoderado/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        infoAnio.apoderados = (infoAnio.apoderados || []).filter(a => a.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, mensaje: "Apoderado eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar apoderado:", error);
        res.status(500).json({ error: "Error al eliminar apoderado" });
    }
});
// Actualizar datos de un apoderado (nombre o alumno)
router.put('/curso/admin/apoderado/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, alumno } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        // Si tu estructura es multianual, busca en el año activo:
        const apoderados = datos.anios ? datos.anios[datos.anio_activo].apoderados : datos.apoderados;
        const apoderado = apoderados.find(a => a.id === id);

        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        if (nombre) apoderado.nombre = nombre.trim();
        if (alumno) apoderado.alumno = alumno.trim();

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar apoderado" });
    }
});

export default router;