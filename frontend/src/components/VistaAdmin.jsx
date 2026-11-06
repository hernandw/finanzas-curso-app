// src/components/VistaAdmin.jsx
import React, { useState } from 'react';

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
    
    const [gastoMes, setGastoMes] = useState(datos.configuracion.meses[0]);
    const [gastoTitulo, setGastoTitulo] = useState('');
    const [gastoMonto, setGastoMonto] = useState('');

    // Estados para el Modal de Pago Global
    const [modalAbierto, setModalAbierto] = useState(false);
    const [apoderadoSeleccionado, setApoderadoSeleccionado] = useState(null);
    const [montoPago, setMontoPago] = useState('');
    const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
    const [responsablePago, setResponsablePago] = useState('');

    // Estado para Notificaciones Temporales (Toast)
    const [notificacion, setNotificacion] = useState(null); // { texto: '...', tipo: 'success' | 'error' }

    const mostrarAviso = (texto, tipo = 'success') => {
        setNotificacion({ texto, tipo });
        setTimeout(() => {
            setNotificacion(null);
        }, 3500); // Desaparece a los 3.5 segundos
    };

    const cuotaOficial = datos.configuracion.cuota_mensual || 15000;

    // Abrir modal de pago
    const abrirModalPago = (apo) => {
        setApoderadoSeleccionado(apo);
        setMontoPago('');
        setFechaPago(new Date().toISOString().slice(0, 10));
        setResponsablePago(apo.nombre);
        setModalAbierto(true);
    };

    // Enviar pago global con distribución automática
    const handleEnviarPagoGlobal = async (e) => {
        e.preventDefault();
        if (!montoPago || Number(montoPago) <= 0) {
            mostrarAviso("Ingrese un monto válido.", "error");
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
                mostrarAviso("Pago registrado y distribuido correctamente.");
                onActualizar();
            } else {
                mostrarAviso("Error al registrar el pago.", "error");
            }
        } catch (error) {
            mostrarAviso("Error de conexión con el servidor.", "error");
        }
    };

    // Eliminar / Revertir pago de un mes
    const handleEliminarPagoMes = async (apoderadoId, mes, montoActual) => {
        if (montoActual <= 0) return;
        if (confirm(`¿Estás seguro de eliminar el registro de pago de ${mes}?`)) {
            try {
                const res = await fetch(`/api/curso/admin/pago/${apoderadoId}/${mes}`, {
                    method: 'DELETE'
                });

                if (res.ok) {
                    mostrarAviso(`Se eliminó el registro de ${mes}`);
                    onActualizar();
                } else {
                    mostrarAviso("Error al eliminar el pago.", "error");
                }
            } catch (error) {
                mostrarAviso("Error de conexión con el servidor.", "error");
            }
        }
    };

    // Agregar nuevo apoderado
    const handleAgregarApoderado = async (e) => {
        e.preventDefault();
        if (!nombreApoderado.trim() || !nombreAlumno.trim()) {
            mostrarAviso("Complete todos los campos del apoderado.", "error");
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
                mostrarAviso("Apoderado agregado exitosamente.");
                onActualizar();
            } else {
                mostrarAviso("Error al agregar apoderado.", "error");
            }
        } catch (error) {
            mostrarAviso("Error de conexión.", "error");
        }
    };

    // Registrar gasto general
    const handleRegistrarGasto = async (e) => {
        e.preventDefault();
        if (!gastoTitulo.trim() || !gastoMonto) {
            mostrarAviso("Complete los campos del gasto.", "error");
            return;
        }

        try {
            const res = await fetch('/api/curso/admin/gasto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mes: gastoMes, titulo: gastoTitulo, monto: gastoMonto })
            });

            if (res.ok) {
                setGastoTitulo('');
                setGastoMonto('');
                mostrarAviso("Gasto registrado correctamente.");
                onActualizar();
            } else {
                mostrarAviso("Error al registrar gasto.", "error");
            }
        } catch (error) {
            mostrarAviso("Error de conexión.", "error");
        }
    };

    // Cambiar estado (Ocultar / Activar)
    const handleCambiarEstado = async (id, nombre, activoActual) => {
        const accion = activoActual ? "ocultar" : "activar";
        if (confirm(`¿Estás seguro de ${accion} a ${nombre}? Se mantendrá su historial.`)) {
            try {
                const res = await fetch(`/api/curso/admin/apoderado/estado/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activo: !activoActual })
                });
                if (res.ok) {
                    mostrarAviso(`Apoderado ${accion}do exitosamente.`);
                    onActualizar();
                } else {
                    mostrarAviso("Error al cambiar el estado.", "error");
                }
            } catch (error) {
                mostrarAviso("Error de conexión.", "error");
            }
        }
    };

    return (
        <div className="space-y-8 relative">
            {/* NOTIFICACIÓN FLOTANTE TEMPORAL (TOAST) */}
            {notificacion && (
                <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-2 transition-all duration-300 animate-bounce ${
                    notificacion.tipo === 'error' 
                        ? 'bg-rose-950/90 border-rose-500/50 text-rose-300' 
                        : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                }`}>
                    <i className={`fa-solid ${notificacion.tipo === 'error' ? 'fa-circle-exclamation text-rose-400' : 'fa-circle-check text-emerald-400'}`}></i>
                    {notificacion.texto}
                </div>
            )}

            {/* Cabecera Admin */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <i className="fa-solid fa-lock text-emerald-400"></i> Panel de Administración - Tesorería
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Cuota mensual oficial: <strong className="text-emerald-400">${cuotaOficial.toLocaleString('es-CL')}</strong>
                    </p>
                </div>
            </div>

            {/* SECCIÓN 1: RESUMEN DE PAGOS Y DEUDAS POR ALUMNO */}
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

            {/* SECCIÓN 2: FORMULARIOS DE REGISTRO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Registrar Gasto */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                    <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                        <i className="fa-solid fa-receipt"></i> Registrar Gasto del Curso
                    </h3>
                    <form onSubmit={handleRegistrarGasto} className="space-y-3">
                        <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Descripción del gasto</label>
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
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
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
                        <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold py-2 rounded-xl text-xs transition">
                            Registrar Gasto
                        </button>
                    </form>
                </div>

                {/* Agregar Apoderado */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                    <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                        <i className="fa-solid fa-user-plus"></i> Agregar Nuevo Apoderado
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
                                placeholder="Nombre completo del alumno..."
                                value={nombreAlumno}
                                onChange={(e) => setNombreAlumno(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-xl text-xs transition mt-6">
                            Agregar Apoderado
                        </button>
                    </form>
                </div>
            </div>

            {/* SECCIÓN 3: GESTIÓN DE PAGOS Y ESTADO DE APODERADOS */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <i className="fa-solid fa-money-check-dollar"></i> Gestión de Pagos Mensuales por Apoderado
                    </h3>
                </div>

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

                            {/* Meses, montos abonados y botón de eliminar pago */}
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
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
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
                                <p className="text-[10px] text-slate-500 mt-1">El sistema distribuirá automáticamente este dinero cubriendo las cuotas mensuales en orden cronológico.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[11px] text-slate-400 block mb-1">Fecha de Pago</label>
                                    <input 
                                        type="date" 
                                        value={fechaPago}
                                        onChange={(e) => setFechaPago(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                    />
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