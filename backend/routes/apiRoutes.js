// backend/routes/apiRoutes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dbConfig } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configuración de almacenamiento físico unificada exactamente con app.js
// Apunta exactamente a backend/uploads
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'comprobante-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage });

// Función para forzar la URL pública remota de Render y evitar localhost
const obtenerUrlPublica = (req) => {
    if (process.env.APP_URL) {
        return process.env.APP_URL.replace(/\/$/, '');
    }
    if (process.env.RENDER_EXTERNAL_URL) {
        return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
    }
    const host = req.get('host') || '';
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return 'https://finanzas-curso-app.onrender.com';
    }
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    return `${proto}://${host}`;
};

// 1. Obtener datos generales por año (?anio=YYYY)
router.get('/curso/datos', async (req, res) => {
    try {
        const datos = await dbConfig.leerDatos();
        const anioConsultado = req.query.anio || datos.anio_activo || "2026";
        
        if (!datos.anios[anioConsultado]) {
            datos.anios[anioConsultado] = {
                cerrado: false,
                saldo_inicial: 0,
                cuota_mensual: 21000,
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
        const cuotaOficial = Number(infoAnio.cuota_mensual || 21000);

        const apoderadosCompletos = (infoAnio.apoderados || []).map(apo => {
            const pagosCompletos = {};
            infoAnio.meses.forEach(mes => {
                const p = apo.pagos ? apo.pagos[mes] : null;
                if (p?.exonerado) {
                    pagosCompletos[mes] = { pagado: false, monto: 0, fecha: null, exonerado: true, transacciones: [] };
                } else if (p && Number(p.monto || 0) > 0) {
                    pagosCompletos[mes] = {
                        pagado: Boolean(p.pagado),
                        monto: Number(p.monto || 0),
                        fecha: p.fecha || null,
                        exonerado: false,
                        transacciones: p.transacciones || []
                    };
                } else {
                    pagosCompletos[mes] = { pagado: false, monto: 0, fecha: null, exonerado: false, transacciones: [] };
                }
            });

            return {
                id: apo.id,
                nombre: apo.nombre,
                alumno: apo.alumno,
                email: apo.email || '',
                activo: apo.activo !== false,
                pagos: pagosCompletos
            };
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
            apoderados: apoderadosCompletos,
            gastos: infoAnio.gastos || [],
            ingresos_extra: infoAnio.ingresos_extra || []
        });
    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error al obtener los datos" });
    }
});

// 2. Cambiar año activo
router.post('/curso/admin/cambiar-anio', async (req, res) => {
    const { nuevoAnio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        if (datos.anios && datos.anios[nuevoAnio]) {
            datos.anio_activo = String(nuevoAnio);
            await dbConfig.guardarDatos(datos);
            return res.json({ success: true, anio_activo: datos.anio_activo });
        }
        res.status(404).json({ error: "El año solicitado no existe" });
    } catch (error) {
        res.status(500).json({ error: "Error al cambiar de año" });
    }
});

// 3. Actualizar configuración
router.put('/curso/admin/configuracion', async (req, res) => {
    const { saldo_inicial, cuota_mensual, nombre_curso, profesor, presidente, tesorero, anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioSel = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioSel];

        if (!infoAnio) return res.status(404).json({ error: "Año no encontrado" });

        if (saldo_inicial !== undefined) infoAnio.saldo_inicial = Number(saldo_inicial);
        if (cuota_mensual !== undefined) infoAnio.cuota_mensual = Number(cuota_mensual);
        if (nombre_curso !== undefined) infoAnio.nombre_curso = nombre_curso;
        if (profesor !== undefined) infoAnio.profesor = profesor;
        if (presidente !== undefined) infoAnio.presidente = presidente;
        if (tesorero !== undefined) infoAnio.tesorero = tesorero;

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, configuracion: infoAnio });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar configuración" });
    }
});

// 4. Agregar estudiante / apoderado
router.post('/curso/admin/apoderado/agregar', async (req, res) => {
    const { nombre, alumno, email, anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioSel = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioSel];

        const nuevoApoderado = {
            id: 'apo-' + Date.now(),
            nombre: nombre ? nombre.trim() : "Nuevo Apoderado",
            alumno: alumno ? alumno.trim() : "Nuevo Alumno",
            email: email ? email.trim().toLowerCase() : "",
            activo: true,
            pagos: {}
        };

        infoAnio.apoderados.push(nuevoApoderado);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, nuevoApoderado });
    } catch (error) {
        res.status(500).json({ error: "Error al agregar apoderado" });
    }
});

// 5. Modificar estudiante / apoderado
router.put('/curso/admin/apoderado/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, alumno, email, anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioSel = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioSel];

        const apoderado = infoAnio.apoderados.find(a => a.id === id);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        if (nombre !== undefined) apoderado.nombre = nombre.trim();
        if (alumno !== undefined) apoderado.alumno = alumno.trim();
        if (email !== undefined) apoderado.email = email.trim().toLowerCase();

        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        res.status(500).json({ error: "Error al modificar apoderado" });
    }
});

// 6. Cambiar estado activo / inactivo (Ocultar / Mostrar)
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
        res.status(500).json({ error: "Error al cambiar estado" });
    }
});

// 7. Eliminar estudiante definitivamente
router.delete('/curso/admin/apoderado/:id', async (req, res) => {
    const { id } = req.params;
    const anioSel = req.query.anio;
    try {
        const datos = await dbConfig.leerDatos();
        const anioFinal = anioSel || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioFinal];

        infoAnio.apoderados = infoAnio.apoderados.filter(a => a.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar apoderado" });
    }
});

// 8. Pago global
router.post('/curso/admin/pago-global', async (req, res) => {
    const { apoderadoId, montoEntregado, fecha, responsable, anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioSel = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioSel];
        
        const apoderado = infoAnio.apoderados.find(a => a.id === apoderadoId);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        let dineroRestante = Number(montoEntregado || 0);
        const cuotaOficial = Number(infoAnio.cuota_mensual || 21000);
        const fechaTransaccion = fecha || new Date().toISOString().slice(0, 10);
        const personaResponsable = responsable || apoderado.nombre;

        for (const mes of infoAnio.meses) {
            if (dineroRestante <= 0) break;
            const pagoMes = apoderado.pagos[mes] || { monto: 0, pagado: false, transacciones: [] };
            if (pagoMes.exonerado) continue;

            const saldoPendiente = cuotaOficial - Number(pagoMes.monto || 0);
            if (saldoPendiente > 0) {
                const abono = Math.min(dineroRestante, saldoPendiente);
                const nuevoMonto = Number(pagoMes.monto || 0) + abono;
                dineroRestante -= abono;

                const transaccionNueva = {
                    monto: abono,
                    fecha: fechaTransaccion,
                    responsable: personaResponsable
                };

                apoderado.pagos[mes] = {
                    pagado: nuevoMonto >= cuotaOficial,
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

// 9. Eliminar / revertir pago de un mes
router.delete('/curso/admin/pago/:apoderadoId/:mes', async (req, res) => {
    const { apoderadoId, mes } = req.params;
    const anioSel = req.query.anio;
    try {
        const datos = await dbConfig.leerDatos();
        const anioFinal = anioSel || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioFinal];
        
        const apoderado = infoAnio.apoderados.find(a => a.id === apoderadoId);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        delete apoderado.pagos[mes];
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar pago" });
    }
});

// 10. Exonerar mes
router.put('/curso/admin/pago/exonerar/:apoderadoId/:mes', async (req, res) => {
    const { apoderadoId, mes } = req.params;
    const anioSel = req.query.anio;
    try {
        const datos = await dbConfig.leerDatos();
        const anioFinal = anioSel || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioFinal];
        
        const apoderado = infoAnio.apoderados.find(a => a.id === apoderadoId);
        if (!apoderado) return res.status(404).json({ error: "Apoderado no encontrado" });

        apoderado.pagos[mes] = { exonerado: true };
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, apoderado });
    } catch (error) {
        res.status(500).json({ error: "Error al exonerar mes" });
    }
});

// 11. Registrar gasto con recibo opcional
router.post('/curso/admin/gasto', upload.single('comprobante'), async (req, res) => {
    const { mes, titulo, monto, fecha, anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioSel = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioSel];

        let comprobanteUrl = null;
        if (req.file) {
            const baseUrl = obtenerUrlPublica(req);
            comprobanteUrl = `${baseUrl}/uploads/${req.file.filename}`;
        }

        const nuevoGasto = {
            id: 'gas-' + Date.now(),
            mes: mes || "Marzo",
            titulo: titulo ? titulo.trim() : "Gasto sin título",
            monto: Number(monto || 0),
            fecha: fecha || new Date().toISOString().slice(0, 10),
            comprobante: comprobanteUrl
        };

        infoAnio.gastos.push(nuevoGasto);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, nuevoGasto });
    } catch (error) {
        res.status(500).json({ error: "Error al registrar gasto" });
    }
});

// 12. Eliminar gasto
router.delete('/curso/admin/gasto/:id', async (req, res) => {
    const { id } = req.params;
    const anioSel = req.query.anio;
    try {
        const datos = await dbConfig.leerDatos();
        const anioFinal = anioSel || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioFinal];

        infoAnio.gastos = (infoAnio.gastos || []).filter(g => g.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar gasto" });
    }
});

// 13. Registrar ingreso extra
router.post('/curso/admin/ingreso-extra', async (req, res) => {
    const { titulo, monto, fecha, anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioSel = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioSel];

        if (!infoAnio.ingresos_extra) infoAnio.ingresos_extra = [];

        const nuevoIngreso = {
            id: 'ext-' + Date.now(),
            titulo: titulo ? titulo.trim() : "Ingreso Extra",
            monto: Number(monto || 0),
            fecha: fecha || new Date().toISOString().slice(0, 10)
        };

        infoAnio.ingresos_extra.push(nuevoIngreso);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true, nuevoIngreso });
    } catch (error) {
        res.status(500).json({ error: "Error al registrar ingreso extra" });
    }
});

// 14. Eliminar ingreso extra
router.delete('/curso/admin/ingreso-extra/:id', async (req, res) => {
    const { id } = req.params;
    const anioSel = req.query.anio;
    try {
        const datos = await dbConfig.leerDatos();
        const anioFinal = anioSel || datos.anio_activo || "2026";
        const infoAnio = datos.anios[anioFinal];

        infoAnio.ingresos_extra = (infoAnio.ingresos_extra || []).filter(e => e.id !== id);
        await dbConfig.guardarDatos(datos);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar ingreso extra" });
    }
});

// 15. Notificar morosos con EmailJS
router.post('/curso/admin/enviar-correo-morosos', async (req, res) => {
    const { apoderadoId, anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioSel = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios ? datos.anios[anioSel] : null;

        if (!infoAnio) return res.status(404).json({ error: `No existen datos para ${anioSel}` });

        const cuotaOficial = Number(infoAnio.cuota_mensual || 21000);

        let apoderadosNotificar = [];
        if (apoderadoId) {
            const encontrado = (infoAnio.apoderados || []).find(a => a.id === apoderadoId);
            if (encontrado) apoderadosNotificar.push(encontrado);
        } else {
            apoderadosNotificar = (infoAnio.apoderados || []).filter(a => a.activo !== false);
        }

        let enviados = 0;
        let errores = [];

        for (const apo of apoderadosNotificar) {
            if (!apo.email || apo.email.trim() === '') continue;

            let deudaTotal = 0;
            let mesesDebe = [];

            infoAnio.meses.forEach(m => {
                const p = apo.pagos ? apo.pagos[m] : null;
                if (p?.exonerado) return;
                const montoAbonado = Number(p?.monto || 0);
                if (montoAbonado < cuotaOficial) {
                    deudaTotal += (cuotaOficial - montoAbonado);
                    mesesDebe.push(m);
                }
            });

            if (deudaTotal > 0) {
                try {
                    const destino = apo.email.trim();
                    const bloqueCobroHTML = `
                        <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 20px; margin: 0 0 20px 0;">
                            <p style="margin: 0 0 10px 0; color: #9f1239; font-weight: 700; font-size: 14px;">
                                Estado de Cuenta Pendiente:
                            </p>
                            <p style="margin: 0 0 8px 0; color: #334155; font-size: 13px;">
                                <strong>Monto Total Pendiente:</strong> $${deudaTotal.toLocaleString('es-CL')}
                            </p>
                            <p style="margin: 0; color: #334155; font-size: 13px;">
                                <strong>Meses con saldo:</strong> ${mesesDebe.join(', ')}
                            </p>
                        </div>
                    `;

                    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            service_id: process.env.EMAILJS_SERVICE_ID,
                            template_id: process.env.EMAILJS_TEMPLATE_ID,
                            user_id: process.env.EMAILJS_PUBLIC_KEY,
                            accessToken: process.env.EMAILJS_PRIVATE_KEY,
                            template_params: {
                                to_email: destino,
                                email: destino,
                                reply_to: destino,
                                recipient: destino,
                                to_name: apo.nombre,
                                titulo_cabecera: `Recordatorio de Cuotas - ${infoAnio.nombre_curso || "Curso"}`,
                                mensaje_introduccion: `Estimado/a apoderado/a de ${apo.alumno}, le informamos el saldo registrado a la fecha en el periodo escolar ${anioSel}:`,
                                bloque_contenido: bloqueCobroHTML,
                                pie_mensaje: "Agradecemos regularizar a la brevedad con la directiva de tesorería.",
                                subject: `Aviso de Cuotas Pendientes (${anioSel}) - ${infoAnio.nombre_curso || "Curso"}`
                            }
                        })
                    });

                    if (response.ok) {
                        enviados++;
                    } else {
                        const txt = await response.text();
                        errores.push(`${destino}: ${txt}`);
                    }
                } catch (err) {
                    errores.push(`${apo.email}: ${err.message}`);
                }
            }
        }

        if (enviados === 0 && errores.length > 0) {
            return res.status(500).json({ error: `Fallo al enviar correo: ${errores.join(' | ')}` });
        }

        res.json({ success: true, enviados });
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor al enviar notificaciones." });
    }
});

// 16. Enviar PDF por Correo con resolución de infoAnio y URL en Render
router.post('/curso/admin/enviar-pdf-correo', upload.single('pdf'), async (req, res) => {
    const { anio } = req.body;
    if (!req.file) return res.status(400).json({ error: "No se recibió el documento PDF." });

    try {
        const datos = await dbConfig.leerDatos();
        const anioSel = anio || datos.anio_activo || "2026";
        
        // Declaración segura de infoAnio
        const infoAnio = datos.anios ? datos.anios[anioSel] : null;

        if (!infoAnio) {
            return res.status(404).json({ error: `No existen datos para el año ${anioSel}` });
        }

        const apoderadosConCorreo = (infoAnio.apoderados || [])
            .filter(a => a.activo !== false && a.email && a.email.trim() !== '');

        if (apoderadosConCorreo.length === 0) {
            return res.status(400).json({ error: "No hay correos registrados para recibir el informe." });
        }

        const baseUrl = obtenerUrlPublica(req);
        const pdfPublicUrl = `${baseUrl}/uploads/${req.file.filename}`;

        const bloquePdfHTML = `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 20px 0;">
                <p style="margin: 0 0 16px 0; color: #1e293b; font-weight: 700; font-size: 15px;">
                    El documento oficial en formato PDF está disponible para su descarga:
                </p>
                <div style="margin: 0 0 16px 0;">
                    <a href="${pdfPublicUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px;">
                        📄 Descargar Balance PDF
                    </a>
                </div>
                <p style="margin: 0; color: #64748b; font-size: 11px;">
                    Enlace directo: <a href="${pdfPublicUrl}" style="color: #2563eb; word-break: break-all;">${pdfPublicUrl}</a>
                </p>
            </div>
        `;

        let enviados = 0;
        let errores = [];

        for (const apo of apoderadosConCorreo) {
            try {
                const destino = apo.email.trim();
                const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        service_id: process.env.EMAILJS_SERVICE_ID,
                        template_id: process.env.EMAILJS_TEMPLATE_ID,
                        user_id: process.env.EMAILJS_PUBLIC_KEY,
                        accessToken: process.env.EMAILJS_PRIVATE_KEY,
                        template_params: {
                            to_email: destino,
                            email: destino,
                            reply_to: destino,
                            recipient: destino,
                            to_name: apo.nombre,
                            titulo_cabecera: `Balance General - ${infoAnio.nombre_curso || "Curso"}`,
                            mensaje_introduccion: `Se encuentra disponible el balance financiero y rendición de cuentas del curso correspondiente al periodo escolar ${anioSel}.`,
                            bloque_contenido: bloquePdfHTML,
                            pie_mensaje: "Este informe ha sido emitido y auditado por la directiva de tesorería del curso.",
                            subject: `Balance General Oficial (${anioSel}) - ${infoAnio.nombre_curso || "Curso"}`
                        }
                    })
                });

                if (response.ok) {
                    enviados++;
                } else {
                    const txt = await response.text();
                    errores.push(`${destino}: ${txt}`);
                }
            } catch (err) {
                errores.push(`${apo.email}: ${err.message}`);
            }
        }

        if (enviados === 0 && errores.length > 0) {
            return res.status(500).json({ error: `Fallo al enviar notificación: ${errores.join(' | ')}` });
        }

        res.json({ success: true, destinatarios: enviados, url: pdfPublicUrl });
    } catch (error) {
        res.status(500).json({ error: error.message || "Error al procesar el envío del informe." });
    }
});

// 17. Enviar Bienvenida
router.post('/curso/admin/enviar-correo-bienvenida', async (req, res) => {
    const { anio } = req.body;
    try {
        const datos = await dbConfig.leerDatos();
        const anioSel = anio || datos.anio_activo || "2026";
        const infoAnio = datos.anios ? datos.anios[anioSel] : null;

        if (!infoAnio) return res.status(404).json({ error: `No existen datos para ${anioSel}` });

        const apoderadosConCorreo = (infoAnio.apoderados || [])
            .filter(a => a.activo !== false && a.email && a.email.trim() !== '');

        if (apoderadosConCorreo.length === 0) {
            return res.status(400).json({ error: "No hay correos registrados para enviar la bienvenida." });
        }

        const bloqueBienvenidaHTML = `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 0 0 20px 0;">
                <p style="margin: 0 0 12px 0; color: #1e293b; font-weight: 700; font-size: 14px;">
                    Directiva del Curso (${anioSel}):
                </p>
                <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #334155; font-size: 13px; line-height: 1.6;">
                    <li><strong>Profesor(a) Jefe:</strong> ${infoAnio.profesor || "No asignado"}</li>
                    <li><strong>Presidente(a):</strong> ${infoAnio.presidente || "No asignado"}</li>
                    <li><strong>Tesorero(a):</strong> ${infoAnio.tesorero || "No asignado"}</li>
                    <li><strong>Cuota Mensual Oficial:</strong> $${Number(infoAnio.cuota_mensual || 0).toLocaleString('es-CL')}</li>
                </ul>
                <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; border-radius: 6px;">
                    <p style="margin: 0; color: #1e40af; font-size: 12px; line-height: 1.5;">
                        📌 <strong>Importante:</strong> Por favor guarde esta dirección en sus contactos o márquela como correo deseado. A través de este medio recibirá balances oficiales, estados de cuenta y comprobantes de tesorería.
                    </p>
                </div>
            </div>
        `;

        let enviados = 0;
        let errores = [];

        for (const apo of apoderadosConCorreo) {
            try {
                const destino = apo.email.trim();
                const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        service_id: process.env.EMAILJS_SERVICE_ID,
                        template_id: process.env.EMAILJS_TEMPLATE_ID,
                        user_id: process.env.EMAILJS_PUBLIC_KEY,
                        accessToken: process.env.EMAILJS_PRIVATE_KEY,
                        template_params: {
                            to_email: destino,
                            email: destino,
                            reply_to: destino,
                            recipient: destino,
                            to_name: apo.nombre,
                            titulo_cabecera: `Bienvenida Periodo Escolar ${anioSel} - ${infoAnio.nombre_curso || "Curso"}`,
                            mensaje_introduccion: `Le damos la más cordial bienvenida al año escolar ${anioSel} junto a su pupilo/a ${apo.alumno}.`,
                            bloque_contenido: bloqueBienvenidaHTML,
                            pie_mensaje: "Agradecemos desde ya su compromiso y puntualidad para el correcto funcionamiento de las actividades del curso.",
                            subject: `Bienvenida e Información Oficial - ${infoAnio.nombre_curso || "Curso"} (${anioSel})`
                        }
                    })
                });

                if (response.ok) {
                    enviados++;
                } else {
                    const txt = await response.text();
                    errores.push(`${destino}: ${txt}`);
                }
            } catch (err) {
                errores.push(`${apo.email}: ${err.message}`);
            }
        }

        if (enviados === 0 && errores.length > 0) {
            return res.status(500).json({ error: `Fallo al enviar bienvenidas: ${errores.join(' | ')}` });
        }

        return res.json({ success: true, destinatarios: enviados });
    } catch (error) {
        res.status(500).json({ error: "Error interno al enviar correos de bienvenida." });
    }
});

// 18. Cerrar año
router.post('/curso/admin/cerrar-anio', async (req, res) => {
    try {
        const datos = await dbConfig.leerDatos();
        const anioActual = datos.anio_activo || "2026";
        const infoActual = datos.anios[anioActual];

        if (!infoActual) return res.status(404).json({ error: "Año no encontrado" });
        if (infoActual.cerrado) return res.status(400).json({ error: "Este año ya se encuentra cerrado" });

        const saldoInicial = Number(infoActual.saldo_inicial || 0);
        let totalRecaudado = 0;
        (infoActual.apoderados || []).forEach(apo => {
            (infoActual.meses || []).forEach(m => {
                const p = apo.pagos ? apo.pagos[m] : null;
                if (p && !p.exonerado) totalRecaudado += Number(p.monto || 0);
            });
        });
        const totalGastos = (infoActual.gastos || []).reduce((acc, g) => acc + Number(g.monto || 0), 0);
        const totalIngresos = (infoActual.ingresos_extra || []).reduce((acc, e) => acc + Number(e.monto || 0), 0);
        const saldoRealCaja = saldoInicial + totalRecaudado + totalIngresos - totalGastos;

        infoActual.cerrado = true;

        const siguienteAnio = String(Number(anioActual) + 1);
        if (!datos.anios[siguienteAnio]) {
            const apoderadosMigrados = (infoActual.apoderados || [])
                .filter(a => a.activo !== false)
                .map(a => ({
                    id: a.id,
                    nombre: a.nombre,
                    alumno: a.alumno,
                    email: a.email || '',
                    activo: true,
                    pagos: {}
                }));

            datos.anios[siguienteAnio] = {
                cerrado: false,
                saldo_inicial: saldoRealCaja,
                cuota_mensual: infoActual.cuota_mensual || 21000,
                nombre_curso: infoActual.nombre_curso || "",
                profesor: infoActual.profesor || "",
                presidente: infoActual.presidente || "",
                tesorero: infoActual.tesorero || "",
                meses: infoActual.meses || ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
                apoderados: apoderadosMigrados,
                gastos: [],
                ingresos_extra: []
            };
        } else {
            datos.anios[siguienteAnio].saldo_inicial = saldoRealCaja;
        }

        datos.anio_activo = siguienteAnio;
        await dbConfig.guardarDatos(datos);

        res.json({ 
            success: true, 
            mensaje: `Año ${anioActual} cerrado. Periodo ${siguienteAnio} aperturado con saldo inicial de $${saldoRealCaja.toLocaleString('es-CL')}.`,
            anio_activo: siguienteAnio 
        });
    } catch (error) {
        res.status(500).json({ error: "Error interno al cerrar el año" });
    }
});

// 19. Backup y Restore JSON
router.get('/curso/backup', async (req, res) => {
    try {
        const datos = await dbConfig.leerDatos();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=curso_datos_backup.json');
        res.send(JSON.stringify(datos, null, 2));
    } catch (error) {
        res.status(500).json({ error: "Error al exportar backup" });
    }
});

router.post('/curso/backup/restaurar', async (req, res) => {
    try {
        const nuevosDatos = req.body;
        if (!nuevosDatos || !nuevosDatos.anios) {
            return res.status(400).json({ error: "Estructura JSON inválida." });
        }
        await dbConfig.guardarDatos(nuevosDatos);
        res.json({ success: true, mensaje: "Backup restaurado exitosamente." });
    } catch (error) {
        res.status(500).json({ error: "Error al restaurar backup" });
    }
});

export default router;