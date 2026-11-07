// backend/probar_correo.js
import 'dotenv/config';
import nodemailer from 'nodemailer';

console.log("Comprobando variables de entorno...");
console.log("SMTP_USER:", process.env.SMTP_USER || "NO CONFIGURADO");
console.log("SMTP_PASS:", process.env.SMTP_PASS ? `Definido (${process.env.SMTP_PASS.length} caracteres)` : "NO CONFIGURADO");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function probar() {
    try {
        console.log("Verificando autenticación con Gmail...");
        await transporter.verify();
        console.log(" Autenticación exitosa con los servidores de Google.");

        console.log("Enviando correo de prueba...");
        const info = await transporter.sendMail({
            from: `"Prueba Tesorería" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // Se envía a ti mismo
            subject: "Prueba de conexión SMTP",
            text: "¡Si lees esto, Nodemailer está funcionando al 100%!"
        });

        console.log(" Correo enviado con éxito. ID:", info.messageId);
    } catch (error) {
        console.error(" Error capturado:");
        console.error("Código:", error.code);
        console.error("Comando:", error.command);
        console.error("Mensaje detallado:", error.message);
    }
}

probar();