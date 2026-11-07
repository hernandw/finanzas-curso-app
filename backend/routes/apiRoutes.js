// backend/routes/apiRoutes.js
import express from 'express';
import { dbConfig } from '../config/db.js';

const router = express.Router();

// 1. Obtener datos con recálculo dinámico y parámetro de consulta ?anio=
router.get('/curso/datos', async (req, res) => {
    try {
        const datos = await dbConfig.leerDatos();
        const anioConsultado = req.query.anio || datos.anio_activo || "2026";
        
        if (!datos.anios[anioConsultado]) {
            datos.anios[anioConsultado] = {
                cerrado: false,
                saldo_inicial: 0,
                cuota_mensual: 11000,
                nombre_curso: "8° Básico B",
                profesor: "Aylin Chong",
                presidente: "Ingrid Brito",
                tesorero: "Natalya Zakharova",
                meses: ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
                apoderados: [],
                gastos: [],
                ingresos_extra: []
            };
        }

        const infoAnio = datos.anios[anioConsultado];
        const cuotaOficial = Number(infoAnio.cuota_mensual || 11000);

        // Rebalanceo dinámico respetando meses exonerados
        (infoAnio.apoderados || []).forEach(apo => {
            let dineroTotalAcumulado = 0;
            
            infoAnio.meses.forEach(mes => {
                const p = apo.pagos[mes];
                if (p && !p.exonerado) {
                    if (p.transacciones && p.transacciones.length > 0) {
                        dineroTotalAcumulado += p.transacciones.reduce((acc, t) => acc + Number(t.monto), 0);
                    } else if (p.monto) {
                        dineroTotalAcumulado += Number(p.monto);
                    }
                }
            });

            let dineroRestante = dineroTotalAcumulado;
            infoAnio.meses.forEach(mes => {
                const pPrevio = apo.pagos[mes] || {};
                if (pPrevio.exonerado) {
                    apo.pagos[mes] = {
                        exonerado: true,
                        pagado: false,
                        monto: 0,
                        fecha: null,
                        transacciones: []
                    };
                    return;
                }

                if (dineroRestante > 0) {
                    const abonoEsteMes = Math.min(dineroRestante, cuotaOficial);
                    dineroRestante -= abonoEsteMes;
                    
                    apo.pagos[mes] = {
                        ...pPrevio,
                        exonerado: false,
                        monto: abonoEsteMes,
                        pagado: abonoEsteMes >= cuotaOficial
                    };
                } else {
                    apo.pagos[mes] = {
                        exonerado: false,
                        pagado: false,
                        monto: 0,
                        fecha: null,
                        transacciones: []
                    };
                }
            });
        });

        res.json({
            anio_activo: anioConsultado,
            aniosDisponibles: Object.keys(datos.anios).sort(),
            configuracion: {
                cerrado: Boolean(infoAnio.cerrado),
                saldo_inicial: infoAnio.saldo_inicial || 0,
                cuota_mensual: cuotaOficial,
                nombre_curso: infoAnio.nombre_curso || "8° Básico B",
                profesor: infoAnio.profesor || "Aylin Chong",
                presidente: infoAnio.presidente || "Ingrid Brito",
                tesorero: infoAnio.tesorero || "Natalya Zakharova",
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

// 2. Cerrar año escolar actual y traspasar apoderados y saldo al siguiente año
router.post('/curso/admin/cerrar-anio', async (req, res) => {
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const dataAnio = datos.anios[anioActual];

        if (!dataAnio) return res.status(404).json({ error: "Año no encontrado" });

        dataAnio.cerrado = true;

        let totalRecaudado = 0;
        const totalGastos = (dataAnio.gastos || []).reduce((acc, g) => acc + Number(g.monto), 0);
        const totalIngresosExtra = (dataAnio.ingresos_extra || []).reduce((acc, e) => acc + Number(e.monto), 0);

        (dataAnio.apoderados || []).forEach(apo => {
            dataAnio.meses.forEach(mes => {
                const p = apo.pagos[mes];
                if (p && p.monto && !p.exonerado) totalRecaudado += Number(p.monto);
            });
        });

        const saldoFinalArrastre = Number(dataAnio.saldo_inicial || 0) + totalRecaudado + totalIngresosExtra - totalGastos;
        const siguienteAnio = String(Number(anioActual) + 1);
        const meses = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        const apoderadosNuevos = (dataAnio.apoderados || [])
            .filter(a => a.activo !== false)
            .map(a => ({
                id: 'apo-' + Math.random().toString(36).substr(2, 9),
                nombre: a.nombre,
                alumno: a.alumno,
                activo: true,
                pagos: meses.reduce((acc, m) => ({
                    ...acc,
                    [m]: { pagado: false, monto: 0, fecha: null, exonerado: false, transacciones: [] }
                }), {})
            }));

        if (!datos.anios[siguienteAnio]) {
            datos.anios[siguienteAnio] = {
                cerrado: false,
                saldo_inicial: saldoFinalArrastre,
                cuota_mensual: Number(dataAnio.cuota_mensual) || 11000,
                nombre_curso: dataAnio.nombre_curso || "Curso",
                profesor: dataAnio.profesor || "Profesor Jefe",
                presidente: dataAnio.presidente || "Presidente",
                tesorero: dataAnio.tesorero || "Tesorero",
                meses: meses,
                apoderados: apoderadosNuevos,
                gastos: [],
                ingresos_extra: []
            };
        } else {
            datos.anios[siguienteAnio].saldo_inicial = saldoFinalArrastre;
            if (!datos.anios[siguienteAnio].apoderados || datos.anios[siguienteAnio].apoderados.length === 0) {
                datos.anios[siguienteAnio].apoderados = apoderadosNuevos;
            }
        }

        datos.anio_activo = siguienteAnio;
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, anio_activo: siguienteAnio, saldo_inicial: saldoFinalArrastre });
    } catch (error) {
        console.error("Error al cerrar año:", error);
        res.status(500).json({ error: "Error al cerrar año escolar" });
    }
});

// 3. Cambiar año activo o crearlo
router.post('/curso/admin/cambiar-anio', async (req, res) => {
    const { nuevoAnio, cuotaMensual } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioAnterior = datos.anio_activo || "2026";
        const infoAnioAnt = datos.anios[anioAnterior] || {};

        let totalRecaudadoAnt = 0;
        let totalGastosAnt = (infoAnioAnt.gastos || []).reduce((acc, g) => acc + Number(g.monto), 0);
        let totalIngresosAnt = (infoAnioAnt.ingresos_extra || []).reduce((acc, e) => acc + Number(e.monto), 0);

        (infoAnioAnt.apoderados || []).forEach(apo => {
            (infoAnioAnt.meses || []).forEach(mes => {
                const p = apo.pagos[mes];
                if (p && p.monto && !p.exonerado) totalRecaudadoAnt += Number(p.monto);
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
                    pagos: (infoAnioAnt.meses || ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]).reduce((acc, mes) => ({
                        ...acc,
                        [mes]: { pagado: false, monto: 0, fecha: null, exonerado: false, transacciones: [] }
                    }), {})
                }));

            datos.anios[nuevoAnio] = {
                cerrado: false,
                saldo_inicial: saldoFinalAnterior,
                cuota_mensual: Number(cuotaMensual) || infoAnioAnt.cuota_mensual || 11000,
                nombre_curso: infoAnioAnt.nombre_curso || "Curso",
                profesor: infoAnioAnt.profesor || "Profesor Jefe",
                presidente: infoAnioAnt.presidente || "Presidente",
                tesorero: infoAnioAnt.tesorero || "Tesorero",
                meses: infoAnioAnt.meses || ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
                apoderados: apoderadosActivos,
                gastos: [],
                ingresos_extra: []
            };
        }

        datos.anio_activo = String(nuevoAnio);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, anio_activo: datos.anio_activo });
    } catch (error) {
        console.error("Error al cambiar año:", error);
        res.status(500).json({ error: "Error al cambiar año" });
    }
});

// 4. Actualizar configuración general del curso
router.put('/curso/admin/configuracion', async (req, res) => {
    const { saldo_inicial, cuota_mensual, nombre_curso, profesor, presidente, tesorero } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        if (saldo_inicial !== undefined) infoAnio.saldo_inicial = Number(saldo_inicial);
        if (cuota_mensual !== undefined) infoAnio.cuota_mensual = Number(cuota_mensual);
        if (nombre_curso !== undefined) infoAnio.nombre_curso = nombre_curso.trim();
        if (profesor !== undefined) infoAnio.profesor = profesor.trim();
        if (presidente !== undefined) infoAnio.presidente = presidente.trim();
        if (tesorero !== undefined) infoAnio.tesorero = tesorero.trim();

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, configuracion: infoAnio });
    } catch (error) {
        console.error("Error al actualizar configuración:", error);
        res.status(500).json({ error: "Error al actualizar configuración" });
    }
});

// 5. Registrar pago global omitiendo meses exonerados
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

            const pagoMes = apoderado.pagos[mes] || { monto: 0, pagado: false, exonerado: false, transacciones: [] };
            if (pagoMes.exonerado) continue;

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
                    exonerado: false,
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
        res.status(500).json({ error: "Error al procesar pago global" });
    }
});

// 6. Eliminar pago de un mes SIN que el rebalanceo reviva el primer mes
router.delete('/curso/admin/pago/:apoderadoId/:mes', async (req, res) => {
    const { apoderadoId, mes } = req.params;
    const anioConsulta = req.query.anio;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = anioConsulta || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];
        
        if (!infoAnio) return res.status(404).json({ error: "Año no encontrado" });

        const apoderado = infoAnio.apoderados.find(a => a.id === apoderadoId);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        // 1. Vaciar completamente el mes objetivo (monto, fecha y transacciones)
        apoderado.pagos[mes] = {
            exonerado: false,
            pagado: false,
            monto: 0,
            fecha: null,
            transacciones: []
        };

        // 2. Sumar el dinero real remanente del alumno
        const cuotaOficial = Number(infoAnio.cuota_mensual || 11000);
        let dineroTotal = 0;
        infoAnio.meses.forEach(m => {
            const p = apoderado.pagos[m];
            if (p && !p.exonerado && p.monto) {
                dineroTotal += Number(p.monto);
            }
        });

        // 3. Redistribuir exactamente el dinero restante
        let remanente = dineroTotal;
        infoAnio.meses.forEach(m => {
            const p = apoderado.pagos[m] || {};
            if (p.exonerado) return;

            if (remanente > 0) {
                const asignar = Math.min(remanente, cuotaOficial);
                remanente -= asignar;
                apoderado.pagos[m] = {
                    ...p,
                    monto: asignar,
                    pagado: asignar >= cuotaOficial
                };
            } else {
                apoderado.pagos[m] = {
                    exonerado: false,
                    pagado: false,
                    monto: 0,
                    fecha: null,
                    transacciones: []
                };
            }
        });

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        console.error("Error al eliminar pago:", error);
        res.status(500).json({ error: "Error al eliminar pago" });
    }
});

// 7. Exonerar o des-exonerar mes
router.put('/curso/admin/pago/exonerar/:apoderadoId/:mes', async (req, res) => {
    const { apoderadoId, mes } = req.params;
    const anioConsulta = req.query.anio;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = anioConsulta || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        const apoderado = infoAnio.apoderados.find(a => a.id === apoderadoId);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        const pagoMes = apoderado.pagos[mes] || { pagado: false, monto: 0, exonerado: false };
        const nuevoEstadoExonerado = !pagoMes.exonerado;

        apoderado.pagos[mes] = {
            ...pagoMes,
            exonerado: nuevoEstadoExonerado,
            pagado: nuevoEstadoExonerado ? false : pagoMes.pagado,
            monto: nuevoEstadoExonerado ? 0 : pagoMes.monto,
            fecha: nuevoEstadoExonerado ? null : pagoMes.fecha,
            transacciones: nuevoEstadoExonerado ? [] : (pagoMes.transacciones || [])
        };

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        console.error("Error al exonerar mes:", error);
        res.status(500).json({ error: "Error al actualizar exoneración" });
    }
});

// 8. Gastos: Registrar y Eliminar
router.post('/curso/admin/gasto', async (req, res) => {
    const { mes, titulo, monto, fecha } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        const nuevoGasto = {
            id: 'gasto-' + Date.now(),
            mes,
            titulo: titulo.trim(),
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

router.delete('/curso/admin/gasto/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        infoAnio.gastos = (infoAnio.gastos || []).filter(g => g.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, mensaje: "Gasto eliminado" });
    } catch (error) {
        console.error("Error al eliminar gasto:", error);
        res.status(500).json({ error: "Error al eliminar gasto" });
    }
});

// 9. Ingresos Extra: Registrar y Eliminar
router.post('/curso/admin/ingreso-extra', async (req, res) => {
    const { titulo, monto, fecha } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        if (!infoAnio.ingresos_extra) infoAnio.ingresos_extra = [];

        const nuevoIngreso = {
            id: 'ext-' + Date.now(),
            titulo: titulo.trim(),
            monto: Number(monto),
            fecha: fecha || new Date().toISOString().slice(0, 10)
        };
        infoAnio.ingresos_extra.push(nuevoIngreso);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, nuevoIngreso });
    } catch (error) {
        console.error("Error al registrar ingreso extra:", error);
        res.status(500).json({ error: "Error al registrar ingreso extra" });
    }
});

router.delete('/curso/admin/ingreso-extra/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        infoAnio.ingresos_extra = (infoAnio.ingresos_extra || []).filter(e => e.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, mensaje: "Ingreso extra eliminado" });
    } catch (error) {
        console.error("Error al eliminar ingreso extra:", error);
        res.status(500).json({ error: "Error al eliminar ingreso extra" });
    }
});

// 10. Apoderados: Agregar, Modificar, Cambiar Estado y Eliminar
router.post('/curso/admin/apoderado/agregar', async (req, res) => {
    const { nombre, alumno } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        const nuevoApoderado = {
            id: 'apo-' + Date.now(),
            nombre: nombre.trim(),
            alumno: alumno.trim(),
            activo: true,
            pagos: infoAnio.meses.reduce((acc, mes) => ({
                ...acc,
                [mes]: { pagado: false, monto: 0, fecha: null, exonerado: false, transacciones: [] }
            }), {})
        };
        infoAnio.apoderados.push(nuevoApoderado);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, nuevoApoderado });
    } catch (error) {
        console.error("Error al agregar apoderado:", error);
        res.status(500).json({ error: "Error al agregar apoderado" });
    }
});

router.put('/curso/admin/apoderado/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, alumno } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        const apoderado = infoAnio.apoderados.find(a => a.id === id);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        if (nombre) apoderado.nombre = nombre.trim();
        if (alumno) apoderado.alumno = alumno.trim();

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        console.error("Error al modificar apoderado:", error);
        res.status(500).json({ error: "Error al modificar apoderado" });
    }
});

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
        console.error("Error al cambiar estado:", error);
        res.status(500).json({ error: "Error al cambiar estado" });
    }
});

router.delete('/curso/admin/apoderado/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        infoAnio.apoderados = (infoAnio.apoderados || []).filter(a => a.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, mensaje: "Apoderado eliminado" });
    } catch (error) {
        console.error("Error al eliminar apoderado:", error);
        res.status(500).json({ error: "Error al eliminar apoderado" });
    }
});

// 11. Backup, Restaurar y Reset
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
    const nuevoContenido = req.body;
    try {
        if (!nuevoContenido || !nuevoContenido.anios) {
            return res.status(400).json({ error: "Estructura inválida" });
        }
        await dbConfig.guardarDatos(nuevoContenido);
        res.json({ success: true, mensaje: "Restaurado con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error al restaurar" });
    }
});

router.delete('/curso/reset', async (req, res) => {
    try {
        const datosVacia = {
            anio_activo: "2026",
            anios: {
                "2026": {
                    cerrado: false,
                    saldo_inicial: 0,
                    cuota_mensual: 11000,
                    nombre_curso: "8° Básico B",
                    profesor: "Aylin Chong",
                    presidente: "Ingrid Brito",
                    tesorero: "Natalya Zakharova",
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

export default router;