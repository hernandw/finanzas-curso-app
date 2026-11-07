// src/components/VistaAdmin.jsx
import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function VistaAdmin({ datos, onActualizar, onCerrarSesion }) {
    if (!datos || !datos.apoderados || !datos.configuracion) {
        return (
            <div className="flex items-center justify-center p-8 text-slate-400 text-xs">
                <i className="fa-solid fa-spinner animate-spin mr-2"></i> Cargando...
            </div>
        );
    }

    const estaCerrado = Boolean(datos.configuracion.cerrado);

    const obtenerApellidoPaterno = (nombreCompleto = '') => {
        if (!nombreCompleto) return '';
        const partes = nombreCompleto.trim().split(/\s+/);
        if (partes.length === 1) return partes[0].toLowerCase();
        if (partes.length === 2 || partes.length === 3) return partes[1].toLowerCase();
        return partes[partes.length - 2].toLowerCase();
    };

    const ordenarPorApellidoPaterno = (a, b) => {
        const apA = obtenerApellidoPaterno(a.alumno);
        const apB = obtenerApellidoPaterno(b.alumno);
        return apA.localeCompare(apB, 'es', { sensitivity: 'base', numeric: true });
    };

    // Buscador en Vista Admin
    const [busquedaAdmin, setBusquedaAdmin] = useState('');

    // Formulario Apoderado
    const [nombreApoderado, setNombreApoderado] = useState('');
    const [nombreAlumno, setNombreAlumno] = useState('');
    const [emailApoderado, setEmailApoderado] = useState('');
    
    // Gasto con Recibo
    const [gastoMes, setGastoMes] = useState(datos.configuracion.meses[0]);
    const [gastoTitulo, setGastoTitulo] = useState('');
    const [gastoMonto, setGastoMonto] = useState('');
    const [gastoFecha, setGastoFecha] = useState(new Date().toISOString().slice(0, 10));
    const [reciboFile, setReciboFile] = useState(null);

    // Ingreso Extra
    const [extraTitulo, setExtraTitulo] = useState('');
    const [extraMonto, setExtraMonto] = useState('');
    const [extraFecha, setExtraFecha] = useState(new Date().toISOString().slice(0, 10));

    // Saldo Inicial y Cuota
    const [saldoInicialEdit, setSaldoInicialEdit] = useState(datos.configuracion.saldo_inicial || 0);
    const [editandoSaldo, setEditandoSaldo] = useState(false);
    const [cuotaInput, setCuotaInput] = useState(datos.configuracion.cuota_mensual || 11000);

    // Datos del Curso
    const [nombreCurso, setNombreCurso] = useState(datos.configuracion.nombre_curso || '8° Básico B');
    const [profesorCurso, setProfesorCurso] = useState(datos.configuracion.profesor || 'Aylin Chong');
    const [presidenteCurso, setPresidenteCurso] = useState(datos.configuracion.presidente || 'Ingrid Brito');
    const [tesoreroCurso, setTesoreroCurso] = useState(datos.configuracion.tesorero || 'Natalya Zakharova');
    const [editandoInfoCurso, setEditandoInfoCurso] = useState(false);

    // Modales
    const [modalEditarApo, setModalEditarApo] = useState(false);
    const [idEditando, setIdEditando] = useState(null);
    const [editNombreApo, setEditNombreApo] = useState('');
    const [editNombreAlu, setEditNombreAlu] = useState('');
    const [editEmailApo, setEditEmailApo] = useState('');

    const [modalAbierto, setModalAbierto] = useState(false);
    const [apoderadoSeleccionado, setApoderadoSeleccionado] = useState(null);
    const [montoPago, setMontoPago] = useState('');
    const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
    const [responsablePago, setResponsablePago] = useState('');

    const [avisosSeccion, setAvisosSeccion] = useState({});
    const fileInputRef = useRef(null);

    useEffect(() => {
        setCuotaInput(datos.configuracion.cuota_mensual || 11000);
        setSaldoInicialEdit(datos.configuracion.saldo_inicial || 0);
        setNombreCurso(datos.configuracion.nombre_curso || '8° Básico B');
        setProfesorCurso(datos.configuracion.profesor || 'Aylin Chong');
        setPresidenteCurso(datos.configuracion.presidente || 'Ingrid Brito');
        setTesoreroCurso(datos.configuracion.tesorero || 'Natalya Zakharova');
    }, [datos]);

    const mostrarAvisoLocal = (seccionId, texto, tipo = 'success') => {
        setAvisosSeccion(prev => ({ ...prev, [seccionId]: { texto, tipo } }));
        setTimeout(() => {
            setAvisosSeccion(prev => {
                const copia = { ...prev };
                delete copia[seccionId];
                return copia;
            });
        }, 3500);
    };

    const cuotaOficial = datos.configuracion.cuota_mensual || 11000;
    const totalGastos = datos.gastos ? datos.gastos.reduce((acc, g) => acc + Number(g.monto), 0) : 0;
    const totalIngresosExtra = datos.ingresos_extra ? datos.ingresos_extra.reduce((acc, e) => acc + Number(e.monto), 0) : 0;
    
    let totalCuotasRecaudadas = 0;
    let totalDeudaPorRecoger = 0;
    let totalMesesPendientesCurso = 0;

    datos.apoderados.forEach(apo => {
        if (apo.activo === false) return;
        datos.configuracion.meses.forEach(m => {
            const p = apo.pagos[m];
            if (p?.exonerado) return;
            const monto = Number(p?.monto || 0);
            totalCuotasRecaudadas += monto;
            if (!p?.pagado) {
                totalMesesPendientesCurso++;
                totalDeudaPorRecoger += (cuotaOficial - monto);
            }
        });
    });

    const saldoRealCaja = Number(datos.configuracion.saldo_inicial || 0) + totalCuotasRecaudadas + totalIngresosExtra - totalGastos;
    const totalEstudiantesActivos = datos.apoderados.filter(a => a.activo !== false).length;

    // Generar PDF y retornarlo como objeto doc
    const armarDocumentoPDF = () => {
        const doc = new jsPDF();
        const anioActual = datos.anio_activo;

        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text(`Informe Financiero - Curso: ${datos.configuracion.nombre_curso || '8° Básico B'} (${anioActual})`, 14, 15);
        
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Profesor/a: ${datos.configuracion.profesor || 'N/A'} | Presidente/a: ${datos.configuracion.presidente || 'N/A'} | Tesorero/a: ${datos.configuracion.tesorero || 'N/A'}`, 14, 21);
        doc.text(`Saldo Inicial: $${Number(datos.configuracion.saldo_inicial || 0).toLocaleString('es-CL')} | Caja Actual: $${saldoRealCaja.toLocaleString('es-CL')} | Deuda por Recoger: $${totalDeudaPorRecoger.toLocaleString('es-CL')}`, 14, 27);

        let currentY = 34;
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('1. Relación de Movimientos (Ingresos y Egresos)', 14, currentY);

        let movimientos = [
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
            body: filasMovimientos.length > 0 ? filasMovimientos : [['-', 'No hay movimientos', '-', '-']],
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 8 }
        });

        currentY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(11);
        doc.text('2. Estado de Pagos y Saldos por Alumno', 14, currentY);

        const apoderadosOrdenados = [...datos.apoderados].sort(ordenarPorApellidoPaterno);
        const filasAlumnos = apoderadosOrdenados.map(apo => {
            let totalAbonadoApo = 0;
            let mesesPendientes = 0;
            let deudaApo = 0;

            datos.configuracion.meses.forEach(mes => {
                const p = apo.pagos[mes];
                if (p?.exonerado) return;
                const m = Number(p?.monto || 0);
                totalAbonadoApo += m;
                if (!p?.pagado) {
                    mesesPendientes++;
                    deudaApo += (cuotaOficial - m);
                }
            });

            return [
                apo.alumno,
                apo.nombre,
                apo.email || 'Sin correo',
                `$${totalAbonadoApo.toLocaleString('es-CL')}`,
                `${mesesPendientes} meses`,
                `$${deudaApo.toLocaleString('es-CL')}`
            ];
        });

        filasAlumnos.push([
            'TOTAL GENERAL',
            '-',
            '-',
            `$${totalCuotasRecaudadas.toLocaleString('es-CL')}`,
            `${totalMesesPendientesCurso} meses`,
            `$${totalDeudaPorRecoger.toLocaleString('es-CL')}`
        ]);

        autoTable(doc, {
            startY: currentY + 3,
            head: [['Estudiante', 'Apoderado', 'Correo', 'Total Abonos', 'Meses Pendientes', 'Deuda Estimada']],
            body: filasAlumnos,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 8 }
        });

        return doc;
    };

    const handleExportarPDF = () => {
        const doc = armarDocumentoPDF();
        doc.save(`Informe_Tesoreria_${datos.anio_activo}.pdf`);
    };

    // Enviar PDF a todos los correos de apoderados
    const handleEnviarPdfPorCorreo = async () => {
        const confirmar = confirm(`¿Deseas generar y enviar este informe PDF por correo a todos los apoderados registrados?`);
        if (!confirmar) return;

        const doc = armarDocumentoPDF();
        const pdfBlob = doc.output('blob');

        const formData = new FormData();
        formData.append('pdf', pdfBlob, `Informe_Tesoreria_${datos.anio_activo}.pdf`);
        formData.append('anio', datos.anio_activo);

        try {
            mostrarAvisoLocal('acciones', "Enviando PDF por correo...");
            const res = await fetch('/api/curso/admin/enviar-pdf-correo', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                mostrarAvisoLocal('acciones', `PDF enviado a ${data.destinatarios} apoderados.`);
            } else {
                mostrarAvisoLocal('acciones', data.error || "Error al enviar PDF.", "error");
            }
        } catch (error) {
            mostrarAvisoLocal('acciones', "Error de conexión al enviar correos.", "error");
        }
    };

    // Cobranza masiva automática o individual a morosos
    const handleEnviarRecordatorioMorosos = async (apoderadoId = null) => {
        const texto = apoderadoId ? "¿Enviar aviso de cobranza al correo de este apoderado?" : "¿Enviar recordatorio de cobro a TODOS los apoderados morosos con correo?";
        if (!confirm(texto)) return;

        try {
            mostrarAvisoLocal('pagos', "Enviando correos de cobranza...");
            const res = await fetch('/api/curso/admin/enviar-correo-morosos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apoderadoId, anio: datos.anio_activo })
            });
            const data = await res.json();
            if (res.ok) {
                mostrarAvisoLocal('pagos', `Correos enviados exitosamente: ${data.correosEnviados}`);
            } else {
                mostrarAvisoLocal('pagos', data.error || "Error al enviar correos.", "error");
            }
        } catch {
            mostrarAvisoLocal('pagos', "Error de conexión.", "error");
        }
    };

    // Registrar gasto con recibo
    const handleRegistrarGasto = async (e) => {
        e.preventDefault();
        if (!gastoTitulo.trim() || !gastoMonto) return;

        const formData = new FormData();
        formData.append('mes', gastoMes);
        formData.append('titulo', gastoTitulo);
        formData.append('monto', gastoMonto);
        formData.append('fecha', gastoFecha);
        formData.append('anio', datos.anio_activo);
        if (reciboFile) formData.append('recibo', reciboFile);

        try {
            const res = await fetch('/api/curso/admin/gasto', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                setGastoTitulo('');
                setGastoMonto('');
                setReciboFile(null);
                mostrarAvisoLocal('gasto', "Gasto registrado correctamente.");
                onActualizar();
            }
        } catch {
            mostrarAvisoLocal('gasto', "Error al registrar gasto.", "error");
        }
    };

    // Filtrar apoderados con el buscador de admin
    const apoderadosFiltradosAdmin = datos.apoderados
        .filter(a => 
            a.alumno.toLowerCase().includes(busquedaAdmin.toLowerCase()) || 
            a.nombre.toLowerCase().includes(busquedaAdmin.toLowerCase())
        )
        .sort(ordenarPorApellidoPaterno);

    return (
        <div className="space-y-8 relative">
            {/* ALERTA DE AÑO CERRADO */}
            {estaCerrado && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-2xl flex items-center justify-between shadow-xl">
                    <div className="flex items-center gap-3">
                        <i className="fa-solid fa-lock text-xl text-amber-400"></i>
                        <div>
                            <h4 className="font-bold text-sm">Año Escolar {datos.anio_activo} Cerrado</h4>
                            <p className="text-xs text-amber-300/80">Este periodo escolar se encuentra en modo histórico. No se admiten modificaciones.</p>
                        </div>
                    </div>
                    <span className="text-xs font-mono bg-amber-950/80 border border-amber-500/30 px-3 py-1 rounded-xl">Solo Lectura</span>
                </div>
            )}

            {/* BARRA DE HERRAMIENTAS: PDF, CORREO A APODERADOS, BACKUP */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-wrap justify-between items-center gap-3 relative">
                {avisosSeccion['acciones'] && (
                    <div className="absolute -top-10 left-0 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs px-3 py-1.5 rounded-xl shadow-lg z-50 animate-bounce">
                        {avisosSeccion['acciones'].texto}
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    <button 
                        onClick={handleExportarPDF}
                        className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
                    >
                        <i className="fa-solid fa-file-pdf"></i> Descargar PDF
                    </button>
                    <button 
                        onClick={handleEnviarPdfPorCorreo}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
                        title="Enviar el PDF del balance a todos los apoderados con correo"
                    >
                        <i className="fa-solid fa-paper-plane"></i> Enviar PDF por Correo
                    </button>
                    <button 
                        onClick={() => window.open('/api/curso/backup', '_blank')}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
                    >
                        <i className="fa-solid fa-download"></i> Backup .json
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const text = await file.text();
                            const res = await fetch('/api/curso/backup/restaurar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: text
                            });
                            if (res.ok) onActualizar();
                        }} 
                        accept=".json" 
                        className="hidden" 
                    />
                    <button 
                        onClick={() => fileInputRef.current.click()}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
                    >
                        <i className="fa-solid fa-upload"></i> Restaurar
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {!estaCerrado && (
                        <button 
                            onClick={async () => {
                                if (confirm(`¿Cerrar el año escolar ${datos.anio_activo} y pasar a ${Number(datos.anio_activo) + 1}?`)) {
                                    await fetch('/api/curso/admin/cerrar-anio', { method: 'POST' });
                                    onActualizar();
                                }
                            }}
                            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
                        >
                            <i className="fa-solid fa-lock"></i> Cerrar Año Escolar
                        </button>
                    )}
                    <button 
                        onClick={async () => {
                            if (confirm("⚠️ ¿Deseas reiniciar la aplicación a valores de fábrica?")) {
                                await fetch('/api/curso/reset', { method: 'DELETE' });
                                onActualizar();
                            }
                        }}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
                    >
                        <i className="fa-solid fa-trash-arrow-up"></i> Reset
                    </button>
                </div>
            </div>

            {/* DATOS DEL CURSO */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                        <i className="fa-solid fa-school"></i> Datos Generales del Curso
                    </h3>
                    {!estaCerrado && (
                        <button 
                            onClick={() => setEditandoInfoCurso(!editandoInfoCurso)}
                            className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5"
                        >
                            <i className={`fa-solid ${editandoInfoCurso ? 'fa-xmark' : 'fa-pen-to-square'}`}></i>
                            {editandoInfoCurso ? 'Cancelar' : 'Editar Datos'}
                        </button>
                    )}
                </div>

                {editandoInfoCurso ? (
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        await fetch('/api/curso/admin/configuracion', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ nombre_curso: nombreCurso, profesor: profesorCurso, presidente: presidenteCurso, tesorero: tesoreroCurso, anio: datos.anio_activo })
                        });
                        setEditandoInfoCurso(false);
                        onActualizar();
                    }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <input type="text" value={nombreCurso} onChange={(e) => setNombreCurso(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" placeholder="Curso" />
                        <input type="text" value={profesorCurso} onChange={(e) => setProfesorCurso(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" placeholder="Profesor Jefe" />
                        <input type="text" value={presidenteCurso} onChange={(e) => setPresidenteCurso(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" placeholder="Presidente" />
                        <input type="text" value={tesoreroCurso} onChange={(e) => setTesoreroCurso(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" placeholder="Tesorero" />
                        <div className="sm:col-span-4 flex justify-end">
                            <button type="submit" className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs">Guardar</button>
                        </div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-300">
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl"><span className="text-[10px] text-slate-500 block">Curso:</span><span className="font-bold text-white">{datos.configuracion.nombre_curso}</span></div>
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl"><span className="text-[10px] text-slate-500 block">Profesor/a:</span><span className="font-bold text-emerald-400">{datos.configuracion.profesor}</span></div>
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl"><span className="text-[10px] text-slate-500 block">Presidente/a:</span><span className="font-bold text-sky-400">{datos.configuracion.presidente}</span></div>
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl"><span className="text-[10px] text-slate-500 block">Tesorero/a:</span><span className="font-bold text-amber-400">{datos.configuracion.tesorero}</span></div>
                    </div>
                )}
            </div>

            {/* CABECERA, AÑO ACTIVO, SALDO Y CUOTA */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <i className="fa-solid fa-lock text-emerald-400"></i> Panel de Administración ({datos.anio_activo})
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Control de finanzas, mensualidades e historial del curso.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Cuota:</span>
                        <input 
                            type="number" 
                            disabled={estaCerrado}
                            value={cuotaInput}
                            onChange={(e) => setCuotaInput(e.target.value)}
                            className="bg-slate-900 text-emerald-400 font-bold text-xs w-20 px-2 py-1 rounded border border-slate-700 disabled:opacity-50"
                        />
                        {!estaCerrado && (
                            <button 
                                onClick={async () => {
                                    await fetch('/api/curso/admin/configuracion', {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ cuota_mensual: Number(cuotaInput), anio: datos.anio_activo })
                                    });
                                    onActualizar();
                                }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-2 py-1 rounded text-xs"
                            >
                                OK
                            </button>
                        )}
                    </div>

                    <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Año:</span>
                        <select 
                            value={datos.anio_activo}
                            onChange={async (e) => {
                                await fetch('/api/curso/admin/cambiar-anio', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ nuevoAnio: e.target.value })
                                });
                                onActualizar();
                            }}
                            className="bg-slate-900 text-white font-bold text-xs px-2 py-1 rounded border border-slate-700 cursor-pointer"
                        >
                            {(datos.aniosDisponibles || ["2024", "2025", "2026", "2027", "2028"]).map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl flex items-center gap-3">
                        <div>
                            <span className="text-[9px] text-slate-400 block font-medium">Saldo Inicial</span>
                            {editandoSaldo && !estaCerrado ? (
                                <input 
                                    type="number"
                                    value={saldoInicialEdit}
                                    onChange={(e) => setSaldoInicialEdit(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 text-emerald-400 text-xs px-2 py-0.5 rounded w-24 font-bold"
                                />
                            ) : (
                                <span className="text-xs font-bold text-emerald-400">${Number(datos.configuracion.saldo_inicial || 0).toLocaleString('es-CL')}</span>
                            )}
                        </div>
                        {!estaCerrado && (
                            editandoSaldo ? (
                                <button onClick={async () => {
                                    await fetch('/api/curso/admin/configuracion', {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ saldo_inicial: Number(saldoInicialEdit), anio: datos.anio_activo })
                                    });
                                    setEditandoSaldo(false);
                                    onActualizar();
                                }} className="bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px]">OK</button>
                            ) : (
                                <button onClick={() => setEditandoSaldo(true)} className="text-slate-400 hover:text-white text-xs"><i className="fa-solid fa-pen"></i></button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* BALANCE GENERAL CON TARJETA DE DEUDA POR RECOGER */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <i className="fa-solid fa-scale-balanced"></i> Balance General y Flujo de Caja ({datos.anio_activo})
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl"><span className="text-[10px] text-slate-400 block">Saldo Anterior</span><span className="text-sm font-bold text-slate-200">${Number(datos.configuracion.saldo_inicial || 0).toLocaleString('es-CL')}</span></div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl"><span className="text-[10px] text-slate-400 block">Cuotas</span><span className="text-sm font-bold text-emerald-400">${totalCuotasRecaudadas.toLocaleString('es-CL')}</span></div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl"><span className="text-[10px] text-slate-400 block">Ingresos Extra</span><span className="text-sm font-bold text-sky-400">${totalIngresosExtra.toLocaleString('es-CL')}</span></div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl"><span className="text-[10px] text-slate-400 block">Gastos</span><span className="text-sm font-bold text-rose-400">${totalGastos.toLocaleString('es-CL')}</span></div>
                    <div className="bg-slate-950 border border-emerald-500/30 p-3 rounded-xl bg-emerald-950/10"><span className="text-[10px] text-emerald-400 block font-semibold">Saldo Real</span><span className="text-sm font-extrabold text-emerald-400">${saldoRealCaja.toLocaleString('es-CL')}</span></div>
                    <div className="bg-slate-950 border border-amber-500/30 p-3 rounded-xl bg-amber-950/10"><span className="text-[10px] text-amber-400 block font-semibold">Deuda por Recoger</span><span className="text-sm font-extrabold text-amber-400">${totalDeudaPorRecoger.toLocaleString('es-CL')}</span></div>
                </div>
            </div>

            {/* RESUMEN FINANCIERO POR ALUMNO CON TOTALES AL PIE */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                        <i className="fa-solid fa-chart-pie"></i> Resumen Financiero por Estudiante (Ordenado por Apellido Paterno)
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleEnviarRecordatorioMorosos(null)}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow"
                            title="Enviar correo a todos los morosos con email registrado"
                        >
                            <i className="fa-solid fa-envelope-open-text"></i> Notificar a Todos los Morosos
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                            <tr>
                                <th className="p-3">Estudiante (Alumno)</th>
                                <th className="p-3">Apoderado / Correo</th>
                                <th className="p-3 text-center">Total Recaudado</th>
                                <th className="p-3 text-center">Meses Pendientes</th>
                                <th className="p-3 text-right">Deuda Estimada</th>
                                <th className="p-3 text-center">Aviso</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {[...datos.apoderados]
                                .sort(ordenarPorApellidoPaterno)
                                .map(apo => {
                                    let totalAbonado = 0;
                                    let mesesPendientes = 0;
                                    let deudaApo = 0;

                                    datos.configuracion.meses.forEach(m => {
                                        const p = apo.pagos[m];
                                        if (p?.exonerado) return;
                                        const monto = Number(p?.monto || 0);
                                        totalAbonado += monto;
                                        if (!p?.pagado) {
                                            mesesPendientes++;
                                            deudaApo += (cuotaOficial - monto);
                                        }
                                    });

                                    return (
                                        <tr key={apo.id} className={`hover:bg-slate-950/40 ${apo.activo === false ? 'opacity-50' : ''}`}>
                                            <td className="p-3">
                                                <span className="font-extrabold text-white block text-sm">{apo.alumno}</span>
                                            </td>
                                            <td className="p-3 text-slate-400">
                                                <span>{apo.nombre} {apo.activo === false && '(Inactivo)'}</span>
                                                <span className="block text-[10px] text-slate-500 font-mono">{apo.email || 'Sin correo'}</span>
                                            </td>
                                            <td className="p-3 text-center font-bold text-emerald-400">${totalAbonado.toLocaleString('es-CL')}</td>
                                            <td className="p-3 text-center text-amber-400 font-medium">{mesesPendientes} meses</td>
                                            <td className="p-3 text-right font-bold text-rose-400">${deudaApo.toLocaleString('es-CL')}</td>
                                            <td className="p-3 text-center">
                                                {deudaApo > 0 && apo.email ? (
                                                    <button
                                                        onClick={() => handleEnviarRecordatorioMorosos(apo.id)}
                                                        className="text-amber-400 hover:text-amber-300 p-1"
                                                        title="Enviar aviso por correo a este apoderado"
                                                    >
                                                        <i className="fa-solid fa-paper-plane"></i>
                                                    </button>
                                                ) : <span className="text-slate-600">-</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                        <tfoot className="bg-slate-950 text-white font-bold border-t-2 border-slate-700">
                            <tr>
                                <td className="p-3 text-sky-400 uppercase tracking-wider font-extrabold">TOTAL GENERAL</td>
                                <td className="p-3 text-slate-500">-</td>
                                <td className="p-3 text-center text-emerald-400 text-sm">${totalCuotasRecaudadas.toLocaleString('es-CL')}</td>
                                <td className="p-3 text-center text-amber-400 text-sm">{totalMesesPendientesCurso} meses</td>
                                <td className="p-3 text-right text-rose-400 text-sm font-extrabold">${totalDeudaPorRecoger.toLocaleString('es-CL')}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* FORMULARIOS DE REGISTRO */}
            {!estaCerrado && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Gasto con Adjunto de Recibo */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                        <h3 className="text-sm font-bold text-rose-400"><i className="fa-solid fa-receipt mr-1"></i> Registrar Gasto</h3>
                        <form onSubmit={handleRegistrarGasto} className="space-y-3">
                            <input type="text" placeholder="Descripción..." value={gastoTitulo} onChange={(e) => setGastoTitulo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" required />
                            <div className="grid grid-cols-2 gap-2">
                                <select value={gastoMes} onChange={(e) => setGastoMes(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                                    {datos.configuracion.meses.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <input type="number" placeholder="Monto" value={gastoMonto} onChange={(e) => setGastoMonto(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" required />
                            </div>
                            <input type="date" value={gastoFecha} onChange={(e) => setGastoFecha(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                            
                            {/* Adjuntar recibo */}
                            <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Adjuntar Recibo (Opcional - Imagen/PDF)</label>
                                <input 
                                    type="file" 
                                    onChange={(e) => setReciboFile(e.target.files[0])}
                                    accept="image/*,application/pdf"
                                    className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700"
                                />
                            </div>

                            <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold py-2 rounded-xl text-xs">Registrar Gasto</button>
                        </form>
                    </div>

                    {/* Ingreso Extra */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                        <h3 className="text-sm font-bold text-emerald-400"><i className="fa-solid fa-coins mr-1"></i> Ingreso Extra</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!extraTitulo.trim() || !extraMonto) return;
                            await fetch('/api/curso/admin/ingreso-extra', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ titulo: extraTitulo, monto: extraMonto, fecha: extraFecha, anio: datos.anio_activo })
                            });
                            setExtraTitulo(''); setExtraMonto(''); onActualizar();
                        }} className="space-y-3">
                            <input type="text" placeholder="Concepto..." value={extraTitulo} onChange={(e) => setExtraTitulo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" required />
                            <input type="number" placeholder="Monto" value={extraMonto} onChange={(e) => setExtraMonto(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" required />
                            <input type="date" value={extraFecha} onChange={(e) => setExtraFecha(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-xl text-xs">Registrar Ingreso</button>
                        </form>
                    </div>

                    {/* Agregar Apoderado con Email */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                        <h3 className="text-sm font-bold text-sky-400"><i className="fa-solid fa-user-plus mr-1"></i> Agregar Estudiante / Apoderado</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!nombreApoderado.trim() || !nombreAlumno.trim()) return;
                            await fetch('/api/curso/admin/apoderado/agregar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ nombre: nombreApoderado, alumno: nombreAlumno, email: emailApoderado, anio: datos.anio_activo })
                            });
                            setNombreApoderado(''); setNombreAlumno(''); setEmailApoderado(''); onActualizar();
                        }} className="space-y-3">
                            <input type="text" placeholder="Nombre Alumno (Estudiante)..." value={nombreAlumno} onChange={(e) => setNombreAlumno(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold" required />
                            <input type="text" placeholder="Nombre Apoderado..." value={nombreApoderado} onChange={(e) => setNombreApoderado(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" required />
                            <input type="email" placeholder="Correo electrónico..." value={emailApoderado} onChange={(e) => setEmailApoderado(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                            <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold py-2 rounded-xl text-xs">Agregar</button>
                        </form>
                    </div>
                </div>
            )}

            {/* TABLAS DETALLADAS DE GASTOS E INGRESOS EXTRA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                    <h3 className="text-sm font-bold text-rose-400"><i className="fa-solid fa-receipt mr-1"></i> Relación de Gastos</h3>
                    <div className="overflow-x-auto max-h-52 overflow-y-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                                <tr>
                                    <th className="p-2">Fecha</th>
                                    <th className="p-2">Descripción</th>
                                    <th className="p-2 text-right">Monto</th>
                                    <th className="p-2 text-center">Recibo</th>
                                    {!estaCerrado && <th className="p-2 text-center">Acción</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {(datos.gastos || []).map(g => (
                                    <tr key={g.id}>
                                        <td className="p-2 text-slate-400 font-mono text-[10px]">{g.fecha}</td>
                                        <td className="p-2 text-white">{g.titulo}</td>
                                        <td className="p-2 text-right font-bold text-rose-400">${Number(g.monto).toLocaleString('es-CL')}</td>
                                        <td className="p-2 text-center">
                                            {g.reciboUrl ? (
                                                <a href={g.reciboUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 text-xs" title="Ver Comprobante">
                                                    <i className="fa-solid fa-image"></i>
                                                </a>
                                            ) : <span className="text-slate-600">-</span>}
                                        </td>
                                        {!estaCerrado && (
                                            <td className="p-2 text-center">
                                                <button onClick={async () => {
                                                    await fetch(`/api/curso/admin/gasto/${g.id}?anio=${datos.anio_activo}`, { method: 'DELETE' });
                                                    onActualizar();
                                                }} className="text-slate-500 hover:text-rose-400"><i className="fa-solid fa-trash-can"></i></button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                    <h3 className="text-sm font-bold text-emerald-400"><i className="fa-solid fa-coins mr-1"></i> Relación de Ingresos Extra</h3>
                    <div className="overflow-x-auto max-h-52 overflow-y-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                                <tr><th className="p-2">Fecha</th><th className="p-2">Concepto</th><th className="p-2 text-right">Monto</th>{!estaCerrado && <th className="p-2 text-center">Acción</th>}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {(datos.ingresos_extra || []).map(e => (
                                    <tr key={e.id}>
                                        <td className="p-2 text-slate-400 font-mono text-[10px]">{e.fecha}</td>
                                        <td className="p-2 text-white">{e.titulo}</td>
                                        <td className="p-2 text-right font-bold text-emerald-400">${Number(e.monto).toLocaleString('es-CL')}</td>
                                        {!estaCerrado && (
                                            <td className="p-2 text-center">
                                                <button onClick={async () => {
                                                    await fetch(`/api/curso/admin/ingreso-extra/${e.id}?anio=${datos.anio_activo}`, { method: 'DELETE' });
                                                    onActualizar();
                                                }} className="text-slate-500 hover:text-rose-400"><i className="fa-solid fa-trash-can"></i></button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* GESTIÓN DE PAGOS MENSUALES POR ESTUDIANTE */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <i className="fa-solid fa-money-check-dollar"></i> Gestión de Pagos Mensuales
                        </h3>
                        {/* Indicador de Número de Estudiantes */}
                        <span className="text-xs bg-slate-950 border border-slate-800 text-sky-400 font-bold px-3 py-1 rounded-xl">
                            {totalEstudiantesActivos} Estudiantes Registrados
                        </span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* Buscador de Vista Admin */}
                        <input
                            type="text"
                            placeholder="Buscar estudiante o apoderado..."
                            value={busquedaAdmin}
                            onChange={(e) => setBusquedaAdmin(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full sm:w-56"
                        />
                        {/* Botón Cerrar Sesión */}
                        <button
                            onClick={onCerrarSesion}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 flex-shrink-0"
                            title="Cerrar Sesión de Administración"
                        >
                            <i className="fa-solid fa-arrow-right-from-bracket"></i> Cerrar Sesión
                        </button>
                    </div>
                </div>
                
                <div className="flex flex-col gap-4">
                    {apoderadosFiltradosAdmin.map(apo => (
                        <div key={apo.id} className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
                            <div className="xl:w-1/4 flex-shrink-0 border-b xl:border-b-0 xl:border-r border-slate-800 pb-3 xl:pb-0 xl:pr-4 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-extrabold text-white text-base tracking-wide flex items-center gap-1.5">
                                            <i className="fa-solid fa-user-graduate text-sky-400 text-sm"></i>
                                            {apo.alumno} {apo.activo === false && <span className="text-rose-400 text-xs font-normal">(Inactivo)</span>}
                                        </h4>
                                        {!estaCerrado && (
                                            <button 
                                                onClick={() => { 
                                                    setIdEditando(apo.id); 
                                                    setEditNombreApo(apo.nombre); 
                                                    setEditNombreAlu(apo.alumno); 
                                                    setEditEmailApo(apo.email || '');
                                                    setModalEditarApo(true); 
                                                }}
                                                className="text-slate-400 hover:text-sky-400 text-xs p-1"
                                                title="Editar Datos"
                                            >
                                                <i className="fa-solid fa-pen-to-square"></i>
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Apoderado: <span className="text-slate-200 font-medium">{apo.nombre}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-mono">
                                        {apo.email || 'Sin correo registrado'}
                                    </p>
                                </div>

                                {!estaCerrado && (
                                    <div className="flex gap-2 w-full mt-3 items-center">
                                        <button 
                                            onClick={() => { setApoderadoSeleccionado(apo); setMontoPago(''); setResponsablePago(apo.nombre); setModalAbierto(true); }}
                                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition"
                                        >
                                            Registrar Pago
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                await fetch(`/api/curso/admin/apoderado/estado/${apo.id}`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ activo: apo.activo === false, anio: datos.anio_activo })
                                                });
                                                onActualizar();
                                            }}
                                            className={`text-xs px-2.5 py-1.5 rounded-xl border ${apo.activo === false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}
                                            title="Activar u Ocultar"
                                        >
                                            {apo.activo === false ? 'Activar' : 'Ocultar'}
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                if (confirm(`¿Eliminar definitivamente a ${apo.nombre}?`)) {
                                                    await fetch(`/api/curso/admin/apoderado/${apo.id}?anio=${datos.anio_activo}`, { method: 'DELETE' });
                                                    onActualizar();
                                                }
                                            }}
                                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs px-2.5 py-1.5 rounded-xl"
                                        >
                                            <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                                {datos.configuracion.meses.map(mes => {
                                    const pago = apo.pagos[mes] || { pagado: false, monto: 0, exonerado: false, fecha: null };
                                    const montoAbonado = Number(pago.monto || 0);
                                    const esCompleto = pago.pagado && (montoAbonado >= cuotaOficial);

                                    return (
                                        <div key={mes} className={`border p-2 rounded-xl flex flex-col justify-between text-center min-h-[72px] ${pago.exonerado ? 'bg-slate-950/40 border-slate-800/40 opacity-70' : 'bg-slate-950 border-slate-800'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{mes.slice(0, 3)}</span>
                                                <div className="flex items-center gap-1">
                                                    {!estaCerrado && montoAbonado === 0 && (
                                                        <button
                                                            onClick={async () => {
                                                                await fetch(`/api/curso/admin/pago/exonerar/${apo.id}/${mes}?anio=${datos.anio_activo}`, { method: 'PUT' });
                                                                onActualizar();
                                                            }}
                                                            className={`text-[9px] px-1 py-0.2 rounded transition ${pago.exonerado ? 'bg-sky-500/20 text-sky-400' : 'text-slate-600 hover:text-slate-300'}`}
                                                            title={pago.exonerado ? "Quitar exoneración" : "Exonerar mes"}
                                                        >
                                                            <i className="fa-solid fa-ban"></i>
                                                        </button>
                                                    )}
                                                    {!estaCerrado && montoAbonado > 0 && (
                                                        <button onClick={async () => {
                                                            await fetch(`/api/curso/admin/pago/${apo.id}/${mes}?anio=${datos.anio_activo}`, { method: 'DELETE' });
                                                            onActualizar();
                                                        }} className="text-slate-600 hover:text-rose-400 text-[10px]">
                                                            <i className="fa-solid fa-trash-can"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="my-1">
                                                {pago.exonerado ? (
                                                    <span className="inline-block w-full text-center bg-sky-500/10 text-sky-400 border border-sky-500/20 py-0.5 rounded text-[9px] font-bold">Exon.</span>
                                                ) : esCompleto ? (
                                                    <span className="inline-block w-full text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-0.5 rounded text-[9px] font-bold">✓ Pagado</span>
                                                ) : montoAbonado > 0 ? (
                                                    <span className="inline-block w-full text-center bg-amber-500/10 text-amber-400 border border-amber-500/20 py-0.5 rounded text-[9px] font-bold">${(montoAbonado / 1000).toFixed(0)}k</span>
                                                ) : (
                                                    <span className="inline-block w-full text-center bg-rose-500/10 text-rose-400 border border-rose-500/20 py-0.5 rounded text-[9px] font-bold">Pend.</span>
                                                )}
                                            </div>

                                            <span className="text-[8px] text-slate-500 font-mono truncate">
                                                {pago.fecha ? pago.fecha.slice(5) : '-'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL MODIFICAR APODERADO / ALUMNO / CORREO */}
            {modalEditarApo && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        await fetch(`/api/curso/admin/apoderado/${idEditando}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ nombre: editNombreApo, alumno: editNombreAlu, email: editEmailApo, anio: datos.anio_activo })
                        });
                        setModalEditarApo(false);
                        onActualizar();
                    }} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <i className="fa-solid fa-user-pen text-sky-400"></i> Modificar Estudiante / Apoderado
                        </h3>
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Nombre del Estudiante</label>
                            <input type="text" value={editNombreAlu} onChange={(e) => setEditNombreAlu(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold" required />
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Nombre del Apoderado</label>
                            <input type="text" value={editNombreApo} onChange={(e) => setEditNombreApo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" required />
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Correo Electrónico (Para avisos)</label>
                            <input type="email" value={editEmailApo} onChange={(e) => setEditEmailApo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setModalEditarApo(false)} className="w-1/2 bg-slate-800 py-2 rounded-xl text-xs text-slate-300 font-bold">Cancelar</button>
                            <button type="submit" className="w-1/2 bg-sky-500 py-2 rounded-xl text-xs text-slate-950 font-bold">Guardar</button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL REGISTRO DE PAGO */}
            {modalAbierto && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        await fetch('/api/curso/admin/pago-global', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                apoderadoId: apoderadoSeleccionado.id,
                                montoEntregado: Number(montoPago),
                                fecha: fechaPago,
                                responsable: responsablePago,
                                anio: datos.anio_activo
                            })
                        });
                        setModalAbierto(false);
                        onActualizar();
                    }} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <i className="fa-solid fa-cash-register text-emerald-400"></i> Registrar Pago / Abono
                            </h3>
                            <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-white">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
                            <p className="text-white">Estudiante: <strong className="text-sky-400 text-sm">{apoderadoSeleccionado?.alumno}</strong></p>
                            <p className="text-slate-400">Apoderado: {apoderadoSeleccionado?.nombre}</p>
                        </div>
                        <input type="number" placeholder="Monto entregado ($)" value={montoPago} onChange={(e) => setMontoPago(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold text-emerald-400" required autoFocus />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                            <input type="text" placeholder="Responsable del pago" value={responsablePago} onChange={(e) => setResponsablePago(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setModalAbierto(false)} className="w-1/2 bg-slate-800 py-2 rounded-xl text-xs text-slate-300 font-bold">Cancelar</button>
                            <button type="submit" className="w-1/2 bg-emerald-500 py-2 rounded-xl text-xs text-slate-950 font-bold">Guardar Pago</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}