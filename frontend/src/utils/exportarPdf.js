// src/utils/exportarPdf.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const obtenerApellidoPaterno = (nombreCompleto = '') => {
    if (!nombreCompleto) return '';
    const partes = nombreCompleto.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].toLowerCase();
    if (partes.length === 2 || partes.length === 3) return partes[1].toLowerCase();
    return partes[partes.length - 2].toLowerCase();
};

export const generarPdfFinanciero = (datos, saldoRealCaja, cuotaOficial) => {
    const doc = new jsPDF();
    const anioActual = datos.anio_activo;

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`Informe Financiero - Curso: ${datos.configuracion.nombre_curso || '4° Medio A'} (${anioActual})`, 14, 15);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Profesor/a: ${datos.configuracion.profesor || 'N/A'} | Presidente/a: ${datos.configuracion.presidente || 'N/A'} | Tesorero/a: ${datos.configuracion.tesorero || 'N/A'}`, 14, 21);
    doc.text(`Saldo Inicial: $${Number(datos.configuracion.saldo_inicial || 0).toLocaleString('es-CL')} | Saldo Caja Actual: $${saldoRealCaja.toLocaleString('es-CL')}`, 14, 27);

    let currentY = 34;

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Relación de Movimientos (Ingresos y Egresos)', 14, currentY);

    const movimientos = [
        ...(datos.gastos || []).map(g => ({ fecha: g.fecha || 'N/A', tipo: 'Egreso', desc: g.titulo, monto: -Number(g.monto) })),
        ...(datos.ingresos_extra || []).map(e => ({ fecha: e.fecha || 'N/A', tipo: 'Ingreso Extra', desc: e.titulo, monto: Number(e.monto) }))
    ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    let saldoAcumulado = Number(datos.configuracion.saldo_inicial || 0);
    const filasMovimientos = movimientos.map(m => {
        saldoAcumulado += m.monto;
        return [
            m.fecha,
            `${m.tipo}: ${m.desc}`,
            m.monto >= 0 ? `+$${m.monto.toLocaleString('es-CL')}` : `-$${Math.abs(m.monto).toLocaleString('es-CL')}`,
            `$${saldoAcumulado.toLocaleString('es-CL')}`
        ];
    });

    autoTable(doc, {
        startY: currentY + 3,
        head: [['Fecha', 'Descripción', 'Monto', 'Saldo Acumulado']],
        body: filasMovimientos.length > 0 ? filasMovimientos : [['-', 'No hay movimientos registrados', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 8 }
    });

    currentY = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.text('2. Estado de Pagos y Saldos por Alumno (Ordenado por Apellido)', 14, currentY);

    const apoderadosOrdenados = [...datos.apoderados].sort((a, b) => 
        obtenerApellidoPaterno(a.alumno).localeCompare(obtenerApellidoPaterno(b.alumno), 'es', { sensitivity: 'base', numeric: true })
    );

    const filasAlumnos = apoderadosOrdenados.map(apo => {
        let totalAbonado = 0;
        let mesesPendientes = 0;
        datos.configuracion.meses.forEach(mes => {
            const p = apo.pagos[mes];
            if (p && p.monto) {
                totalAbonado += Number(p.monto);
                if (!p.pagado) mesesPendientes++;
            } else {
                mesesPendientes++;
            }
        });

        return [
            apo.nombre,
            apo.alumno,
            `$${totalAbonado.toLocaleString('es-CL')}`,
            `${mesesPendientes} meses`,
            `$${(mesesPendientes * cuotaOficial).toLocaleString('es-CL')}`
        ];
    });

    autoTable(doc, {
        startY: currentY + 3,
        head: [['Apoderado', 'Alumno', 'Total Abonos', 'Deuda Pendiente', 'Saldo / Deuda']],
        body: filasAlumnos,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 }
    });

    doc.save(`Relacion_Tesoreria_${anioActual}.pdf`);
};