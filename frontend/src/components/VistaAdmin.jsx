// src/components/VistaAdmin.jsx
import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cursoApi } from '../services/cursoApi';

export default function VistaAdmin({ datos, onActualizar }) {
    const [cargando, setCargando] = useState(false);
    const [enviandoId, setEnviandoId] = useState(null);
    const [notificacion, setNotificacion] = useState(null);
    const [busqueda, setBusqueda] = useState('');

    const anioActivo = datos.anio_activo || "2026";
    const infoConfig = datos.configuracion || {};
    const estaCerrado = Boolean(infoConfig.cerrado);
    const cuotaOficial = Number(infoConfig.cuota_mensual || 21000);
    const saldoInicial = Number(infoConfig.saldo_inicial || 0);
    const meses = infoConfig.meses || ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const aniosDisponibles = datos.aniosDisponibles || ["2024", "2025", "2026"];

    // Estados de edición rápida
    const [cuotaInput, setCuotaInput] = useState(cuotaOficial);
    const [modalSaldo, setModalSaldo] = useState(false);
    const [saldoInput, setSaldoInput] = useState(saldoInicial);

    // Formularios inline
    const [formGasto, setFormGasto] = useState({ 
        titulo: '', 
        mes: 'Marzo', 
        monto: '', 
        fecha: new Date().toISOString().slice(0, 10) 
    });
    const [archivoGasto, setArchivoGasto] = useState(null);

    const [formIngresoExtra, setFormIngresoExtra] = useState({ 
        titulo: '', 
        monto: '', 
        fecha: new Date().toISOString().slice(0, 10) 
    });

    const [formNuevoEstudiante, setFormNuevoEstudiante] = useState({ 
        alumno: '', 
        nombre: '', 
        email: '' 
    });

    // Modales de edición
    const [modalEditarDatos, setModalEditarDatos] = useState(false);
    const [formDatosCurso, setFormDatosCurso] = useState({
        nombre_curso: '', profesor: '', presidente: '', tesorero: ''
    });

    const [modalApoderado, setModalApoderado] = useState(false);
    const [apoderadoEditando, setApoderadoEditando] = useState(null);
    const [formApoderado, setFormApoderado] = useState({ nombre: '', alumno: '', email: '' });

    const [modalPago, setModalPago] = useState(false);
    const [apoderadoPago, setApoderadoPago] = useState(null);
    const [formPago, setFormPago] = useState({ montoEntregado: '', fecha: '', responsable: '' });

    const fileInputRef = useRef(null);
    const fileGastoInputRef = useRef(null);

    useEffect(() => {
        setCuotaInput(cuotaOficial);
        setSaldoInput(saldoInicial);
    }, [cuotaOficial, saldoInicial, anioActivo]);

    const abreviarMes = (m) => m.substring(0, 3).toUpperCase();

    const toast = (msg, tipo = 'success') => {
        setNotificacion({ msg, tipo });
    };

    useEffect(() => {
        if (notificacion) {
            const timer = setTimeout(() => setNotificacion(null), 3500);
            return () => clearTimeout(timer);
        }
    }, [notificacion]);

    // Función precisa para extraer apellido paterno
    const extraerApellidoPaterno = (nombreCompleto = '') => {
        if (!nombreCompleto) return '';
        const partes = nombreCompleto.trim().split(/\s+/);
        if (partes.length === 1) return partes[0].toLowerCase();
        if (partes.length === 2) return partes[1].toLowerCase();
        if (partes.length === 3) return partes[1].toLowerCase();
        return partes[partes.length - 2].toLowerCase();
    };

    // Cálculos financieros: SE EXCLUYEN AUTOMÁTICAMENTE LOS OCULTOS (activo === false)
    let totalRecaudado = 0;
    let totalDeudaPorRecoger = 0;

    (datos.apoderados || []).forEach(apo => {
        if (apo.activo === false) return;
        meses.forEach(m => {
            const p = apo.pagos ? apo.pagos[m] : null;
            if (p?.exonerado) return;
            const monto = Number(p?.monto || 0);
            totalRecaudado += monto;
            totalDeudaPorRecoger += Math.max(0, cuotaOficial - monto);
        });
    });

    const totalGastos = (datos.gastos || []).reduce((acc, g) => acc + Number(g.monto || 0), 0);
    const totalIngresosExtra = (datos.ingresos_extra || []).reduce((acc, e) => acc + Number(e.monto || 0), 0);
    const saldoRealCaja = saldoInicial + totalRecaudado + totalIngresosExtra - totalGastos;

    // Generador PDF ordenado por apellido paterno
    const generarBlobPDF = () => {
        const doc = new jsPDF('landscape');

        doc.setFillColor(11, 17, 32);
        doc.rect(0, 0, 297, 24, 'F');
        doc.setTextColor(0, 208, 132);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Balance General Oficial — ${infoConfig.nombre_curso || "Curso"} (${anioActivo})`, 14, 11);

        doc.setFontSize(8.5);
        doc.setTextColor(203, 213, 225);
        doc.setFont('helvetica', 'normal');
        doc.text(
            `Profesor/a: ${infoConfig.profesor || "-"}   |   Presidente/a: ${infoConfig.presidente || "-"}   |   Tesorero/a: ${infoConfig.tesorero || "-"}   |   Cuota Mensual: $${cuotaOficial.toLocaleString('es-CL')}`,
            14,
            18
        );

        const apoderadosOrdenadosPDF = [...(datos.apoderados || [])]
            .filter(a => a.activo !== false)
            .sort((a, b) => {
                const apA = extraerApellidoPaterno(a.alumno);
                const apB = extraerApellidoPaterno(b.alumno);
                return apA.localeCompare(apB, 'es', { sensitivity: 'base', numeric: true });
            });

        const headCuotas = [['#', 'Estudiante', 'Apoderado', ...meses, 'Total a Pagar']];
        const bodyCuotas = apoderadosOrdenadosPDF.map((apo, idx) => {
            let totalAbonado = 0;
            const filaMeses = meses.map(m => {
                const p = apo.pagos ? apo.pagos[m] : null;
                if (p?.exonerado) return 'Exon.';
                const monto = Number(p?.monto || 0);
                totalAbonado += monto;
                return monto > 0 ? `$${monto.toLocaleString('es-CL')}` : '-';
            });

            const deudaApo = Math.max(0, (meses.length * cuotaOficial) - totalAbonado);
            const textoDeuda = deudaApo > 0 ? `$${deudaApo.toLocaleString('es-CL')}` : '$0';

            return [idx + 1, apo.alumno, apo.nombre, ...filaMeses, { content: textoDeuda, deuda: deudaApo }];
        });

        autoTable(doc, {
            head: headCuotas,
            body: bodyCuotas,
            startY: 28,
            theme: 'grid',
            styles: { 
                fontSize: 7, 
                cellPadding: 1.8,
                textColor: [15, 23, 42],
                lineColor: [203, 213, 225],
                lineWidth: 0.1
            },
            headStyles: { 
                fillColor: [15, 23, 42], 
                textColor: [255, 255, 255], 
                fontStyle: 'bold',
                halign: 'center'
            },
            alternateRowStyles: { 
                fillColor: [226, 232, 240]
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === headCuotas[0].length - 1) {
                    const cellData = data.row.raw[headCuotas[0].length - 1];
                    if (cellData && cellData.deuda > 0) {
                        data.cell.styles.textColor = [225, 29, 72];
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.textColor = [5, 150, 105];
                        data.cell.styles.fontStyle = 'bold';
                    }
                    data.cell.styles.halign = 'right';
                }
            },
            margin: { left: 14, right: 14 }
        });

        let finalY = doc.lastAutoTable.finalY + 8;
        if (finalY > 135) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(244, 63, 94);
        doc.text(`Relación de Gastos (${anioActivo})`, 14, finalY);

        const headGastos = [['Fecha', 'Mes Contable', 'Descripción / Concepto', 'Monto']];
        const bodyGastos = (datos.gastos && datos.gastos.length > 0)
            ? datos.gastos.map(g => [g.fecha, g.mes, g.titulo, `$${Number(g.monto).toLocaleString('es-CL')}`])
            : [['-', '-', 'No se registran gastos en este periodo', '$0']];

        bodyGastos.push([
            { content: 'TOTAL EGRESOS EJECUTADOS', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fillColor: [254, 226, 226] } },
            { content: `$${totalGastos.toLocaleString('es-CL')}`, styles: { fontStyle: 'bold', textColor: [225, 29, 72], fillColor: [254, 226, 226] } }
        ]);

        autoTable(doc, {
            head: headGastos,
            body: bodyGastos,
            startY: finalY + 3,
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 2, textColor: [15, 23, 42] },
            headStyles: { fillColor: [244, 63, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [254, 242, 242] },
            margin: { left: 14, right: 14 }
        });

        let cardsY = doc.lastAutoTable.finalY + 8;
        if (cardsY > 165) {
            doc.addPage();
            cardsY = 20;
        }

        const anchoPagina = 269;
        const gap = 3;
        const totalCards = 6;
        const cardW = (anchoPagina - (gap * (totalCards - 1))) / totalCards;
        const cardH = 17;

        const cardsData = [
            { titulo: 'Saldo Anterior', valor: `$${saldoInicial.toLocaleString('es-CL')}`, bg: [241, 245, 249], text: [15, 23, 42] },
            { titulo: 'Cuotas Recaudadas', valor: `+$${totalRecaudado.toLocaleString('es-CL')}`, bg: [236, 253, 245], text: [5, 150, 105] },
            { titulo: 'Ingresos Extra', valor: `+$${totalIngresosExtra.toLocaleString('es-CL')}`, bg: [240, 249, 255], text: [2, 132, 199] },
            { titulo: 'Total Egresos', valor: `-$${totalGastos.toLocaleString('es-CL')}`, bg: [255, 241, 242], text: [225, 29, 72] },
            { titulo: 'Deuda por Recoger', valor: `$${totalDeudaPorRecoger.toLocaleString('es-CL')}`, bg: [254, 243, 199], text: [217, 119, 6] },
            { titulo: 'Saldo Real en Caja', valor: `$${saldoRealCaja.toLocaleString('es-CL')}`, bg: [15, 23, 42], text: [0, 208, 132], border: true }
        ];

        cardsData.forEach((c, i) => {
            const x = 14 + (i * (cardW + gap));
            doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
            doc.setDrawColor(203, 213, 225);
            doc.roundedRect(x, cardsY, cardW, cardH, 2, 2, 'FD');

            if (c.border) {
                doc.setDrawColor(0, 208, 132);
                doc.setLineWidth(0.4);
                doc.roundedRect(x, cardsY, cardW, cardH, 2, 2, 'D');
            }

            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(c.border ? 148 : 100, c.border ? 163 : 116, c.border ? 184 : 139);
            doc.text(c.titulo, x + (cardW / 2), cardsY + 5.5, { align: 'center' });

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(c.text[0], c.text[1], c.text[2]);
            doc.text(c.valor, x + (cardW / 2), cardsY + 12.5, { align: 'center' });
        });

        return doc.output('blob');
    };

    const handleSoloDescargarPDF = () => {
        try {
            const pdfBlob = generarBlobPDF();
            const urlBlob = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = urlBlob;
            a.download = `Balance_${anioActivo}_Oficial.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(urlBlob);
            toast("📄 PDF descargado en tu dispositivo.");
        } catch (error) {
            toast("Error al generar PDF local", 'error');
        }
    };

    const handleEnviarPDFPorCorreo = async () => {
        try {
            setCargando(true);
            const pdfBlob = generarBlobPDF();
            const formData = new FormData();
            formData.append('pdf', pdfBlob, `balance-${anioActivo}.pdf`);
            formData.append('anio', anioActivo);

            const res = await cursoApi.enviarPdfCorreo(formData);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fallo al enviar correo");

            toast(`✉️ Balance enviado a ${data.destinatarios} apoderados.`);
        } catch (error) {
            toast(`❌ ${error.message}`, 'error');
        } finally {
            setCargando(false);
        }
    };

    const handleNotificarMorosos = async (apoderadoId = null, nombreApo = '') => {
        try {
            if (apoderadoId) setEnviandoId(apoderadoId);
            else setCargando(true);

            const res = await cursoApi.enviarCorreoMorosos(apoderadoId, anioActivo);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fallo en el envío");

            if (nombreApo) toast(`📧 Aviso enviado a ${nombreApo}.`);
            else toast(`📧 Notificaciones enviadas a morosos.`);
        } catch (error) {
            toast(`❌ ${error.message}`, 'error');
        } finally {
            setEnviandoId(null);
            setCargando(false);
        }
    };

    const handleGuardarCuota = async (e) => {
        e.preventDefault();
        if (estaCerrado) return toast("Año cerrado: no admite cambios.", 'error');
        try {
            setCargando(true);
            await cursoApi.actualizarConfiguracion({ cuota_mensual: Number(cuotaInput), anio: anioActivo });
            onActualizar(anioActivo);
            toast("Cuota actualizada.");
        } catch (error) {
            toast("Error al actualizar cuota", 'error');
        } finally {
            setCargando(false);
        }
    };

    const handleRegistrarGasto = async (e) => {
        e.preventDefault();
        if (estaCerrado) return toast("Año cerrado: no admite cambios.", 'error');
        try {
            setCargando(true);
            const formData = new FormData();
            formData.append('titulo', formGasto.titulo);
            formData.append('mes', formGasto.mes);
            formData.append('monto', formGasto.monto);
            formData.append('fecha', formGasto.fecha);
            formData.append('anio', anioActivo);
            if (archivoGasto) formData.append('comprobante', archivoGasto);

            await cursoApi.registrarGasto(formData);
            setFormGasto({ titulo: '', mes: 'Marzo', monto: '', fecha: new Date().toISOString().slice(0, 10) });
            setArchivoGasto(null);
            if (fileGastoInputRef.current) fileGastoInputRef.current.value = "";
            onActualizar(anioActivo);
            toast("Gasto registrado.");
        } catch (error) {
            toast("Error al registrar gasto", 'error');
        } finally {
            setCargando(false);
        }
    };

    const handleRegistrarIngresoExtra = async (e) => {
        e.preventDefault();
        if (estaCerrado) return toast("Año cerrado: no admite cambios.", 'error');
        try {
            setCargando(true);
            await cursoApi.registrarIngresoExtra({ ...formIngresoExtra, monto: Number(formIngresoExtra.monto), anio: anioActivo });
            setFormIngresoExtra({ titulo: '', monto: '', fecha: new Date().toISOString().slice(0, 10) });
            onActualizar(anioActivo);
            toast("Ingreso extra registrado.");
        } catch (error) {
            toast("Error al registrar ingreso extra", 'error');
        } finally {
            setCargando(false);
        }
    };

    const handleAgregarEstudiante = async (e) => {
        e.preventDefault();
        if (estaCerrado) return toast("Año cerrado: no admite cambios.", 'error');
        try {
            setCargando(true);
            await cursoApi.agregarApoderado({ ...formNuevoEstudiante, anio: anioActivo });
            setFormNuevoEstudiante({ alumno: '', nombre: '', email: '' });
            onActualizar(anioActivo);
            toast("Estudiante agregado exitosamente.");
        } catch (error) {
            toast("Error al agregar estudiante", 'error');
        } finally {
            setCargando(false);
        }
    };

    const handleCerrarAnio = async () => {
        if (estaCerrado) return toast("Este año ya está cerrado.", 'error');
        if (!confirm(`¿Cerrar el año escolar ${anioActivo}? Se trasladará el saldo a ${Number(anioActivo) + 1}.`)) return;
        try {
            setCargando(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/curso/admin/cerrar-anio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast(data.mensaje);
            onActualizar(data.anio_activo);
        } catch (error) {
            toast(error.message, 'error');
        } finally {
            setCargando(false);
        }
    };

    // Ordenar por Apellido Paterno
    const apoderadosFiltrados = (datos.apoderados || [])
        .filter(a => 
            a.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
            a.alumno.toLowerCase().includes(busqueda.toLowerCase())
        )
        .sort((a, b) => {
            const apA = extraerApellidoPaterno(a.alumno);
            const apB = extraerApellidoPaterno(b.alumno);
            return apA.localeCompare(apB, 'es', { sensitivity: 'base', numeric: true });
        });

    return (
        <div className="space-y-6 font-sans text-slate-100">
            {/* NOTIFICACIÓN AUTOMÁTICA */}
            {notificacion && (
                <div className={`p-4 rounded-xl text-xs font-bold shadow-2xl border transition-all duration-300 ${
                    notificacion.tipo === 'error' 
                        ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' 
                        : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                }`}>
                    <span>{notificacion.msg}</span>
                </div>
            )}

            {/* BARRA SUPERIOR DE ACCIONES */}
            <div className="bg-[#0b1120] border border-[#162035] p-4 rounded-2xl shadow-xl flex flex-wrap gap-2.5 items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleSoloDescargarPDF}
                        disabled={cargando}
                        className="bg-[#00c5ff] hover:bg-[#00b0e6] text-[#070b14] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                    >
                        <i className="fa-solid fa-file-pdf"></i>
                        <span>Descargar PDF</span>
                    </button>

                    <button
                        onClick={handleEnviarPDFPorCorreo}
                        disabled={cargando}
                        className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                    >
                        <i className="fa-solid fa-paper-plane"></i>
                        <span>Enviar PDF por Correo</span>
                    </button>

                    <button
                        onClick={() => window.open(cursoApi.backupUrl(), '_blank')}
                        className="bg-[#0f172a] hover:bg-[#1e293b] text-slate-300 border border-[#1e293b] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                        <i className="fa-solid fa-download"></i>
                        <span>Backup .json</span>
                    </button>

                    <input
                        type="file"
                        accept=".json"
                        ref={fileInputRef}
                        onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = async (ev) => {
                                try {
                                    setCargando(true);
                                    await cursoApi.restaurarBackup(ev.target.result);
                                    onActualizar(anioActivo);
                                    toast("Tesorería restaurada exitosamente.");
                                } catch (err) {
                                    toast("Fallo al restaurar backup", 'error');
                                } finally {
                                    setCargando(false);
                                }
                            };
                            reader.readAsText(file);
                        }}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current.click()}
                        disabled={cargando}
                        className="bg-[#0f172a] hover:bg-[#1e293b] text-slate-300 border border-[#1e293b] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                        <i className="fa-solid fa-upload"></i>
                        <span>Restaurar</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCerrarAnio}
                        disabled={estaCerrado}
                        className="bg-[#d97706]/20 hover:bg-[#d97706]/30 text-[#f59e0b] border border-[#d97706]/40 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                    >
                        <i className="fa-solid fa-lock"></i>
                        <span>Cerrar Año Escolar</span>
                    </button>

                    <button
                        onClick={() => {
                            if (confirm("¿Deseas restablecer los valores de prueba?")) {
                                toast("Función de reseteo ejecutada.");
                            }
                        }}
                        className="bg-[#e11d48]/15 hover:bg-[#e11d48]/25 text-[#f43f5e] border border-[#e11d48]/30 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                        <i className="fa-solid fa-trash-can"></i>
                        <span>Reset</span>
                    </button>
                </div>
            </div>

            {/* DATOS GENERALES DEL CURSO */}
            <div className="bg-[#0b1120] border border-[#162035] p-5 rounded-2xl shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-[#162035] pb-3">
                    <h3 className="text-sm font-bold text-[#00c5ff] flex items-center gap-2">
                        <i className="fa-solid fa-id-card"></i> Datos Generales del Curso
                    </h3>
                    {!estaCerrado && (
                        <button 
                            onClick={() => {
                                setFormDatosCurso({
                                    nombre_curso: infoConfig.nombre_curso || '',
                                    profesor: infoConfig.profesor || '',
                                    presidente: infoConfig.presidente || '',
                                    tesorero: infoConfig.tesorero || ''
                                });
                                setModalEditarDatos(true);
                            }}
                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <i className="fa-solid fa-pen-to-square"></i>
                            <span>Editar Datos</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Curso:</span>
                        <span className="text-sm font-bold text-white">{infoConfig.nombre_curso || '8° Básico B'}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Profesor/a:</span>
                        <span className="text-sm font-bold text-[#00d084]">{infoConfig.profesor || 'Aylin Chong'}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Presidente/a:</span>
                        <span className="text-sm font-bold text-[#00c5ff]">{infoConfig.presidente || 'Ingrid Brito'}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Tesorero/a:</span>
                        <span className="text-sm font-bold text-[#f59e0b]">{infoConfig.tesorero || 'Natalya Zakharova'}</span>
                    </div>
                </div>
            </div>

            {/* PANEL DE ADMINISTRACIÓN */}
            <div className="bg-[#0b1120] border border-[#162035] p-5 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <i className="fa-solid fa-lock text-[#00d084]"></i> Panel de Administración ({anioActivo})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Control de finanzas, mensualidades e historial del curso.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <form onSubmit={handleGuardarCuota} className="flex items-center gap-1.5 bg-[#070b14] border border-[#162035] px-3 py-1.5 rounded-xl">
                        <span className="text-xs text-slate-400">Cuota:</span>
                        <input 
                            type="number" 
                            disabled={estaCerrado}
                            value={cuotaInput} 
                            onChange={(e) => setCuotaInput(e.target.value)}
                            className="w-20 bg-transparent text-[#00d084] font-bold font-mono outline-none text-xs ml-0.5 focus:bg-[#162035] px-1 rounded" 
                        />
                        {!estaCerrado && (
                            <button 
                                type="submit"
                                className="bg-[#00d084] hover:bg-[#00b572] text-[#070b14] text-[10px] font-bold px-2 py-0.5 rounded-lg transition ml-1 cursor-pointer"
                            >
                                OK
                            </button>
                        )}
                    </form>

                    <div className="flex items-center gap-1.5 bg-[#070b14] border border-[#162035] px-3 py-1.5 rounded-xl">
                        <span className="text-xs text-slate-400">Año:</span>
                        <select 
                            value={anioActivo}
                            onChange={(e) => onActualizar(e.target.value)}
                            className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
                        >
                            {aniosDisponibles.map(a => <option key={a} value={a} className="bg-[#0b1120]">{a}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-[#070b14] border border-[#162035] px-3.5 py-1.5 rounded-xl">
                        <div>
                            <span className="text-[9px] text-slate-400 block leading-tight">Saldo Inicial</span>
                            <span className="text-xs font-bold text-[#00d084] font-mono leading-tight">${saldoInicial.toLocaleString('es-CL')}</span>
                        </div>
                        {!estaCerrado && (
                            <button 
                                onClick={() => setModalSaldo(true)}
                                className="text-slate-400 hover:text-white transition cursor-pointer"
                            >
                                <i className="fa-solid fa-pen text-xs"></i>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* BALANCE GENERAL Y FLUJO DE CAJA (EXCLUYE AUTOMÁTICAMENTE OCULTOS) */}
            <div className="bg-[#0b1120] border border-[#162035] p-5 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-[#00d084] flex items-center gap-2">
                    <i className="fa-solid fa-scale-balanced"></i> Balance General y Flujo de Caja ({anioActivo})
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-medium block mb-1">Saldo Anterior</span>
                        <span className="text-base font-bold text-white tracking-tight">${saldoInicial.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-medium block mb-1">Cuotas</span>
                        <span className="text-base font-bold text-[#00d084] tracking-tight">${totalRecaudado.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-medium block mb-1">Ingresos Extra</span>
                        <span className="text-base font-bold text-[#00c5ff] tracking-tight">${totalIngresosExtra.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-medium block mb-1">Gastos</span>
                        <span className="text-base font-bold text-[#f43f5e] tracking-tight">${totalGastos.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#00d084]/40 p-3 rounded-xl">
                        <span className="text-[10px] text-[#00d084] font-semibold block mb-1">Saldo Real</span>
                        <span className="text-lg font-black text-[#00d084] tracking-tight">${saldoRealCaja.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#f59e0b] p-3 rounded-xl shadow-lg shadow-[#f59e0b]/5">
                        <span className="text-[10px] text-[#f59e0b] font-bold block mb-1">Deuda por Recoger</span>
                        <span className="text-lg font-black text-[#f59e0b] tracking-tight">${totalDeudaPorRecoger.toLocaleString('es-CL')}</span>
                    </div>
                </div>
            </div>

            {/* RESUMEN FINANCIERO POR ESTUDIANTE (EXCLUYE OCULTOS) */}
            <div className="bg-[#0b1120] border border-[#162035] rounded-2xl shadow-xl overflow-hidden">
                <div className="p-4 border-b border-[#162035] flex justify-between items-center bg-[#070b14]/50">
                    <h3 className="text-sm font-bold text-[#00c5ff] flex items-center gap-2">
                        <i className="fa-solid fa-chart-pie"></i> Resumen Financiero por Estudiante
                    </h3>
                    <button
                        onClick={() => handleNotificarMorosos(null)}
                        disabled={cargando}
                        className="bg-[#f59e0b] hover:bg-[#d97706] text-[#070b14] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                    >
                        <i className="fa-solid fa-envelope"></i>
                        <span>Notificar a Todos los Morosos</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#070b14] text-slate-400 font-semibold border-b border-[#162035]">
                            <tr>
                                <th className="p-3">Estudiante (Alumno)</th>
                                <th className="p-3">Apoderado / Correo</th>
                                <th className="p-3 text-center">Total Recaudado</th>
                                <th className="p-3 text-center">Meses Pendientes</th>
                                <th className="p-3 text-center">Deuda Estimada</th>
                                <th className="p-3 text-center">Aviso</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#162035]">
                            {apoderadosFiltrados.filter(a => a.activo !== false).map(apo => {
                                let recaudadoApo = 0;
                                let mesesPendientes = 0;

                                meses.forEach(m => {
                                    const p = apo.pagos ? apo.pagos[m] : null;
                                    if (p?.exonerado) return;
                                    const monto = Number(p?.monto || 0);
                                    recaudadoApo += monto;
                                    if (monto < cuotaOficial) mesesPendientes++;
                                });

                                const deudaEstimada = Math.max(0, (meses.length * cuotaOficial) - recaudadoApo);

                                return (
                                    <tr key={apo.id} className="hover:bg-[#070b14]/40 transition">
                                        <td className="p-3 font-bold text-white text-sm">
                                            {apo.alumno}
                                        </td>
                                        <td className="p-3">
                                            <div className="text-slate-300 font-medium">{apo.nombre}</div>
                                            <div className="text-slate-500 text-[11px] font-mono">
                                                {apo.email || 'Sin correo'}
                                            </div>
                                        </td>
                                        <td className="p-3 text-center font-bold text-[#00d084]">
                                            ${recaudadoApo.toLocaleString('es-CL')}
                                        </td>
                                        <td className="p-3 text-center font-bold text-[#f59e0b]">
                                            {mesesPendientes} meses
                                        </td>
                                        <td className="p-3 text-center font-bold text-[#f43f5e]">
                                            ${deudaEstimada.toLocaleString('es-CL')}
                                        </td>
                                        <td className="p-3 text-center">
                                            {deudaEstimada > 0 && apo.email ? (
                                                <button
                                                    onClick={() => handleNotificarMorosos(apo.id, apo.nombre)}
                                                    disabled={enviandoId === apo.id}
                                                    title={`Enviar aviso a ${apo.nombre}`}
                                                    className="text-[#f59e0b] hover:text-[#fbbf24] transition cursor-pointer"
                                                >
                                                    <i className="fa-solid fa-paper-plane"></i>
                                                </button>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FORMULARIOS EN LÍNEA: REGISTRAR GASTO, INGRESO EXTRA Y AGREGAR ESTUDIANTE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="bg-[#0b1120] border border-[#162035] rounded-2xl p-5 shadow-xl space-y-4">
                    <h3 className="text-sm font-bold text-[#f43f5e] flex items-center gap-2">
                        <i className="fa-solid fa-receipt"></i> Registrar Gasto
                    </h3>
                    <form onSubmit={handleRegistrarGasto} className="space-y-3">
                        <input 
                            type="text" 
                            required 
                            placeholder="Descripción..." 
                            value={formGasto.titulo}
                            onChange={(e) => setFormGasto({ ...formGasto, titulo: e.target.value })}
                            className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <select 
                                value={formGasto.mes} 
                                onChange={(e) => setFormGasto({ ...formGasto, mes: e.target.value })}
                                className="bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white"
                            >
                                {meses.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <input 
                                type="number" 
                                required 
                                placeholder="Monto" 
                                value={formGasto.monto}
                                onChange={(e) => setFormGasto({ ...formGasto, monto: e.target.value })}
                                className="bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                            />
                        </div>
                        <input 
                            type="date" 
                            value={formGasto.fecha}
                            onChange={(e) => setFormGasto({ ...formGasto, fecha: e.target.value })}
                            className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                        />
                        <div>
                            <span className="text-[10px] text-slate-400 block mb-1">Adjuntar Recibo (Opcional)</span>
                            <input 
                                type="file" 
                                ref={fileGastoInputRef}
                                accept="image/*,.pdf"
                                onChange={(e) => setArchivoGasto(e.target.files[0] || null)}
                                className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:bg-[#162035] file:text-slate-300" 
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={cargando}
                            className="w-full bg-[#f43f5e] hover:bg-[#e11d48] text-white font-bold py-2.5 rounded-xl text-xs transition shadow cursor-pointer"
                        >
                            Registrar Gasto
                        </button>
                    </form>
                </div>

                <div className="bg-[#0b1120] border border-[#162035] rounded-2xl p-5 shadow-xl space-y-4">
                    <h3 className="text-sm font-bold text-[#00d084] flex items-center gap-2">
                        <i className="fa-solid fa-coins"></i> Ingreso Extra
                    </h3>
                    <form onSubmit={handleRegistrarIngresoExtra} className="space-y-3">
                        <input 
                            type="text" 
                            required 
                            placeholder="Concepto..." 
                            value={formIngresoExtra.titulo}
                            onChange={(e) => setFormIngresoExtra({ ...formIngresoExtra, titulo: e.target.value })}
                            className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                        />
                        <input 
                            type="number" 
                            required 
                            placeholder="Monto" 
                            value={formIngresoExtra.monto}
                            onChange={(e) => setFormIngresoExtra({ ...formIngresoExtra, monto: e.target.value })}
                            className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                        />
                        <input 
                            type="date" 
                            value={formIngresoExtra.fecha}
                            onChange={(e) => setFormIngresoExtra({ ...formIngresoExtra, fecha: e.target.value })}
                            className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                        />
                        <div className="pt-7">
                            <button 
                                type="submit" 
                                disabled={cargando}
                                className="w-full bg-[#00d084] hover:bg-[#00b572] text-[#070b14] font-bold py-2.5 rounded-xl text-xs transition shadow cursor-pointer"
                            >
                                Registrar Ingreso
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-[#0b1120] border border-[#162035] rounded-2xl p-5 shadow-xl space-y-4">
                    <h3 className="text-sm font-bold text-[#00c5ff] flex items-center gap-2">
                        <i className="fa-solid fa-user-plus"></i> Agregar Estudiante / Apoderado
                    </h3>
                    <form onSubmit={handleAgregarEstudiante} className="space-y-3">
                        <input 
                            type="text" 
                            required 
                            placeholder="Nombre Alumno..." 
                            value={formNuevoEstudiante.alumno}
                            onChange={(e) => setFormNuevoEstudiante({ ...formNuevoEstudiante, alumno: e.target.value })}
                            className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                        />
                        <input 
                            type="text" 
                            required 
                            placeholder="Nombre Apoderado..." 
                            value={formNuevoEstudiante.nombre}
                            onChange={(e) => setFormNuevoEstudiante({ ...formNuevoEstudiante, nombre: e.target.value })}
                            className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                        />
                        <input 
                            type="email" 
                            placeholder="Correo electrónico..." 
                            value={formNuevoEstudiante.email}
                            onChange={(e) => setFormNuevoEstudiante({ ...formNuevoEstudiante, email: e.target.value })}
                            className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                        />
                        <div className="pt-7">
                            <button 
                                type="submit" 
                                disabled={cargando}
                                className="w-full bg-[#00c5ff] hover:bg-[#00b0e6] text-[#070b14] font-bold py-2.5 rounded-xl text-xs transition shadow cursor-pointer"
                            >
                                Agregar
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* TABLAS INFERIORES: RELACIÓN DE GASTOS Y RELACIÓN DE INGRESOS EXTRA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-[#0b1120] border border-[#162035] p-5 rounded-2xl shadow-xl space-y-3">
                    <h3 className="text-sm font-bold text-[#f43f5e] flex items-center gap-2">
                        <i className="fa-solid fa-receipt"></i> Relación de Gastos
                    </h3>
                    <div className="overflow-x-auto max-h-56 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#070b14] text-slate-400 border-b border-[#162035]">
                                <tr>
                                    <th className="p-2">Fecha</th>
                                    <th className="p-2">Descripción</th>
                                    <th className="p-2 text-right">Monto</th>
                                    <th className="p-2 text-center">Recibo</th>
                                    <th className="p-2 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#162035] text-slate-300">
                                {(datos.gastos || []).map(g => (
                                    <tr key={g.id} className="hover:bg-[#070b14]/50">
                                        <td className="p-2 font-mono text-[10px] text-slate-400">{g.fecha}</td>
                                        <td className="p-2 font-semibold text-white">{g.titulo}</td>
                                        <td className="p-2 text-right font-bold text-[#f43f5e]">${Number(g.monto).toLocaleString('es-CL')}</td>
                                        <td className="p-2 text-center">
                                            {g.comprobante ? (
                                                <a href={g.comprobante} target="_blank" rel="noreferrer" className="text-[#00c5ff] hover:underline text-[10px]">
                                                    Ver 📎
                                                </a>
                                            ) : '-'}
                                        </td>
                                        <td className="p-2 text-center">
                                            {!estaCerrado && (
                                                <button 
                                                    onClick={async () => {
                                                        if (confirm(`¿Eliminar gasto "${g.titulo}"?`)) {
                                                            await cursoApi.eliminarGasto(g.id, anioActivo);
                                                            onActualizar(anioActivo);
                                                            toast("Gasto eliminado.");
                                                        }
                                                    }}
                                                    className="text-slate-500 hover:text-rose-400 cursor-pointer"
                                                >
                                                    <i className="fa-solid fa-trash-can text-xs"></i>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-[#0b1120] border border-[#162035] p-5 rounded-2xl shadow-xl space-y-3">
                    <h3 className="text-sm font-bold text-[#00d084] flex items-center gap-2">
                        <i className="fa-solid fa-coins"></i> Relación de Ingresos Extra
                    </h3>
                    <div className="overflow-x-auto max-h-56 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#070b14] text-slate-400 border-b border-[#162035]">
                                <tr>
                                    <th className="p-2">Fecha</th>
                                    <th className="p-2">Concepto</th>
                                    <th className="p-2 text-right">Monto</th>
                                    <th className="p-2 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#162035] text-slate-300">
                                {(datos.ingresos_extra || []).map(e => (
                                    <tr key={e.id} className="hover:bg-[#070b14]/50">
                                        <td className="p-2 font-mono text-[10px] text-slate-400">{e.fecha}</td>
                                        <td className="p-2 font-semibold text-white">{e.titulo}</td>
                                        <td className="p-2 text-right font-bold text-[#00d084]">${Number(e.monto).toLocaleString('es-CL')}</td>
                                        <td className="p-2 text-center">
                                            {!estaCerrado && (
                                                <button 
                                                    onClick={async () => {
                                                        if (confirm(`¿Eliminar ingreso "${e.titulo}"?`)) {
                                                            await cursoApi.eliminarIngresoExtra(e.id, anioActivo);
                                                            onActualizar(anioActivo);
                                                            toast("Ingreso eliminado.");
                                                        }
                                                    }}
                                                    className="text-slate-500 hover:text-rose-400 cursor-pointer"
                                                >
                                                    <i className="fa-solid fa-trash-can text-xs"></i>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* GESTIÓN DE PAGOS MENSUALES: CARDS ANCHAS Y EQUILIBRADAS */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1">
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-money-check-dollar text-[#00c5ff]"></i>
                        <h3 className="text-sm font-bold text-white tracking-wide">
                            Gestión de Pagos Mensuales
                        </h3>
                        <span className="bg-[#00c5ff]/15 border border-[#00c5ff]/30 text-[#00c5ff] text-[10px] font-bold px-2.5 py-0.5 rounded-full ml-1">
                            {apoderadosFiltrados.length} Estudiantes
                        </span>
                    </div>

                    <div className="w-full sm:w-auto">
                        <input 
                            type="text" 
                            placeholder="Buscar estudiante o apoderado..." 
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="bg-[#0b1120] border border-[#162035] rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00c5ff] w-full sm:w-64"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {apoderadosFiltrados.map(apo => {
                        let totalAbonado = 0;
                        let deudaEstudiante = 0;

                        meses.forEach(m => {
                            const p = apo.pagos ? apo.pagos[m] : null;
                            if (p?.exonerado) return;
                            const monto = Number(p?.monto || 0);
                            totalAbonado += monto;
                            deudaEstudiante += Math.max(0, cuotaOficial - monto);
                        });

                        const alDia = deudaEstudiante === 0;
                        const esOculto = apo.activo === false;

                        return (
                            <div 
                                key={apo.id}
                                className={`bg-[#0b1120] border border-[#162035] rounded-2xl p-5 md:p-6 shadow-xl flex flex-col xl:flex-row justify-start items-start xl:items-center gap-6 min-h-[145px] transition duration-200 ${
                                    esOculto 
                                        ? 'opacity-35 grayscale border-dashed border-slate-700 bg-[#070b14]' 
                                        : 'hover:border-[#223150]'
                                }`}
                            >
                                {/* Lado Izquierdo: Datos y Botones (ancho equilibrado para eliminar espacio vacío) */}
                                <div className="space-y-3 w-full xl:w-72 flex-shrink-0">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <i className="fa-solid fa-graduation-cap text-[#00c5ff] text-base"></i>
                                            <h4 className="text-base font-bold text-white tracking-wide">
                                                {apo.alumno} {esOculto && <span className="text-xs text-amber-400 font-normal ml-1">(Oculto)</span>}
                                            </h4>
                                            {!estaCerrado && (
                                                <button 
                                                    onClick={() => {
                                                        setApoderadoEditando(apo);
                                                        setFormApoderado({ nombre: apo.nombre, alumno: apo.alumno, email: apo.email || '' });
                                                        setModalApoderado(true);
                                                    }}
                                                    className="text-slate-400 hover:text-white transition ml-1 cursor-pointer"
                                                >
                                                    <i className="fa-solid fa-pen-to-square text-xs"></i>
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Apoderado: <span className="text-slate-300 font-medium">{apo.nombre}</span>
                                        </p>
                                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                            {apo.email || 'Sin correo registrado'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        {alDia ? (
                                            <span className="bg-blue-600/20 border border-blue-500/40 text-blue-400 px-4 py-2 rounded-xl text-xs font-bold tracking-wide shadow">
                                                Al Día ✓
                                            </span>
                                        ) : (
                                            !estaCerrado && (
                                                <button
                                                    onClick={() => {
                                                        setApoderadoPago(apo);
                                                        setFormPago({
                                                            montoEntregado: '',
                                                            fecha: new Date().toISOString().slice(0, 10),
                                                            responsable: apo.nombre
                                                        });
                                                        setModalPago(true);
                                                    }}
                                                    className="bg-[#00d084] hover:bg-[#00b572] text-[#070b14] font-bold py-2 px-4 rounded-xl text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    Registrar Pago
                                                </button>
                                            )
                                        )}

                                        {!estaCerrado && (
                                            <>
                                                <button
                                                    onClick={async () => {
                                                        await cursoApi.cambiarEstadoApoderado(apo.id, apo.activo === false, anioActivo);
                                                        onActualizar(anioActivo);
                                                        toast(apo.activo === false ? "Estudiante reactivado y sumado a saldos." : "Estudiante ocultado y restado de saldos.");
                                                    }}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                                                        esOculto 
                                                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50' 
                                                            : 'bg-[#070b14] hover:bg-[#162035] border-[#1e293b] text-[#f59e0b]'
                                                    }`}
                                                >
                                                    {apo.activo === false ? 'Mostrar' : 'Ocultar'}
                                                </button>

                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`¿Eliminar definitivamente a ${apo.alumno}?`)) {
                                                            await cursoApi.eliminarApoderado(apo.id, anioActivo);
                                                            onActualizar(anioActivo);
                                                            toast("Estudiante eliminado.");
                                                        }
                                                    }}
                                                    className="bg-[#e11d48]/15 hover:bg-[#e11d48]/25 text-[#f43f5e] border border-[#e11d48]/30 p-2.5 rounded-xl text-xs transition cursor-pointer"
                                                >
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Lado Derecho: Meses ensanchados que llenan todo el espacio restante */}
                                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5 flex-1 w-full">
                                    {meses.map(m => {
                                        const p = apo.pagos ? apo.pagos[m] : null;
                                        const esExonerado = p?.exonerado;
                                        const monto = Number(p?.monto || 0);
                                        const esPagado = p?.pagado || monto >= cuotaOficial;

                                        return (
                                            <div 
                                                key={m} 
                                                className="bg-[#070b14] border border-[#162035] p-3 rounded-2xl flex flex-col justify-between items-center text-center w-full h-[92px] shadow-sm hover:border-[#223150] transition"
                                            >
                                                <div className="w-full flex justify-between items-center px-1">
                                                    <span className="text-[11px] font-bold text-slate-300 tracking-wider">
                                                        {abreviarMes(m)}
                                                    </span>
                                                    {!estaCerrado && (
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm(`¿Exonerar cuota de ${m}?`)) {
                                                                    await cursoApi.exonerarMes(apo.id, m, anioActivo);
                                                                    onActualizar(anioActivo);
                                                                }
                                                            }}
                                                            className="text-slate-600 hover:text-amber-400 text-[10px] cursor-pointer"
                                                            title={`Exonerar ${m}`}
                                                        >
                                                            <i className="fa-solid fa-ban"></i>
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="w-full py-0.5">
                                                    {esExonerado ? (
                                                        <span className="block w-full py-1 rounded-lg text-[10px] font-bold bg-[#1e293b] text-slate-400 border border-slate-700">
                                                            Exon.
                                                        </span>
                                                    ) : esPagado ? (
                                                        <span className="block w-full py-1 rounded-lg text-[10px] font-bold bg-[#00d084]/15 text-[#00d084] border border-[#00d084]/30">
                                                            ✓ Pagado
                                                        </span>
                                                    ) : (
                                                        <span className="block w-full py-1 rounded-lg text-[10px] font-bold bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/25">
                                                            Pend.
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between w-full text-[10px] text-slate-400 font-mono px-1">
                                                    <span>{p?.fecha ? p.fecha.slice(5) : '-'}</span>
                                                    {!estaCerrado && (monto > 0 || esExonerado) && (
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm(`¿Revertir pago de ${m}?`)) {
                                                                    await cursoApi.eliminarPagoMes(apo.id, m, anioActivo);
                                                                    onActualizar(anioActivo);
                                                                }
                                                            }}
                                                            className="text-rose-500 hover:text-rose-400 opacity-60 hover:opacity-100 cursor-pointer"
                                                            title="Revertir abono"
                                                        >
                                                            <i className="fa-solid fa-trash-can text-[10px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MODAL EDITAR DATOS CURSO */}
            {modalEditarDatos && (
                <div className="fixed inset-0 bg-[#070b14]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-[#0b1120] border border-[#162035] rounded-3xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-white mb-4">Editar Directiva y Curso</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            await cursoApi.actualizarConfiguracion({ ...formDatosCurso, anio: anioActivo });
                            setModalEditarDatos(false);
                            onActualizar(anioActivo);
                            toast("Datos actualizados.");
                        }} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Nombre del Curso</label>
                                <input 
                                    type="text" 
                                    value={formDatosCurso.nombre_curso}
                                    onChange={e => setFormDatosCurso({ ...formDatosCurso, nombre_curso: e.target.value })}
                                    className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Profesor/a Jefe</label>
                                <input 
                                    type="text" 
                                    value={formDatosCurso.profesor}
                                    onChange={e => setFormDatosCurso({ ...formDatosCurso, profesor: e.target.value })}
                                    className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Presidente/a</label>
                                <input 
                                    type="text" 
                                    value={formDatosCurso.presidente}
                                    onChange={e => setFormDatosCurso({ ...formDatosCurso, presidente: e.target.value })}
                                    className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Tesorero/a</label>
                                <input 
                                    type="text" 
                                    value={formDatosCurso.tesorero}
                                    onChange={e => setFormDatosCurso({ ...formDatosCurso, tesorero: e.target.value })}
                                    className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setModalEditarDatos(false)} className="px-4 py-2 text-xs font-bold text-slate-400 cursor-pointer">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-xs font-bold text-[#070b14] bg-[#00d084] rounded-xl cursor-pointer">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL EDITAR SALDO INICIAL */}
            {modalSaldo && (
                <div className="fixed inset-0 bg-[#070b14]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-[#0b1120] border border-[#162035] rounded-3xl max-w-sm w-full p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-white mb-4">Modificar Saldo Inicial ({anioActivo})</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            await cursoApi.actualizarConfiguracion({ saldo_inicial: Number(saldoInput), anio: anioActivo });
                            setModalSaldo(false);
                            onActualizar(anioActivo);
                            toast("Saldo inicial actualizado.");
                        }} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Monto de Arrastre ($)</label>
                                <input 
                                    type="number" 
                                    value={saldoInput} 
                                    onChange={e => setSaldoInput(e.target.value)}
                                    className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-sm text-[#00d084] font-bold" 
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setModalSaldo(false)} className="px-4 py-2 text-xs font-bold text-slate-400 cursor-pointer">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-xs font-bold text-[#070b14] bg-[#00d084] rounded-xl cursor-pointer">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL PAGO */}
            {modalPago && (
                <div className="fixed inset-0 bg-[#070b14]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-[#0b1120] border border-[#162035] rounded-3xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-white mb-1">Registrar Pago</h3>
                        <p className="text-xs text-slate-400 mb-4">{apoderadoPago?.alumno} — {apoderadoPago?.nombre}</p>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            await cursoApi.registrarPagoGlobal({
                                apoderadoId: apoderadoPago.id,
                                montoEntregado: Number(formPago.montoEntregado),
                                fecha: formPago.fecha,
                                responsable: formPago.responsable,
                                anio: anioActivo
                            });
                            setModalPago(false);
                            onActualizar(anioActivo);
                            toast("Abono procesado exitosamente.");
                        }} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Monto Entregado ($)</label>
                                <input 
                                    type="number" 
                                    required 
                                    min="1"
                                    value={formPago.montoEntregado}
                                    onChange={e => setFormPago({ ...formPago, montoEntregado: e.target.value })}
                                    className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-sm text-[#00d084] font-bold" 
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Fecha</label>
                                <input 
                                    type="date" 
                                    required
                                    value={formPago.fecha}
                                    onChange={e => setFormPago({ ...formPago, fecha: e.target.value })}
                                    className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Responsable</label>
                                <input 
                                    type="text" 
                                    value={formPago.responsable}
                                    onChange={e => setFormPago({ ...formPago, responsable: e.target.value })}
                                    className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setModalPago(false)} className="px-4 py-2 text-xs font-bold text-slate-400 cursor-pointer">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-xs font-bold text-[#070b14] bg-[#00d084] rounded-xl cursor-pointer">Procesar Abono</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL APODERADO */}
            {modalApoderado && (
                <div className="fixed inset-0 bg-[#070b14]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-[#0b1120] border border-[#162035] rounded-3xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-white mb-4">Editar Estudiante / Apoderado</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            await cursoApi.modificarApoderado(apoderadoEditando.id, { ...formApoderado, anio: anioActivo });
                            setModalApoderado(false);
                            onActualizar(anioActivo);
                            toast("Datos actualizados.");
                        }} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Nombre Alumno (Estudiante)</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={formApoderado.alumno}
                                    onChange={e => setFormApoderado({ ...formApoderado, alumno: e.target.value })}
                                    className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Nombre Apoderado</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={formApoderado.nombre}
                                    onChange={e => setFormApoderado({ ...formApoderado, nombre: e.target.value })}
                                    className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Correo Electrónico</label>
                                <input 
                                    type="email" 
                                    value={formApoderado.email}
                                    onChange={e => setFormApoderado({ ...formApoderado, email: e.target.value })}
                                    className="w-full bg-[#070b14] border border-[#162035] rounded-xl px-3 py-2 text-xs text-white" 
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setModalApoderado(false)} className="px-4 py-2 text-xs font-bold text-slate-400 cursor-pointer">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-xs font-bold text-[#070b14] bg-[#00d084] rounded-xl cursor-pointer">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}