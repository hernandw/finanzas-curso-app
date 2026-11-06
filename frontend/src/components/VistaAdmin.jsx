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

    // Saldo y Cuota
    const [saldoInicialEdit, setSaldoInicialEdit] = useState(datos.configuracion.saldo_inicial || 0);
    const [editandoSaldo, setEditandoSaldo] = useState(false);
    const [cuotaInput, setCuotaInput] = useState(datos.configuracion.cuota_mensual || 15000);

    // Datos del Curso unificados
    const [nombreCurso, setNombreCurso] = useState(datos.configuracion.nombre_curso || '4° Medio A');
    const [profesorCurso, setProfesorCurso] = useState(datos.configuracion.profesor || 'Juan Pérez');
    const [presidenteCurso, setPresidenteCurso] = useState(datos.configuracion.presidente || 'Ana Gómez');
    const [tesoreroCurso, setTesoreroCurso] = useState(datos.configuracion.tesorero || 'María González');
    const [editandoInfoCurso, setEditandoInfoCurso] = useState(false);

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

    // Notificaciones locales por sección
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
        datos.configuracion.meses.forEach(m => { if (apo.pagos[m]?.monto) sub += Number(apo.pagos[m].monto); });
        return acc + sub;
    }, 0);

    const saldoRealCaja = Number(datos.configuracion.saldo_inicial || 0) + totalCuotasRecaudadas + totalIngresosExtra - totalGastos;

    // Exportar a PDF con desglose claro de Ingresos, Egresos y Saldo en Caja
    const handleExportarPDF = () => {
        const doc = new jsPDF();
        const anioActual = datos.anio_activo;
        const saldoInicial = Number(datos.configuracion.saldo_inicial || 0);

        // --- ENCABEZADO DEL CURSO ---
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text(`Informe Financiero - Curso: ${datos.configuracion.nombre_curso || '4° Medio A'} (${anioActual})`, 14, 15);
        
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Profesor/a: ${datos.configuracion.profesor || 'N/A'} | Presidente/a: ${datos.configuracion.presidente || 'N/A'} | Tesorero/a: ${datos.configuracion.tesorero || 'N/A'}`, 14, 21);

        let currentY = 32;

        // --- RESUMEN FINANCIERO (SALDO INICIAL, INGRESOS, EGRESOS Y SALDO CAJA) ---
        const totalIngresosGral = totalCuotasRecaudadas + totalIngresosExtra;
        
        const resumenCajaData = [
            ['Saldo Inicial (Año Anterior)', `$${saldoInicial.toLocaleString('es-CL')}`],
            ['(+) Total Ingresos (Cuotas + Extras)', `+$${totalIngresosGral.toLocaleString('es-CL')}`],
            ['(-) Total Egresos (Gastos)', `-$${totalGastos.toLocaleString('es-CL')}`],
            ['(=) Saldo Real en Caja', `$${saldoRealCaja.toLocaleString('es-CL')}`]
        ];

        autoTable(doc, {
            startY: currentY,
            head: [['Concepto Financiero', 'Monto']],
            body: resumenCajaData,
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105] }, // Color slate-700
            styles: { fontSize: 9, fontStyle: 'bold' },
            didParseCell: (data) => {
                // Colorear el Total Ingresos en verde y Egresos en rojo
                if (data.section === 'body') {
                    if (data.row.index === 1 && data.column.index === 1) {
                        data.cell.styles.textColor = [16, 185, 129]; // Verde
                    }
                    if (data.row.index === 2 && data.column.index === 1) {
                        data.cell.styles.textColor = [225, 29, 72]; // Rojo
                    }
                    // Colorear el Saldo Real en Caja final (Verde si >= 0, Rojo si < 0)
                    if (data.row.index === 3 && data.column.index === 1) {
                        data.cell.styles.textColor = saldoRealCaja >= 0 ? [16, 185, 129] : [225, 29, 72];
                    }
                }
            }
        });

        currentY = doc.lastAutoTable.finalY + 10;

        // --- 1. RELACIÓN DE MOVIMIENTOS ---
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('1. Relación de Movimientos (Ingresos y Egresos)', 14, currentY);

        let movimientos = [
            ...(datos.gastos || []).map(g => ({ fecha: g.fecha || 'N/A', tipo: 'Egreso', desc: g.titulo, monto: -Number(g.monto) })),
            ...(datos.ingresos_extra || []).map(e => ({ fecha: e.fecha || 'N/A', tipo: 'Ingreso Extra', desc: e.titulo, monto: Number(e.monto) }))
        ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        let saldoAcumulado = saldoInicial;
        const filasMovimientos = movimientos.map(m => {
            saldoAcumulado += m.monto;
            return [
                m.fecha,
                m.tipo,
                m.desc,
                m.monto >= 0 ? `+$${m.monto.toLocaleString('es-CL')}` : `-$${Math.abs(m.monto).toLocaleString('es-CL')}`,
                `$${saldoAcumulado.toLocaleString('es-CL')}`
            ];
        });

        autoTable(doc, {
            startY: currentY + 3,
            head: [['Fecha', 'Tipo', 'Descripción', 'Monto', 'Saldo en Caja']],
            body: filasMovimientos.length > 0 ? filasMovimientos : [['-', '-', 'No hay movimientos', '-', '-']],
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 8 },
            didParseCell: (data) => {
                if (data.section === 'body' && (data.column.index === 3 || data.column.index === 4)) {
                    const textVal = data.cell.raw;
                    if (textVal && textVal.includes('-')) {
                        data.cell.styles.textColor = [225, 29, 72]; // Rojo
                        data.cell.styles.fontStyle = 'bold';
                    } else if (textVal && (textVal.includes('+') || (data.column.index === 4 && !textVal.includes('-')))) {
                        data.cell.styles.textColor = [16, 185, 129]; // Verde
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        currentY = doc.lastAutoTable.finalY + 10;

        // --- 2. ESTADO DE PAGOS Y ABONOS POR APODERADO ---
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('2. Estado de Pagos y Saldos por Apoderado', 14, currentY);

        const filasAlumnos = datos.apoderados.map(apo => {
            let totalAbonadoApo = 0;
            let mesesPendientes = 0;

            datos.configuracion.meses.forEach(mes => {
                const p = apo.pagos[mes];
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
            head: [['Apoderado', 'Alumno', 'Total Abonos', 'Deuda Pendiente', 'Saldo Deuda']],
            body: filasAlumnos,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 8 },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    if (data.column.index === 2) {
                        const textVal = data.cell.raw;
                        if (textVal && textVal !== '$0') {
                            data.cell.styles.textColor = [16, 185, 129]; // Verde
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                    if (data.column.index === 4) {
                        const textVal = data.cell.raw;
                        if (textVal && textVal !== '$0') {
                            data.cell.styles.textColor = [225, 29, 72]; // Rojo
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            }
        });

        doc.save(`Relacion_Tesoreria_${anioActual}.pdf`);
    };
    

    const handleDescargarBackup = async () => {
        try {
            const res = await fetch('/api/curso/backup');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_tesoreria_${datos.anio_activo}.json`;
            a.click();
            mostrarAvisoLocal('acciones', "Copia de seguridad descargada.");
        } catch (error) {
            mostrarAvisoLocal('acciones', "Error al generar backup.", "error");
        }
    };

    const handleRestaurarBackup = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const contenidoJson = JSON.parse(event.target.result);
                const res = await fetch('/api/curso/backup/restaurar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(contenidoJson)
                });
                if (res.ok) {
                    mostrarAvisoLocal('acciones', "Aplicación restaurada con éxito.");
                    onActualizar();
                } else {
                    mostrarAvisoLocal('acciones', "Archivo de backup no válido.", "error");
                }
            } catch (err) {
                mostrarAvisoLocal('acciones', "Error al leer JSON.", "error");
            }
        };
        reader.readAsText(file);
    };

    const handleBorrarAplicacion = async () => {
        if (confirm("⚠️ ¿Estás COMPLETAMENTE seguro de borrar todos los datos de la aplicación?")) {
            if (confirm("Confirma nuevamente para proceder al borrado total:")) {
                try {
                    const res = await fetch('/api/curso/reset', { method: 'DELETE' });
                    if (res.ok) {
                        mostrarAvisoLocal('acciones', "Aplicación reiniciada de fábrica.");
                        onActualizar();
                    } else {
                        mostrarAvisoLocal('acciones', "Error al reiniciar.", "error");
                    }
                } catch (error) {
                    mostrarAvisoLocal('acciones', "Error de conexión.", "error");
                }
            }
        }
    };

    const handleGuardarInfoCurso = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/curso/admin/configuracion', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    nombre_curso: nombreCurso, 
                    profesor: profesorCurso, 
                    presidente: presidenteCurso, 
                    tesorero: tesoreroCurso 
                })
            });
            if (res.ok) {
                setEditandoInfoCurso(false);
                mostrarAvisoLocal('curso', "Datos del curso guardados correctamente.");
                onActualizar();
            } else {
                mostrarAvisoLocal('curso', "Error al guardar datos del curso.", "error");
            }
        } catch (error) {
            mostrarAvisoLocal('curso', "Error de conexión.", "error");
        }
    };

    const handleActualizarCuota = async () => {
        const nuevaCuota = Number(cuotaInput);
        if (isNaN(nuevaCuota) || nuevaCuota <= 0) {
            mostrarAvisoLocal('config', "Ingrese cuota válida.", "error");
            return;
        }

        try {
            const res = await fetch('/api/curso/admin/configuracion', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cuota_mensual: nuevaCuota })
            });
            if (res.ok) {
                mostrarAvisoLocal('config', "Cuota actualizada y rebalanceada.");
                onActualizar();
            } else {
                mostrarAvisoLocal('config', "Error al actualizar cuota.", "error");
            }
        } catch (error) {
            mostrarAvisoLocal('config', "Error de conexión.", "error");
        }
    };

    const handleGuardarSaldoInicial = async () => {
        try {
            const res = await fetch('/api/curso/admin/configuracion', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ saldo_inicial: Number(saldoInicialEdit) })
            });
            if (res.ok) {
                setEditandoSaldo(false);
                mostrarAvisoLocal('config', "Saldo inicial actualizado.");
                onActualizar();
            } else {
                mostrarAvisoLocal('config', "Error al actualizar saldo.", "error");
            }
        } catch (error) {
            mostrarAvisoLocal('config', "Error de conexión.", "error");
        }
    };

    const handleRegistrarGasto = async (e) => {
        e.preventDefault();
        if (!gastoTitulo.trim() || !gastoMonto) {
            mostrarAvisoLocal('gasto', "Complete los campos del gasto.", "error");
            return;
        }

        try {
            const res = await fetch('/api/curso/admin/gasto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mes: gastoMes, titulo: gastoTitulo, monto: gastoMonto, fecha: gastoFecha })
            });

            if (res.ok) {
                setGastoTitulo('');
                setGastoMonto('');
                setGastoFecha(new Date().toISOString().slice(0, 10));
                mostrarAvisoLocal('gasto', "Gasto registrado correctamente.");
                onActualizar();
            } else {
                mostrarAvisoLocal('gasto', "Error al registrar gasto.", "error");
            }
        } catch (error) {
            mostrarAvisoLocal('gasto', "Error de conexión.", "error");
        }
    };

    const handleEliminarGasto = async (id) => {
        try {
            const res = await fetch(`/api/curso/admin/gasto/${id}`, { method: 'DELETE' });
            if (res.ok) {
                mostrarAvisoLocal('relacionGastos', "Gasto eliminado.");
                onActualizar();
            } else {
                mostrarAvisoLocal('relacionGastos', "Error al eliminar.", "error");
            }
        } catch (error) {
            mostrarAvisoLocal('relacionGastos', "Error de conexión.", "error");
        }
    };

    const handleRegistrarIngresoExtra = async (e) => {
        e.preventDefault();
        if (!extraTitulo.trim() || !extraMonto) {
            mostrarAvisoLocal('ingreso', "Complete los campos del ingreso.", "error");
            return;
        }

        try {
            const res = await fetch('/api/curso/admin/ingreso-extra', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo: extraTitulo, monto: extraMonto, fecha: extraFecha })
            });

            if (res.ok) {
                setExtraTitulo('');
                setExtraMonto('');
                setExtraFecha(new Date().toISOString().slice(0, 10));
                mostrarAvisoLocal('ingreso', "Ingreso extra registrado.");
                onActualizar();
            } else {
                mostrarAvisoLocal('ingreso', "Error al registrar ingreso.", "error");
            }
        } catch (error) {
            mostrarAvisoLocal('ingreso', "Error de conexión.", "error");
        }
    };

    const handleEliminarIngresoExtra = async (id) => {
        try {
            const res = await fetch(`/api/curso/admin/ingreso-extra/${id}`, { method: 'DELETE' });
            if (res.ok) {
                mostrarAvisoLocal('relacionIngresos', "Ingreso extra eliminado.");
                onActualizar();
            } else {
                mostrarAvisoLocal('relacionIngresos', "Error al eliminar.", "error");
            }
        } catch (error) {
            mostrarAvisoLocal('relacionIngresos', "Error de conexión.", "error");
        }
    };

    const abrirModalPago = (apo) => {
        setApoderadoSeleccionado(apo);
        setMontoPago('');
        setFechaPago(new Date().toISOString().slice(0, 10));
        setResponsablePago(apo.nombre);
        setModalAbierto(true);
    };

    const handleEnviarPagoGlobal = async (e) => {
        e.preventDefault();
        if (!montoPago || Number(montoPago) <= 0) {
            mostrarAvisoLocal('modalPago', "Ingrese monto válido.", "error");
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
        } catch (error) {
            mostrarAvisoLocal('modalPago', "Error de conexión.", "error");
        }
    };

    const handleEliminarPagoMes = async (apoderadoId, mes, montoActual) => {
        if (montoActual <= 0) return;
        try {
            const res = await fetch(`/api/curso/admin/pago/${apoderadoId}/${mes}`, { method: 'DELETE' });
            if (res.ok) {
                mostrarAvisoLocal('pagos', `Se eliminó el pago de ${mes}`);
                onActualizar();
            } else {
                mostrarAvisoLocal('pagos', "Error al eliminar pago.", "error");
            }
        } catch (error) {
            mostrarAvisoLocal('pagos', "Error de conexión.", "error");
        }
    };

    const handleAgregarApoderado = async (e) => {
        e.preventDefault();
        if (!nombreApoderado.trim() || !nombreAlumno.trim()) {
            mostrarAvisoLocal('apoderado', "Complete todos los campos.", "error");
            return;
        }

        try {
            const res = await fetch('/api/curso/admin/apoderado/agregar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nombreApoderado, alumno: nombreAlumno })
            });

            if (res.ok) {
                setNombreApoderado('');
                setNombreAlumno('');
                mostrarAvisoLocal('apoderado', "Apoderado agregado con éxito.");
                onActualizar();
            } else {
                mostrarAvisoLocal('apoderado', "Error al agregar apoderado.", "error");
            }
        } catch (error) {
            mostrarAvisoLocal('apoderado', "Error de conexión.", "error");
        }
    };

    const handleCambiarEstado = async (id, nombre, activoActual) => {
        const nuevoEstado = !activoActual;
        const accion = nuevoEstado ? "activado" : "ocultado";
        try {
            const res = await fetch(`/api/curso/admin/apoderado/estado/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activo: nuevoEstado })
            });
            if (res.ok) {
                mostrarAvisoLocal('pagos', `Apoderado ${accion}.`);
                onActualizar();
            } else {
                mostrarAvisoLocal('pagos', "Error al cambiar estado.", "error");
            }
        } catch (error) {
            mostrarAvisoLocal('pagos', "Error de conexión.", "error");
        }
    };

    return (
        <div className="space-y-8 relative">
            {/* BARRA DE HERRAMIENTAS: PDF, BACKUP Y RESTAURACIÓN */}
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
                        onClick={handleDescargarBackup}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow"
                    >
                        <i className="fa-solid fa-download text-sm"></i> Descargar Backup (.json)
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleRestaurarBackup} 
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
                <div>
                    <button 
                        onClick={handleBorrarAplicacion}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
                    >
                        <i className="fa-solid fa-trash-arrow-up"></i> Borrar / Reiniciar App
                    </button>
                </div>
            </div>

            {/* CONFIGURACIÓN DE LOS DATOS DEL CURSO */}
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
                    <button 
                        onClick={() => setEditandoInfoCurso(!editandoInfoCurso)}
                        className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5"
                    >
                        <i className={`fa-solid ${editandoInfoCurso ? 'fa-xmark' : 'fa-pen-to-square'}`}></i>
                        {editandoInfoCurso ? 'Cancelar' : 'Editar Datos'}
                    </button>
                </div>

                {editandoInfoCurso ? (
                    <form onSubmit={handleGuardarInfoCurso} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Nombre del Curso</label>
                            <input 
                                type="text"
                                value={nombreCurso}
                                onChange={(e) => setNombreCurso(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Profesor/a Jefe</label>
                            <input 
                                type="text"
                                value={profesorCurso}
                                onChange={(e) => setProfesorCurso(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Presidente/a</label>
                            <input 
                                type="text"
                                value={presidenteCurso}
                                onChange={(e) => setPresidenteCurso(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Tesorero/a</label>
                            <input 
                                type="text"
                                value={tesoreroCurso}
                                onChange={(e) => setTesoreroCurso(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                            />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                            <button type="submit" className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition">
                                Guardar Datos del Curso
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-300">
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                            <span className="text-[10px] text-slate-500 block">Curso:</span>
                            <span className="font-bold text-white text-sm">{datos.configuracion.nombre_curso || '4° Medio A'}</span>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                            <span className="text-[10px] text-slate-500 block">Profesor/a Jefe:</span>
                            <span className="font-bold text-emerald-400 text-sm">{datos.configuracion.profesor || 'No asignado'}</span>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                            <span className="text-[10px] text-slate-500 block">Presidente/a:</span>
                            <span className="font-bold text-sky-400 text-sm">{datos.configuracion.presidente || 'No asignado'}</span>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                            <span className="text-[10px] text-slate-500 block">Tesorero/a:</span>
                            <span className="font-bold text-amber-400 text-sm">{datos.configuracion.tesorero || 'No asignado'}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* CABECERA, AÑO Y CONFIGURACIÓN */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
                {avisosSeccion['config'] && (
                    <div className="absolute -top-3 right-5 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[11px] px-3 py-1 rounded-lg shadow-md z-10">
                        {avisosSeccion['config'].texto}
                    </div>
                )}
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <i className="fa-solid fa-lock text-emerald-400"></i> Panel de Administración ({datos.anio_activo})
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Gestión de tesorería, saldos, cuotas e ingresos del curso.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Cuota:</span>
                        <input 
                            type="number" 
                            value={cuotaInput}
                            onChange={(e) => setCuotaInput(e.target.value)}
                            className="bg-slate-900 text-emerald-400 font-bold text-xs w-20 px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
                        />
                        <button 
                            onClick={handleActualizarCuota}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-xs transition flex items-center gap-1"
                            title="Actualizar y rebalancear cuotas"
                        >
                            <i className="fa-solid fa-check"></i> Cambiar
                        </button>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Año:</span>
                        <select 
                            value={datos.anio_activo}
                            onChange={async (e) => {
                                const anioElegido = e.target.value;
                                await fetch('/api/curso/admin/cambiar-anio', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ nuevoAnio: anioElegido })
                                });
                                onActualizar();
                            }}
                            className="bg-slate-900 text-white font-bold text-xs px-2 py-1 rounded border border-slate-700 cursor-pointer"
                        >
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                            <option value="2027">2027</option>
                            <option value="2028">2028</option>
                        </select>

                        <button 
                            onClick={async () => {
                                const siguienteAnio = String(Number(datos.anio_activo) + 1);
                                await fetch('/api/curso/admin/cambiar-anio', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ nuevoAnio: siguienteAnio, cuotaMensual: cuotaOficial })
                                });
                                onActualizar();
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-1 rounded text-xs transition"
                        >
                            <i className="fa-solid fa-arrow-right"></i> Aperturar {Number(datos.anio_activo) + 1}
                        </button>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl flex items-center gap-3">
                        <div>
                            <span className="text-[9px] text-slate-400 block font-medium">Saldo Inicial</span>
                            {editandoSaldo ? (
                                <input 
                                    type="number"
                                    value={saldoInicialEdit}
                                    onChange={(e) => setSaldoInicialEdit(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 text-emerald-400 text-xs px-2 py-0.5 rounded w-24 font-bold mt-0.5"
                                    autoFocus
                                />
                            ) : (
                                <span className="text-xs font-bold text-emerald-400">
                                    ${Number(datos.configuracion.saldo_inicial || 0).toLocaleString('es-CL')}
                                </span>
                            )}
                        </div>
                        {editandoSaldo ? (
                            <button onClick={handleGuardarSaldoInicial} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-2.5 py-1 rounded text-[10px] transition">
                                OK
                            </button>
                        ) : (
                            <button onClick={() => setEditandoSaldo(true)} className="text-slate-400 hover:text-white text-xs">
                                <i className="fa-solid fa-pen"></i>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* BALANCE GENERAL / FLUJO DE CAJA */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <i className="fa-solid fa-scale-balanced"></i> Balance General y Flujo de Caja ({datos.anio_activo})
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Saldo Inicial</span>
                        <span className="text-sm font-bold text-slate-200">
                            ${Number(datos.configuracion.saldo_inicial || 0).toLocaleString('es-CL')}
                        </span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Cuotas Recaudadas</span>
                        <span className="text-sm font-bold text-emerald-400">
                            ${totalCuotasRecaudadas.toLocaleString('es-CL')}
                        </span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Ingresos Extra</span>
                        <span className="text-sm font-bold text-sky-400">
                            ${totalIngresosExtra.toLocaleString('es-CL')}
                        </span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Total Gastos</span>
                        <span className="text-sm font-bold text-rose-400">
                            ${totalGastos.toLocaleString('es-CL')}
                        </span>
                    </div>
                    <div className="bg-slate-950 border border-emerald-500/30 p-3 rounded-xl col-span-2 sm:col-span-1 bg-emerald-950/10">
                        <span className="text-[10px] text-emerald-400 block font-semibold">Saldo Real en Caja</span>
                        <span className="text-sm font-extrabold text-emerald-400">
                            ${saldoRealCaja.toLocaleString('es-CL')}
                        </span>
                    </div>
                </div>
            </div>

            {/* RESUMEN FINANCIERO POR ALUMNO */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                    <i className="fa-solid fa-chart-pie"></i> Resumen Financiero por Alumno
                </h3>
                
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
                            {datos.apoderados.map(apo => {
                                let totalPagadoApo = 0;
                                let mesesDebe = 0;
                                
                                datos.configuracion.meses.forEach(mes => {
                                    const p = apo.pagos[mes];
                                    if (p && p.monto > 0) {
                                        totalPagadoApo += Number(p.monto);
                                        if (!p.pagado) mesesDebe++;
                                    } else {
                                        mesesDebe++;
                                    }
                                });

                                const deudaTotal = mesesDebe * cuotaOficial;

                                return (
                                    <tr key={apo.id} className={`hover:bg-slate-950/40 ${apo.activo === false ? 'opacity-50' : ''}`}>
                                        <td className="p-3">
                                            <span className="font-semibold text-white block">{apo.nombre} {apo.activo === false && '(Inactivo)'}</span>
                                            <span className="text-slate-400 text-[10px]">{apo.alumno}</span>
                                        </td>
                                        <td className="p-3 text-center font-bold text-emerald-400">
                                            ${totalPagadoApo.toLocaleString('es-CL')}
                                        </td>
                                        <td className="p-3 text-center text-amber-400 font-medium">
                                            {mesesDebe} meses
                                        </td>
                                        <td className="p-3 text-right font-bold text-rose-400">
                                            ${deudaTotal.toLocaleString('es-CL')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FORMULARIOS DE REGISTRO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Gasto */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 relative">
                    {avisosSeccion['gasto'] && (
                        <div className="absolute -top-3 right-5 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[11px] px-3 py-1 rounded-lg shadow-md z-10">
                            {avisosSeccion['gasto'].texto}
                        </div>
                    )}
                    <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                        <i className="fa-solid fa-receipt"></i> Registrar Gasto
                    </h3>
                    <form onSubmit={handleRegistrarGasto} className="space-y-3">
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Descripción</label>
                            <input 
                                type="text" 
                                placeholder="Ej: Compra de materiales..."
                                value={gastoTitulo}
                                onChange={(e) => setGastoTitulo(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[11px] text-slate-400 block mb-1">Mes</label>
                                <select 
                                    value={gastoMes} 
                                    onChange={(e) => setGastoMes(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                                >
                                    {datos.configuracion.meses.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] text-slate-400 block mb-1">Monto ($)</label>
                                <input 
                                    type="number" 
                                    placeholder="0"
                                    value={gastoMonto}
                                    onChange={(e) => setGastoMonto(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Fecha del Gasto</label>
                            <div className="relative group cursor-pointer">
                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-rose-400">
                                    <i className="fa-solid fa-calendar-days text-sm"></i>
                                </span>
                                <input 
                                    type="date" 
                                    value={gastoFecha}
                                    onChange={(e) => setGastoFecha(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer uppercase font-mono"
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold py-2 rounded-xl text-xs transition">
                            Registrar Gasto
                        </button>
                    </form>
                </div>

                {/* Ingreso Extra */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 relative">
                    {avisosSeccion['ingreso'] && (
                        <div className="absolute -top-3 right-5 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[11px] px-3 py-1 rounded-lg shadow-md z-10">
                            {avisosSeccion['ingreso'].texto}
                        </div>
                    )}
                    <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                        <i className="fa-solid fa-coins"></i> Ingreso Extra (Ventas/Rifas)
                    </h3>
                    <form onSubmit={handleRegistrarIngresoExtra} className="space-y-3">
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Concepto / Descripción</label>
                            <input 
                                type="text" 
                                placeholder="Ej: Venta de rifa..."
                                value={extraTitulo}
                                onChange={(e) => setExtraTitulo(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Monto Recaudado ($)</label>
                            <input 
                                type="number" 
                                placeholder="0"
                                value={extraMonto}
                                onChange={(e) => setExtraMonto(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold text-emerald-400"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Fecha del Ingreso</label>
                            <div className="relative group cursor-pointer">
                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-emerald-400">
                                    <i className="fa-solid fa-calendar-days text-sm"></i>
                                </span>
                                <input 
                                    type="date" 
                                    value={extraFecha}
                                    onChange={(e) => setExtraFecha(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer uppercase font-mono"
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-xl text-xs transition mt-6">
                            Registrar Ingreso
                        </button>
                    </form>
                </div>

                {/* Apoderado */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 relative">
                    {avisosSeccion['apoderado'] && (
                        <div className="absolute -top-3 right-5 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[11px] px-3 py-1 rounded-lg shadow-md z-10">
                            {avisosSeccion['apoderado'].texto}
                        </div>
                    )}
                    <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                        <i className="fa-solid fa-user-plus"></i> Agregar Apoderado
                    </h3>
                    <form onSubmit={handleAgregarApoderado} className="space-y-3">
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Nombre del Apoderado</label>
                            <input 
                                type="text" 
                                placeholder="Nombre completo..."
                                value={nombreApoderado}
                                onChange={(e) => setNombreApoderado(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Nombre del Alumno</label>
                            <input 
                                type="text" 
                                placeholder="Alumno..."
                                value={nombreAlumno}
                                onChange={(e) => setNombreAlumno(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold py-2 rounded-xl text-xs transition mt-6">
                            Agregar Apoderado
                        </button>
                    </form>
                </div>
            </div>

            {/* TABLAS DETALLADAS DE GASTOS E INGRESOS EXTRA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Relación de Gastos */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 relative">
                    {avisosSeccion['relacionGastos'] && (
                        <div className="absolute -top-3 right-5 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[11px] px-3 py-1 rounded-lg shadow-md z-10">
                            {avisosSeccion['relacionGastos'].texto}
                        </div>
                    )}
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                            <i className="fa-solid fa-receipt"></i> Relación de Gastos
                        </h3>
                        <span className="text-xs text-slate-300 font-medium">Total: <strong className="text-rose-400">${totalGastos.toLocaleString('es-CL')}</strong></span>
                    </div>
                    <div className="overflow-x-auto max-h-60 overflow-y-auto">
                        {datos.gastos && datos.gastos.length > 0 ? (
                            <table className="w-full text-left text-xs text-slate-300">
                                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                                    <tr>
                                        <th className="p-2">Fecha</th>
                                        <th className="p-2">Descripción</th>
                                        <th className="p-2 text-right">Monto</th>
                                        <th className="p-2 text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {datos.gastos.map(g => (
                                        <tr key={g.id} className="hover:bg-slate-950/40">
                                            <td className="p-2 text-slate-400 font-mono text-[10px]">{g.fecha}</td>
                                            <td className="p-2 font-semibold text-white">{g.titulo} <span className="text-[10px] text-slate-400">({g.mes})</span></td>
                                            <td className="p-2 text-right font-bold text-rose-400">${Number(g.monto).toLocaleString('es-CL')}</td>
                                            <td className="p-2 text-center">
                                                <button onClick={() => handleEliminarGasto(g.id)} className="text-slate-500 hover:text-rose-400 transition" title="Eliminar gasto">
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <p className="text-xs text-slate-500 text-center py-4">No hay gastos registrados.</p>}
                    </div>
                </div>

                {/* Relación de Ingresos Extra */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 relative">
                    {avisosSeccion['relacionIngresos'] && (
                        <div className="absolute -top-3 right-5 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[11px] px-3 py-1 rounded-lg shadow-md z-10">
                            {avisosSeccion['relacionIngresos'].texto}
                        </div>
                    )}
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                            <i className="fa-solid fa-coins"></i> Relación de Ingresos Extra
                        </h3>
                        <span className="text-xs text-slate-300 font-medium">Total: <strong className="text-emerald-400">${totalIngresosExtra.toLocaleString('es-CL')}</strong></span>
                    </div>
                    <div className="overflow-x-auto max-h-60 overflow-y-auto">
                        {datos.ingresos_extra && datos.ingresos_extra.length > 0 ? (
                            <table className="w-full text-left text-xs text-slate-300">
                                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                                    <tr>
                                        <th className="p-2">Fecha</th>
                                        <th className="p-2">Concepto</th>
                                        <th className="p-2 text-right">Monto</th>
                                        <th className="p-2 text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {datos.ingresos_extra.map(e => (
                                        <tr key={e.id} className="hover:bg-slate-950/40">
                                            <td className="p-2 text-slate-400 font-mono text-[10px]">{e.fecha}</td>
                                            <td className="p-2 font-semibold text-white">{e.titulo}</td>
                                            <td className="p-2 text-right font-bold text-emerald-400">${Number(e.monto).toLocaleString('es-CL')}</td>
                                            <td className="p-2 text-center">
                                                <button onClick={() => handleEliminarIngresoExtra(e.id)} className="text-slate-500 hover:text-rose-400 transition" title="Eliminar ingreso extra">
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <p className="text-xs text-slate-500 text-center py-4">No hay ingresos extra registrados.</p>}
                    </div>
                </div>
            </div>

            {/* GESTIÓN DE PAGOS MENSUALES */}
            <div className="space-y-4 relative">
                {avisosSeccion['pagos'] && (
                    <div className="absolute -top-3 right-5 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[11px] px-3 py-1 rounded-lg shadow-md z-10">
                        {avisosSeccion['pagos'].texto}
                    </div>
                )}
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-money-check-dollar"></i> Gestión de Pagos Mensuales por Apoderado
                </h3>

                <div className="grid grid-cols-1 gap-4">
                    {datos.apoderados.map(apo => (
                        <div key={apo.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                                <div>
                                    <h4 className="font-bold text-white text-sm">
                                        {apo.nombre} {apo.activo === false && <span className="text-rose-400 text-xs">(Inactivo)</span>}
                                    </h4>
                                    <p className="text-xs text-emerald-400 font-medium">Alumno: {apo.alumno}</p>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button 
                                        onClick={() => abrirModalPago(apo)}
                                        className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                                    >
                                        <i className="fa-solid fa-plus"></i> Registrar Pago / Abono
                                    </button>
                                    <button 
                                        onClick={() => handleCambiarEstado(apo.id, apo.nombre, apo.activo !== false)}
                                        className={`text-xs px-3 py-1.5 rounded-xl border transition ${apo.activo === false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'}`}
                                    >
                                        {apo.activo === false ? 'Activar' : 'Ocultar'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {datos.configuracion.meses.map(mes => {
                                    const pago = apo.pagos[mes] || { pagado: false, monto: 0, fecha: null };
                                    const montoAbonado = Number(pago.monto || 0);
                                    const esCompleto = pago.pagado && (montoAbonado >= cuotaOficial);

                                    return (
                                        <div key={mes} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex flex-col justify-between space-y-2">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs font-semibold text-slate-300">{mes}</span>
                                                    {montoAbonado > 0 && (
                                                        <button 
                                                            onClick={() => handleEliminarPagoMes(apo.id, mes, montoAbonado)}
                                                            className="text-slate-500 hover:text-rose-400 transition text-xs"
                                                            title="Eliminar este pago o abono"
                                                        >
                                                            <i className="fa-solid fa-trash-can"></i>
                                                        </button>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] block font-medium mt-0.5 ${esCompleto ? 'text-emerald-400' : montoAbonado > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                                    {esCompleto ? 'Pagado ✓' : montoAbonado > 0 ? `Abono: $${montoAbonado}` : 'Pendiente'}
                                                </span>
                                                {pago.fecha && (
                                                    <span className="text-[9px] text-slate-400 block mt-1">
                                                        📅 {pago.fecha}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL DE REGISTRO DE PAGO / ABONO GLOBAL */}
            {modalAbierto && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 relative">
                        {avisosSeccion['modalPago'] && (
                            <div className="absolute top-2 right-4 bg-rose-950/90 border border-rose-500/50 text-rose-300 text-[11px] px-3 py-1 rounded-lg">
                                {avisosSeccion['modalPago'].texto}
                            </div>
                        )}
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <i className="fa-solid fa-cash-register text-emerald-400"></i> Registrar Pago / Abono
                            </h3>
                            <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-white">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <div className="text-xs text-slate-300">
                            <p>Apoderado: <strong className="text-white">{apoderadoSeleccionado?.nombre}</strong></p>
                            <p>Alumno: <strong className="text-emerald-400">{apoderadoSeleccionado?.alumno}</strong></p>
                        </div>

                        <form onSubmit={handleEnviarPagoGlobal} className="space-y-3">
                            <div>
                                <label className="text-[11px] text-slate-400 block mb-1">Monto Entregado ($)</label>
                                <input 
                                    type="number" 
                                    placeholder="Ej: 45000"
                                    value={montoPago}
                                    onChange={(e) => setMontoPago(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold text-emerald-400"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[11px] text-slate-400 block mb-1">Fecha de Pago</label>
                                    <div className="relative group cursor-pointer">
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-emerald-400">
                                            <i className="fa-solid fa-calendar-days text-sm"></i>
                                        </span>
                                        <input 
                                            type="date" 
                                            value={fechaPago}
                                            onChange={(e) => setFechaPago(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer uppercase font-mono"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[11px] text-slate-400 block mb-1">Persona que paga</label>
                                    <input 
                                        type="text" 
                                        placeholder="Nombre..."
                                        value={responsablePago}
                                        onChange={(e) => setResponsablePago(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-3">
                                <button 
                                    type="button" 
                                    onClick={() => setModalAbierto(false)}
                                    className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs transition"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="w-1/2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-xl text-xs transition"
                                >
                                    Guardar Pago
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}