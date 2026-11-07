// backend/routes/apiRoutes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { dbConfig } from '../config/db.js';

const router = express.Router();

// Configuración de almacenamiento local para comprobantes/recibos
const uploadDir = path.resolve('backend/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'recibo-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage });


// 1. Transporte con timeouts estrictos para evitar conexiones colgadas
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL directo
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false // Evita bloqueos por inspección de certificados en proxies
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000
});


// 2. Ruta de envío con respuesta garantizada
router.post('/curso/admin/enviar-correo-morosos', async (req, res) => {
    const { apoderadoId, anio } = req.body;
    console.log('[DEBUG] Petición recibida en enviar-correo-morosos:', { apoderadoId, anio });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('[ERROR] Faltan variables SMTP_USER o SMTP_PASS');
        return res.status(500).json({ error: 'Variables SMTP_USER o SMTP_PASS no configuradas en el entorno.' });
    }

    try {
        const datos = await dbConfig.leerDatos();
        const anioSel = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios ? datos.anios[anioSel] : null;

        if (!infoAnio) {
            return res.status(404).json({ error: `No existen registros para el año ${anioSel}` });
        }

        const cuotaOficial = Number(infoAnio.cuota_mensual || 11000);

        let apoderadosNotificar = [];
        if (apoderadoId) {
            const individual = (infoAnio.apoderados || []).find(a => a.id === apoderadoId);
            if (individual) apoderadosNotificar.push(individual);
        } else {
            apoderadosNotificar = (infoAnio.apoderados || []).filter(a => a.activo !== false);
        }

        let enviados = 0;
        let errores = [];

        for (const apo of apoderadosNotificar) {
            if (!apo.email || apo.email.trim() === '') continue;

            let deudaTotal = 0;
            let mesesDebe = [];

            (infoAnio.meses || []).forEach(m => {
                const p = apo.pagos ? apo.pagos[m] : null;
                if (p?.exonerado) return;
                const abono = Number(p?.monto || 0);
                if (!p?.pagado) {
                    deudaTotal += (cuotaOficial - abono);
                    mesesDebe.push(m);
                }
            });

            if (deudaTotal > 0) {
                try {
                    console.log(`[DEBUG] Intentando enviar a: ${apo.email}...`);
                    await transporter.sendMail({
                        from: `"Tesorería - ${infoAnio.nombre_curso || 'Curso'}" <${process.env.SMTP_USER}>`,
                        to: apo.email.trim(),
                        subject: `Aviso de Cuotas Pendientes - ${apo.alumno} (${anioSel})`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                                <h2 style="color: #0f172a;">Estado de Cuenta - ${infoAnio.nombre_curso || 'Tesorería'}</h2>
                                <p>Estimado/a <strong>${apo.nombre}</strong>,</p>
                                <p>Le informamos el estado de cuotas de su pupilo <strong>${apo.alumno}</strong> para el periodo ${anioSel}:</p>
                                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 15px 0;">
                                    <p style="margin: 0; color: #991b1b; font-weight: bold;">Monto total pendiente: $${deudaTotal.toLocaleString('es-CL')}</p>
                                    <p style="margin: 4px 0 0 0; color: #7f1d1d; font-size: 13px;">Meses con saldo: ${mesesDebe.join(', ')}</p>
                                </div>
                                <p style="font-size: 12px; color: #64748b;">Favor regularizar a la brevedad con la directiva de tesorería.</p>
                            </div>
                        `
                    });
                    console.log(`[DEBUG] Enviado con éxito a: ${apo.email}`);
                    enviados++;
                } catch (mailErr) {
                    console.error(`[ERROR] Falló envío a ${apo.email}:`, mailErr.message);
                    errores.push(`${apo.email}: ${mailErr.message}`);
                }
            }
        }

        if (enviados === 0 && errores.length > 0) {
            return res.status(500).json({ error: `Fallo al enviar correo: ${errores.join(' | ')}` });
        }

        return res.json({
            success: true,
            correosEnviados: enviados,
            mensaje: enviados > 0 ? 'Notificaciones procesadas exitosamente.' : 'No se encontraron destinatarios con deuda y correo válido.'
        });

    } catch (error) {
        console.error('[ERROR] Error interno en enviar-correo-morosos:', error);
        return res.status(500).json({ error: 'Error interno del servidor al procesar el envío.' });
    }
});

// 1. Obtener datos generales por año (?anio=YYYY)
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

        (infoAnio.apoderados || []).forEach(apo => {
            let dineroTotal = 0;
            infoAnio.meses.forEach(mes => {
                const p = apo.pagos[mes];
                if (p && !p.exonerado) {
                    if (p.transacciones && p.transacciones.length > 0) {
                        dineroTotal += p.transacciones.reduce((acc, t) => acc + Number(t.monto), 0);
                    } else if (p.monto) {
                        dineroTotal += Number(p.monto);
                    }
                }
            });

            let remanente = dineroTotal;
            infoAnio.meses.forEach(mes => {
                const pPrev = apo.pagos[mes] || {};
                if (pPrev.exonerado) {
                    apo.pagos[mes] = { exonerado: true, pagado: false, monto: 0, fecha: null, transacciones: [] };
                    return;
                }
                if (remanente > 0) {
                    const abono = Math.min(remanente, cuotaOficial);
                    remanente -= abono;
                    apo.pagos[mes] = { ...pPrev, exonerado: false, monto: abono, pagado: abono >= cuotaOficial };
                } else {
                    apo.pagos[mes] = { exonerado: false, pagado: false, monto: 0, fecha: null, transacciones: [] };
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
        res.status(500).json({ error: "Error al obtener los datos" });
    }
});

// 2. Registrar gasto con recibo opcional
router.post('/curso/admin/gasto', upload.single('recibo'), async (req, res) => {
    const { mes, titulo, monto, fecha, anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        const nuevoGasto = {
            id: 'gasto-' + Date.now(),
            mes,
            titulo: (titulo || '').trim(),
            monto: Number(monto),
            fecha: fecha || new Date().toISOString().slice(0, 10),
            reciboUrl: req.file ? `/uploads/${req.file.filename}` : null
        };

        infoAnio.gastos.push(nuevoGasto);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, nuevoGasto });
    } catch (error) {
        res.status(500).json({ error: "Error al registrar gasto con recibo" });
    }
});

// 3. Eliminar gasto y su archivo físico
router.delete('/curso/admin/gasto/:id', async (req, res) => {
    const { id } = req.params;
    const anioActual = req.query.anio;
    try {
        const datos = await dbConfig.leerDatos();
        const anioSel = anioActual || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioSel];

        const gastoIndex = infoAnio.gastos.findIndex(g => g.id === id);
        if (gastoIndex !== -1) {
            const gasto = infoAnio.gastos[gastoIndex];
            if (gasto.reciboUrl) {
                const filePath = path.resolve('backend' + gasto.reciboUrl);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            infoAnio.gastos.splice(gastoIndex, 1);
            await dbConfig.guardarDatos(datos);
        }
        res.json({ success: true, mensaje: "Gasto eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar gasto" });
    }
});

// 4. Agregar Apoderado / Estudiante con correo
router.post('/curso/admin/apoderado/agregar', async (req, res) => {
    const { nombre, alumno, email, anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        const nuevoApoderado = {
            id: 'apo-' + Date.now(),
            nombre: (nombre || '').trim(),
            alumno: (alumno || '').trim(),
            email: (email || '').trim().toLowerCase(),
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
        res.status(500).json({ error: "Error al agregar apoderado" });
    }
});

// 5. Modificar datos de apoderado/alumno/correo
router.put('/curso/admin/apoderado/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, alumno, email, anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        const apoderado = infoAnio.apoderados.find(a => a.id === id);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        if (nombre) apoderado.nombre = nombre.trim();
        if (alumno) apoderado.alumno = alumno.trim();
        if (email !== undefined) apoderado.email = email.trim().toLowerCase();

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        res.status(500).json({ error: "Error al modificar apoderado" });
    }
});

// 6. Eliminar Apoderado
router.delete('/curso/admin/apoderado/:id', async (req, res) => {
    const { id } = req.params;
    const anioActual = req.query.anio;
    try {
        const datos = await dbConfig.leerDatos();
        const anioSel = anioActual || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioSel];

        infoAnio.apoderados = (infoAnio.apoderados || []).filter(a => a.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, mensaje: "Apoderado eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar apoderado" });
    }
});

// 7. Cambiar estado activo/oculto de apoderado
router.put('/curso/admin/apoderado/estado/:id', async (req, res) => {
    const { id } = req.params;
    const { activo, anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioSel = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioSel];

        const apoderado = infoAnio.apoderados.find(a => a.id === id);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        apoderado.activo = Boolean(activo);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar estado" });
    }
});

// 8. Pago global acumulativo con distribución automática en meses
router.post('/curso/admin/pago-global', async (req, res) => {
    const { apoderadoId, montoEntregado, fecha, responsable, anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = anio || datos.anio_activo || "2026";
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

            const saldoPendiente = cuotaOficial - Number(pagoMes.monto || 0);
            if (saldoPendiente > 0) {
                const abono = Math.min(dineroRestante, saldoPendiente);
                const nuevoMonto = Number(pagoMes.monto || 0) + abono;
                dineroRestante -= abono;
                const estaPagadoCompleto = nuevoMonto >= cuotaOficial;

                const transaccionNueva = { monto: abono, fecha: fechaTransaccion, responsable: personaResponsable };
                apoderado.pagos[mes] = {
                    exonerado: false,
                    pagado: estaPagadoCompleto,
                    monto: nuevoMonto,
                    fecha: fechaTransaccion,
                    transacciones: pagoMes.transacciones ? [...pagoMes.transacciones, transaccionNueva] : [transaccionNueva]
                };
            }
        }

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        res.status(500).json({ error: "Error al procesar pago global" });
    }
});

// 9. Revertir pago de un mes y recalcular remanente
router.delete('/curso/admin/pago/:apoderadoId/:mes', async (req, res) => {
    const { apoderadoId, mes } = req.params;
    const anioConsulta = req.query.anio;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = anioConsulta || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        const apoderado = infoAnio.apoderados.find(a => a.id === apoderadoId);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        apoderado.pagos[mes] = { exonerado: false, pagado: false, monto: 0, fecha: null, transacciones: [] };

        const cuotaOficial = Number(infoAnio.cuota_mensual || 11000);
        let dineroTotal = 0;
        infoAnio.meses.forEach(m => {
            const p = apoderado.pagos[m];
            if (p && !p.exonerado && p.monto) dineroTotal += Number(p.monto);
        });

        let remanente = dineroTotal;
        infoAnio.meses.forEach(m => {
            const p = apoderado.pagos[m] || {};
            if (p.exonerado) return;
            if (remanente > 0) {
                const asignar = Math.min(remanente, cuotaOficial);
                remanente -= asignar;
                apoderado.pagos[m] = { ...p, monto: asignar, pagado: asignar >= cuotaOficial };
            } else {
                apoderado.pagos[m] = { exonerado: false, pagado: false, monto: 0, fecha: null, transacciones: [] };
            }
        });

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar pago" });
    }
});

// 10. Exonerar o des-exonerar mes
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
        const nuevoEstado = !pagoMes.exonerado;

        apoderado.pagos[mes] = {
            ...pagoMes,
            exonerado: nuevoEstado,
            pagado: nuevoEstado ? false : pagoMes.pagado,
            monto: nuevoEstado ? 0 : pagoMes.monto,
            fecha: nuevoEstado ? null : pagoMes.fecha,
            transacciones: nuevoEstado ? [] : (pagoMes.transacciones || [])
        };

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        res.status(500).json({ error: "Error al alternar exoneración" });
    }
});

// 11. Registrar ingreso extra
router.post('/curso/admin/ingreso-extra', async (req, res) => {
    const { titulo, monto, fecha, anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioActual];

        const nuevoIngreso = {
            id: 'ext-' + Date.now(),
            titulo: (titulo || '').trim(),
            monto: Number(monto),
            fecha: fecha || new Date().toISOString().slice(0, 10)
        };
        infoAnio.ingresos_extra.push(nuevoIngreso);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, nuevoIngreso });
    } catch (error) {
        res.status(500).json({ error: "Error al registrar ingreso extra" });
    }
});

// 12. Eliminar ingreso extra
router.delete('/curso/admin/ingreso-extra/:id', async (req, res) => {
    const { id } = req.params;
    const anioActual = req.query.anio;
    try {
        const datos = await dbConfig.leerDatos();
        const anioSel = anioActual || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioSel];

        infoAnio.ingresos_extra = (infoAnio.ingresos_extra || []).filter(e => e.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, mensaje: "Ingreso extra eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar ingreso extra" });
    }
});

// 13. Actualizar configuración (cuota, saldo inicial, directiva)
router.put('/curso/admin/configuracion', async (req, res) => {
    const { saldo_inicial, cuota_mensual, nombre_curso, profesor, presidente, tesorero, anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = anio || datos.anio_activo || "2026";
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
        res.status(500).json({ error: "Error al actualizar configuración" });
    }
});

// 14. Cambiar año activo
router.post('/curso/admin/cambiar-anio', async (req, res) => {
    const { nuevoAnio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        datos.anio_activo = String(nuevoAnio);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, anio_activo: datos.anio_activo });
    } catch (error) {
        res.status(500).json({ error: "Error al cambiar de año" });
    }
});

// 15. Cerrar año escolar y arrastrar saldo final de caja
router.post('/curso/admin/cerrar-anio', async (req, res) => {
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const dataAnio = datos.anios[anioActual];

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
                email: a.email || '',
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
                nombre_curso: dataAnio.nombre_curso,
                profesor: dataAnio.profesor,
                presidente: dataAnio.presidente,
                tesorero: dataAnio.tesorero,
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
        res.status(500).json({ error: "Error al cerrar año" });
    }
});



// 17. Enviar PDF por correo a los apoderados
router.post('/curso/admin/enviar-pdf-correo', upload.single('pdf'), async (req, res) => {
    const { anio } = req.body;
    try {
        if (!req.file) return res.status(400).json({ error: "No se recibió el archivo PDF" });
        const datos = await dbConfig.leerDatos();
        const anioSel = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioSel];

        const correos = (infoAnio.apoderados || [])
            .filter(a => a.activo !== false && a.email && a.email.trim() !== '')
            .map(a => a.email);

        if (correos.length === 0) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: "No hay apoderados con correo registrado para recibir el informe" });
        }

        await transporter.sendMail({
            from: `"Tesorería - ${infoAnio.nombre_curso}" <${process.env.SMTP_USER}>`,
            to: correos,
            subject: `Informe de Tesorería Oficial (${anioSel}) - ${infoAnio.nombre_curso}`,
            text: `Estimados apoderados, adjunto encontrarán el informe financiero detallado y balance del curso correspondiente al periodo escolar ${anioSel}.`,
            attachments: [{
                filename: `Informe_Tesoreria_${anioSel}.pdf`,
                path: req.file.path
            }]
        });

        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.json({ success: true, destinatarios: correos.length });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message || "Error al enviar el PDF por correo" });
    }
});

// 18. Copia de seguridad y restauración
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
        await dbConfig.guardarDatos(req.body);
        res.json({ success: true, mensaje: "Restaurado con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error al restaurar" });
    }
});

// 19. Reset de fábrica
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