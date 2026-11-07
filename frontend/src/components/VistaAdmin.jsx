// src/components/VistaAdmin.jsx
import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function VistaAdmin({ datos, onActualizar }) {
    if (!datos || !datos.apoderados || !datos.configuracion) {
        return (
            <div className="flex items-center justify-center p-8 text-slate-400 text-xs">
                <i className="fa-solid fa-spinner animate-spin mr-2"></i> Cargando panel de administración...
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

    const [nombreApoderado, setNombreApoderado] = useState('');
    const [nombreAlumno, setNombreAlumno] = useState('');
    
    // Gasto
    const [gastoMes, setGastoMes] = useState(datos.configuracion.meses[0]);
    const [gastoTitulo, setGastoTitulo] = useState('');
    const [gastoMonto, setGastoMonto] = useState('');
    const [gastoFecha, setGastoFecha] = useState(new Date().toISOString().slice(0, 10));

    // Ingreso Extra
    const [extraTitulo, setExtraTitulo] = useState('');
    const [extraMonto, setExtraMonto] = useState('');
    const [extraFecha, setExtraFecha] = useState(new Date().toISOString().slice(0, 10));

    // Saldo Inicial y Cuota
    const [saldoInicialEdit, setSaldoInicialEdit] = useState(datos.configuracion.saldo_inicial || 0);
    const [editandoSaldo, setEditandoSaldo] = useState(false);
    const [cuotaInput, setCuotaInput] = useState(datos.configuracion.cuota_mensual || 15000);

    // Datos del Curso
    const [nombreCurso, setNombreCurso] = useState(datos.configuracion.nombre_curso || '4° Medio A');
    const [profesorCurso, setProfesorCurso] = useState(datos.configuracion.profesor || 'Juan Pérez');
    const [presidenteCurso, setPresidenteCurso] = useState(datos.configuracion.presidente || 'Ana Gómez');
    const [tesoreroCurso, setTesoreroCurso] = useState(datos.configuracion.tesorero || 'María González');
    const [editandoInfoCurso, setEditandoInfoCurso] = useState(false);

    // Modal Modificar Apoderado / Alumno
    const [modalEditarApo, setModalEditarApo] = useState(false);
    const [idEditando, setIdEditando] = useState(null);
    const [editNombreApo, setEditNombreApo] = useState('');
    const [editNombreAlu, setEditNombreAlu] = useState('');

    useEffect(() => {
        setCuotaInput(datos.configuracion.cuota_mensual || 15000);
        setSaldoInicialEdit(datos.configuracion.saldo_inicial || 0);
        setNombreCurso(datos.configuracion.nombre_curso || '4° Medio A');
        setProfesorCurso(datos.configuracion.profesor || 'Juan Pérez');
        setPresidenteCurso(datos.configuracion.presidente || 'Ana Gómez');
        setTesoreroCurso(datos.configuracion.tesorero || 'María González');
    }, [datos]);

    // Modal de Pago Global
    const [modalAbierto, setModalAbierto] = useState(false);
    const [apoderadoSeleccionado, setApoderadoSeleccionado] = useState(null);
    const [montoPago, setMontoPago] = useState('');
    const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
    const [responsablePago, setResponsablePago] = useState('');

    // Notificaciones por sección
    const [avisosSeccion, setAvisosSeccion] = useState({});

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

    const fileInputRef = useRef(null);

    const cuotaOficial = datos.configuracion.cuota_mensual || 15000;
    const totalGastos = datos.gastos ? datos.gastos.reduce((acc, g) => acc + Number(g.monto), 0) : 0;
    const totalIngresosExtra = datos.ingresos_extra ? datos.ingresos_extra.reduce((acc, e) => acc + Number(e.monto), 0) : 0;
    
    const totalCuotasRecaudadas = datos.apoderados.reduce((acc, apo) => {
        let sub = 0;
        datos.configuracion.meses.forEach(m => { 
            if (apo.pagos[m]?.monto && !apo.pagos[m]?.exonerado) sub += Number(apo.pagos[m].monto); 
        });
        return acc + sub;
    }, 0);

    const saldoRealCaja = Number(datos.configuracion.saldo_inicial || 0) + totalCuotasRecaudadas + totalIngresosExtra - totalGastos;

    // Exportación a PDF estructurado, coloreado y ordenado
    const handleExportarPDF = () => {
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
            body: filasMovimientos.length > 0 ? filasMovimientos : [['-', 'No hay movimientos registrados', '-', '-']],
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 8 }
        });

        currentY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(11);
        doc.text('2. Estado de Pagos y Saldos por Alumno (Ordenado por Apellido)', 14, currentY);

        const apoderadosOrdenados = [...datos.apoderados].sort(ordenarPorApellidoPaterno);

        const filasAlumnos = apoderadosOrdenados.map(apo => {
            let totalAbonadoApo = 0;
            let mesesPendientes = 0;

            datos.configuracion.meses.forEach(mes => {
                const p = apo.pagos[mes];
                if (p?.exonerado) return; // Omitir exonerado del cálculo de deuda
                if (p && p.monto) {
                    totalAbonadoApo += Number(p.monto);
                    if (!p.pagado) mesesPendientes++;
                } else {
                    mesesPendientes++;
                }
            });

            const deudaEstimada = mesesPendientes * cuotaOficial;

            return [
                apo.nombre,
                apo.alumno,
                `$${totalAbonadoApo.toLocaleString('es-CL')}`,
                `${mesesPendientes} meses`,
                `$${deudaEstimada.toLocaleString('es-CL')}`
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

    const handleCerrarAnio = async () => {
        const confirmar = confirm(`¿Estás seguro de CERRAR DEFINITIVAMENTE el año escolar ${datos.anio_activo}?\n\n- No se permitirán más modificaciones en este año.\n- Se aperturará el año ${Number(datos.anio_activo) + 1} arrastrando el saldo final como saldo inicial.`);
        if (!confirmar) return;

        try {
            const res = await fetch('/api/curso/admin/cerrar-anio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                mostrarAvisoLocal('acciones', `Año ${datos.anio_activo} cerrado con éxito.`);
                onActualizar();
            } else {
                mostrarAvisoLocal('acciones', "Error al cerrar el año escolar.", "error");
            }
        } catch {
            mostrarAvisoLocal('acciones', "Error de conexión.", "error");
        }
    };

    const handleExonerarMes = async (apoderadoId, mes) => {
        try {
            const res = await fetch(`/api/curso/admin/pago/exonerar/${apoderadoId}/${mes}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                mostrarAvisoLocal('pagos', `Mes ${mes} actualizado.`);
                onActualizar();
            } else {
                mostrarAvisoLocal('pagos', "Error al alternar exoneración.", "error");
            }
        } catch {
            mostrarAvisoLocal('pagos', "Error de conexión.", "error");
        }
    };

    const handleEliminarPagoMes = async (apoderadoId, mes, montoActual) => {
        if (montoActual <= 0) return;
        try {
            const res = await fetch(`/api/curso/admin/pago/${apoderadoId}/${mes}`, { method: 'DELETE' });
            if (res.ok) {
                mostrarAvisoLocal('pagos', `Se revirtió el pago de ${mes}`);
                onActualizar();
            } else {
                mostrarAvisoLocal('pagos', "Error al revertir pago.", "error");
            }
        } catch {
            mostrarAvisoLocal('pagos', "Error de conexión.", "error");
        }
    };

    const handleEliminarApoderado = async (id, nombre) => {
        if (confirm(`¿Estás seguro de eliminar a ${nombre} y a su alumno? Se borrarán todos sus registros de pago del año actual.`)) {
            try {
                const res = await fetch(`/api/curso/admin/apoderado/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    mostrarAvisoLocal('pagos', `Apoderado ${nombre} eliminado.`);
                    onActualizar();
                } else {
                    mostrarAvisoLocal('pagos', "Error al eliminar apoderado.", "error");
                }
            } catch {
                mostrarAvisoLocal('pagos', "Error de conexión.", "error");
            }
        }
    };

    const handleGuardarEdicionApo = async (e) => {
        e.preventDefault();
        if (!editNombreApo.trim() || !editNombreAlu.trim()) {
            mostrarAvisoLocal('pagos', "Complete ambos campos.", "error");
            return;
        }

        try {
            const res = await fetch(`/api/curso/admin/apoderado/${idEditando}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: editNombreApo, alumno: editNombreAlu })
            });

            if (res.ok) {
                setModalEditarApo(false);
                mostrarAvisoLocal('pagos', "Apoderado y alumno modificados correctamente.");
                onActualizar();
            } else {
                mostrarAvisoLocal('pagos', "Error al guardar modificaciones.", "error");
            }
        } catch {
            mostrarAvisoLocal('pagos', "Error de conexión.", "error");
        }
    };

    const handleEnviarPagoGlobal = async (e) => {
        e.preventDefault();
        if (!montoPago || Number(montoPago) <= 0) {
            mostrarAvisoLocal('modalPago', "Ingrese un monto mayor a cero.", "error");
            return;
        }

        try {
            const res = await fetch('/api/curso/admin/pago-global', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apoderadoId: apoderadoSeleccionado.id,
                    montoEntregado: Number(montoPago),
                    fecha: fechaPago,
                    responsable: responsablePago
                })
            });

            if (res.ok) {
                setModalAbierto(false);
                mostrarAvisoLocal('pagos', "Pago registrado y distribuido.");
                onActualizar();
            } else {
                mostrarAvisoLocal('modalPago', "Error al registrar pago.", "error");
            }
        } catch {
            mostrarAvisoLocal('modalPago', "Error de conexión.", "error");
        }
    };

    return (
        <div className="space-y-8 relative">
            {/* ALERTA DE AÑO CERRADO */}
            {estaCerrado && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-2xl flex items-center justify-between shadow-xl">
                    <div className="flex items-center gap-3">
                        <i className="fa-solid fa-lock text-xl text-amber-400"></i>
                        <div>
                            <h4 className="font-bold text-sm">Año Escolar {datos.anio_activo} Cerrado</h4>
                            <p className="text-xs text-amber-300/80">Este periodo escolar se encuentra en modo histórico / solo lectura. Las modificaciones están bloqueadas.</p>
                        </div>
                    </div>
                    <span className="text-xs font-mono bg-amber-950/80 border border-amber-500/30 px-3 py-1 rounded-xl">Historial Bloqueado</span>
                </div>
            )}

            {/* BARRA DE HERRAMIENTAS */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-wrap justify-between items-center gap-3 relative">
                {avisosSeccion['acciones'] && (
                    <div className="absolute -top-10 left-0 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs px-3 py-1.5 rounded-xl shadow-lg z-50 animate-bounce">
                        {avisosSeccion['acciones'].texto}
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleExportarPDF}
                        className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow"
                    >
                        <i className="fa-solid fa-file-pdf text-sm"></i> Exportar Informe a PDF
                    </button>
                    <button 
                        onClick={() => window.open('/api/curso/backup', '_blank')}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow"
                    >
                        <i className="fa-solid fa-download text-sm"></i> Descargar Backup (.json)
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
                            if (res.ok) {
                                mostrarAvisoLocal('acciones', "Copia de seguridad restaurada.");
                                onActualizar();
                            }
                        }} 
                        accept=".json" 
                        className="hidden" 
                    />
                    <button 
                        onClick={() => fileInputRef.current.click()}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow"
                    >
                        <i className="fa-solid fa-upload text-sm"></i> Restaurar Backup
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    {!estaCerrado && (
                        <button 
                            onClick={handleCerrarAnio}
                            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
                            title="Cerrar definitivamente el año escolar y pasar al siguiente arrastrando saldos"
                        >
                            <i className="fa-solid fa-lock"></i> Cerrar Año Escolar {datos.anio_activo}
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
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 relative">
                {avisosSeccion['curso'] && (
                    <div className="absolute -top-3 right-5 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[11px] px-3 py-1 rounded-lg shadow-md z-10">
                        {avisosSeccion['curso'].texto}
                    </div>
                )}
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
                            body: JSON.stringify({ nombre_curso: nombreCurso, profesor: profesorCurso, presidente: presidenteCurso, tesorero: tesoreroCurso })
                        });
                        setEditandoInfoCurso(false);
                        mostrarAvisoLocal('curso', "Datos guardados.");
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

            {/* CABECERA, AÑO ACTIVO Y CONFIGURACIÓN */}
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
                                        body: JSON.stringify({ cuota_mensual: Number(cuotaInput) })
                                    });
                                    mostrarAvisoLocal('config', "Cuota actualizada.");
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
                                        body: JSON.stringify({ saldo_inicial: Number(saldoInicialEdit) })
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

            {/* BALANCE GENERAL */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl"><span className="text-[10px] text-slate-400 block">Saldo Anterior</span><span className="text-sm font-bold text-slate-200">${Number(datos.configuracion.saldo_inicial || 0).toLocaleString('es-CL')}</span></div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl"><span className="text-[10px] text-slate-400 block">Cuotas</span><span className="text-sm font-bold text-emerald-400">${totalCuotasRecaudadas.toLocaleString('es-CL')}</span></div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl"><span className="text-[10px] text-slate-400 block">Ingresos Extra</span><span className="text-sm font-bold text-sky-400">${totalIngresosExtra.toLocaleString('es-CL')}</span></div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl"><span className="text-[10px] text-slate-400 block">Gastos</span><span className="text-sm font-bold text-rose-400">${totalGastos.toLocaleString('es-CL')}</span></div>
                    <div className="bg-slate-950 border border-emerald-500/30 p-3 rounded-xl col-span-2 sm:col-span-1 bg-emerald-950/10"><span className="text-[10px] text-emerald-400 block font-semibold">Saldo Real</span><span className="text-sm font-extrabold text-emerald-400">${saldoRealCaja.toLocaleString('es-CL')}</span></div>
                </div>
            </div>

            {/* RESUMEN FINANCIERO POR ALUMNO */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2"><i className="fa-solid fa-chart-pie"></i> Resumen Financiero por Alumno (Ordenado por Apellido Paterno)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                            <tr>
                                <th className="p-3">Apoderado / Alumno</th>
                                <th className="p-3 text-center">Total Recaudado</th>
                                <th className="p-3 text-center">Meses Pendientes</th>
                                <th className="p-3 text-right">Deuda Estimada</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {[...datos.apoderados]
                                .sort(ordenarPorApellidoPaterno)
                                .map(apo => {
                                    let totalAbonado = 0;
                                    let mesesPendientes = 0;
                                    datos.configuracion.meses.forEach(m => {
                                        const p = apo.pagos[m];
                                        if (p?.exonerado) return;
                                        if (p && p.monto > 0) {
                                            totalAbonado += Number(p.monto);
                                            if (!p.pagado) mesesPendientes++;
                                        } else {
                                            mesesPendientes++;
                                        }
                                    });
                                    return (
                                        <tr key={apo.id} className={`hover:bg-slate-950/40 ${apo.activo === false ? 'opacity-50' : ''}`}>
                                            <td className="p-3">
                                                <span className="font-semibold text-white block">{apo.nombre} {apo.activo === false && '(Inactivo)'}</span>
                                                <span className="text-slate-400 text-[10px]">{apo.alumno}</span>
                                            </td>
                                            <td className="p-3 text-center font-bold text-emerald-400">${totalAbonado.toLocaleString('es-CL')}</td>
                                            <td className="p-3 text-center text-amber-400 font-medium">{mesesPendientes} meses</td>
                                            <td className="p-3 text-right font-bold text-rose-400">${(mesesPendientes * cuotaOficial).toLocaleString('es-CL')}</td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FORMULARIOS DE REGISTRO */}
            {!estaCerrado && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Gasto */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                        <h3 className="text-sm font-bold text-rose-400"><i className="fa-solid fa-receipt mr-1"></i> Registrar Gasto</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!gastoTitulo.trim() || !gastoMonto) return;
                            await fetch('/api/curso/admin/gasto', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ mes: gastoMes, titulo: gastoTitulo, monto: gastoMonto, fecha: gastoFecha })
                            });
                            setGastoTitulo(''); setGastoMonto(''); onActualizar();
                        }} className="space-y-3">
                            <input type="text" placeholder="Descripción..." value={gastoTitulo} onChange={(e) => setGastoTitulo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                            <div className="grid grid-cols-2 gap-2">
                                <select value={gastoMes} onChange={(e) => setGastoMes(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                                    {datos.configuracion.meses.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <input type="number" placeholder="Monto" value={gastoMonto} onChange={(e) => setGastoMonto(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                            </div>
                            <input type="date" value={gastoFecha} onChange={(e) => setGastoFecha(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
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
                                body: JSON.stringify({ titulo: extraTitulo, monto: extraMonto, fecha: extraFecha })
                            });
                            setExtraTitulo(''); setExtraMonto(''); onActualizar();
                        }} className="space-y-3">
                            <input type="text" placeholder="Concepto..." value={extraTitulo} onChange={(e) => setExtraTitulo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                            <input type="number" placeholder="Monto" value={extraMonto} onChange={(e) => setExtraMonto(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                            <input type="date" value={extraFecha} onChange={(e) => setExtraFecha(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-xl text-xs">Registrar Ingreso</button>
                        </form>
                    </div>

                    {/* Agregar Apoderado */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                        <h3 className="text-sm font-bold text-sky-400"><i className="fa-solid fa-user-plus mr-1"></i> Agregar Apoderado</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!nombreApoderado.trim() || !nombreAlumno.trim()) return;
                            await fetch('/api/curso/admin/apoderado/agregar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ nombre: nombreApoderado, alumno: nombreAlumno })
                            });
                            setNombreApoderado(''); setNombreAlumno(''); onActualizar();
                        }} className="space-y-3">
                            <input type="text" placeholder="Nombre Apoderado..." value={nombreApoderado} onChange={(e) => setNombreApoderado(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                            <input type="text" placeholder="Nombre Alumno..." value={nombreAlumno} onChange={(e) => setNombreAlumno(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                            <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold py-2 rounded-xl text-xs mt-6">Agregar</button>
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
                                <tr><th className="p-2">Fecha</th><th className="p-2">Descripción</th><th className="p-2 text-right">Monto</th>{!estaCerrado && <th className="p-2 text-center">Acción</th>}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {(datos.gastos || []).map(g => (
                                    <tr key={g.id}>
                                        <td className="p-2 text-slate-400 font-mono text-[10px]">{g.fecha}</td>
                                        <td className="p-2 text-white">{g.titulo}</td>
                                        <td className="p-2 text-right font-bold text-rose-400">${Number(g.monto).toLocaleString('es-CL')}</td>
                                        {!estaCerrado && (
                                            <td className="p-2 text-center">
                                                <button onClick={async () => {
                                                    await fetch(`/api/curso/admin/gasto/${g.id}`, { method: 'DELETE' });
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
                                                    await fetch(`/api/curso/admin/ingreso-extra/${e.id}`, { method: 'DELETE' });
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

            {/* GESTIÓN DE PAGOS MENSUALES */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-white"><i className="fa-solid fa-money-check-dollar mr-2"></i> Gestión de Pagos Mensuales</h3>
                <div className="grid grid-cols-1 gap-4">
                    {[...datos.apoderados]
                        .sort(ordenarPorApellidoPaterno)
                        .map(apo => (
                            <div key={apo.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-white text-sm">{apo.nombre} {apo.activo === false && <span className="text-rose-400 text-xs">(Inactivo)</span>}</h4>
                                            {!estaCerrado && (
                                                <button 
                                                    onClick={() => { setIdEditando(apo.id); setEditNombreApo(apo.nombre); setEditNombreAlu(apo.alumno); setModalEditarApo(true); }}
                                                    className="text-slate-400 hover:text-sky-400 text-xs p-1"
                                                >
                                                    <i className="fa-solid fa-pen-to-square"></i>
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-emerald-400 font-medium">Alumno: {apo.alumno}</p>
                                    </div>
                                    {!estaCerrado && (
                                        <div className="flex gap-2 w-full sm:w-auto items-center">
                                            <button 
                                                onClick={() => { setApoderadoSeleccionado(apo); setMontoPago(''); setResponsablePago(apo.nombre); setModalAbierto(true); }}
                                                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs"
                                            >
                                                Registrar Pago
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    await fetch(`/api/curso/admin/apoderado/estado/${apo.id}`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ activo: apo.activo === false })
                                                    });
                                                    onActualizar();
                                                }}
                                                className={`text-xs px-3 py-1.5 rounded-xl border ${apo.activo === false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}
                                            >
                                                {apo.activo === false ? 'Activar' : 'Ocultar'}
                                            </button>
                                            <button 
                                                onClick={() => handleEliminarApoderado(apo.id, apo.nombre)}
                                                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs px-3 py-1.5 rounded-xl"
                                            >
                                                <i className="fa-solid fa-trash-can"></i>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    {datos.configuracion.meses.map(mes => {
                                        const pago = apo.pagos[mes] || { pagado: false, monto: 0, exonerado: false, fecha: null };
                                        const montoAbonado = Number(pago.monto || 0);
                                        const esCompleto = pago.pagado && (montoAbonado >= cuotaOficial);

                                        return (
                                            <div key={mes} className={`border p-2.5 rounded-xl flex flex-col justify-between ${pago.exonerado ? 'bg-slate-950/40 border-slate-800/40 opacity-75' : 'bg-slate-950 border-slate-800'}`}>
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs font-semibold text-slate-300">{mes}</span>
                                                    <div className="flex items-center gap-1">
                                                        {!estaCerrado && montoAbonado === 0 && (
                                                            <button
                                                                onClick={() => handleExonerarMes(apo.id, mes)}
                                                                className={`text-[10px] px-1.5 py-0.5 rounded transition ${pago.exonerado ? 'bg-sky-500/20 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
                                                                title={pago.exonerado ? "Quitar exoneración" : "Exonerar este mes"}
                                                            >
                                                                <i className="fa-solid fa-ban"></i>
                                                            </button>
                                                        )}
                                                        {!estaCerrado && montoAbonado > 0 && (
                                                            <button onClick={() => handleEliminarPagoMes(apo.id, mes, montoAbonado)} className="text-slate-500 hover:text-rose-400 text-xs">
                                                                <i className="fa-solid fa-trash-can"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`text-[10px] font-medium mt-1 ${
                                                    pago.exonerado
                                                        ? 'text-sky-400 font-semibold'
                                                        : esCompleto
                                                        ? 'text-emerald-400'
                                                        : montoAbonado > 0
                                                        ? 'text-amber-400'
                                                        : 'text-slate-500'
                                                }`}>
                                                    {pago.exonerado ? 'Exonerado -' : esCompleto ? 'Pagado ✓' : montoAbonado > 0 ? `Abono: $${montoAbonado}` : 'Pendiente'}
                                                </span>
                                                {pago.fecha && !pago.exonerado && <span className="text-[9px] text-slate-400 mt-0.5">📅 {pago.fecha}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* MODALES */}
            {modalEditarApo && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleGuardarEdicionApo} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
                        <h3 className="text-sm font-bold text-white">Modificar Apoderado</h3>
                        <input type="text" value={editNombreApo} onChange={(e) => setEditNombreApo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" required />
                        <input type="text" value={editNombreAlu} onChange={(e) => setEditNombreAlu(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" required />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setModalEditarApo(false)} className="w-1/2 bg-slate-800 py-2 rounded-xl text-xs text-slate-300">Cancelar</button>
                            <button type="submit" className="w-1/2 bg-sky-500 py-2 rounded-xl text-xs text-slate-950 font-bold">Guardar</button>
                        </div>
                    </form>
                </div>
            )}

            {modalAbierto && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleEnviarPagoGlobal} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
                        <h3 className="text-sm font-bold text-white">Registrar Pago</h3>
                        <p className="text-xs text-slate-300">{apoderadoSeleccionado?.nombre} ({apoderadoSeleccionado?.alumno})</p>
                        <input type="number" placeholder="Monto" value={montoPago} onChange={(e) => setMontoPago(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" required autoFocus />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                            <input type="text" placeholder="Responsable" value={responsablePago} onChange={(e) => setResponsablePago(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setModalAbierto(false)} className="w-1/2 bg-slate-800 py-2 rounded-xl text-xs text-slate-300">Cancelar</button>
                            <button type="submit" className="w-1/2 bg-emerald-500 py-2 rounded-xl text-xs text-slate-950 font-bold">Guardar Pago</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}