// backend/services/emailService.js
import nodemailer from 'nodemailer';

// Creamos el transporte usando el servicio predeterminado 'gmail' de Nodemailer
// Esto resuelve automáticamente los puertos y certificados SSL sin bloqueos de firewall
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER, // Tu correo Gmail completo
        pass: process.env.SMTP_PASS  // Contraseña de aplicación de 16 caracteres de Google
    }
});

// Función para verificar la conexión al iniciar o antes de enviar
export const verificarConexionSMTP = async () => {
    try {
        await transporter.verify();
        console.log('✅ Conexión con Gmail SMTP establecida correctamente.');
        return true;
    } catch (error) {
        console.error('❌ Error en autenticación SMTP con Gmail:', error.message);
        return false;
    }
};

// Función para enviar correo de aviso a morosos
export const enviarAvisoMoroso = async ({ emailDestino, nombreApoderado, nombreAlumno, deudaTotal, mesesPendientes, nombreCurso, anio }) => {
    const mailOptions = {
        from: `"Tesorería - ${nombreCurso}" <${process.env.SMTP_USER}>`,
        to: emailDestino,
        subject: `Aviso de Cuotas Pendientes - ${nombreAlumno} (${anio})`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                <h2 style="color: #0f172a; margin-top: 0;">Estado de Cuenta Oficial</h2>
                <p style="color: #334155; font-size: 14px;">Estimado/a <strong>${nombreApoderado}</strong>,</p>
                <p style="color: #475569; font-size: 14px; line-height: 1.5;">
                    Le informamos el estado actual de las mensualidades correspondientes al alumno <strong>${nombreAlumno}</strong> en el curso <strong>${nombreCurso}</strong> para el periodo escolar <strong>${anio}</strong>:
                </p>
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
                    <p style="margin: 0; color: #991b1b; font-size: 16px; font-weight: bold;">
                        Monto total pendiente: $${deudaTotal.toLocaleString('es-CL')}
                    </p>
                    <p style="margin: 6px 0 0 0; color: #7f1d1d; font-size: 13px;">
                        Meses con saldo: <strong>${mesesPendientes.join(', ')}</strong>
                    </p>
                </div>
                <p style="font-size: 12px; color: #64748b; line-height: 1.4;">
                    Por favor, regularice este saldo a la brevedad coordinando con la directiva de tesorería del curso. Si ya realizó el abono recientemente, solicite su actualización en el sistema.
                </p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
                    Mensaje generado automáticamente por el sistema de tesorería del curso.
                </p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

// Función para enviar balance general en PDF
export const enviarBalancePDF = async ({ destinatarios, pdfPath, nombreCurso, anio }) => {
    const mailOptions = {
        from: `"Tesorería - ${nombreCurso}" <${process.env.SMTP_USER}>`,
        to: destinatarios,
        subject: `Informe de Tesorería Oficial (${anio}) - ${nombreCurso}`,
        text: `Estimados apoderados, adjunto encontrarán el informe financiero detallado y balance del curso correspondiente al periodo escolar ${anio}.`,
        attachments: [
            {
                filename: `Informe_Tesoreria_${anio}.pdf`,
                path: pdfPath
            }
        ]
    };

    return transporter.sendMail(mailOptions);
};