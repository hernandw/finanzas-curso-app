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

    const cuotaOficial = datos.configuracion.cuota_mensual || 15000;

    // 1. Registrar o abonar pago con fecha acumulativa
    const handleRegistrarPago = async (apoderadoId, mes, montoActual) => {
        const montoIngresado = prompt(`Ingrese el monto a pagar/abonar para ${mes}:`, cuotaOficial);
        if (montoIngresado === null) return;

        const montoNum = Number(montoIngresado);
        if (isNaN(montoNum) || montoNum <= 0) {
            alert("Por favor ingrese un monto válido.");
            return;
        }

        try {
            const res = await fetch('/api/curso/admin/pago', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apoderadoId,
                    mes,
                    pagado: true,
                    monto: montoNum
                })
            });

            if (res.ok) {
                onActualizar();
            } else {
                alert("Error al registrar el pago.");
            }
        } catch (error) {
            alert("Error de conexión con el servidor.");
        }
    };

    // 2. Agregar nuevo apoderado
    const handleAgregarApoderado = async (e) => {
        e.preventDefault();
        if (!nombreApoderado.trim() || !nombreAlumno.trim()) {
            alert("Complete todos los campos.");
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
                onActualizar();
            } else {
                alert("Error al agregar apoderado.");
            }
        } catch (error) {
            alert("Error de conexión.");
        }
    };

    // 3. Registrar gasto general
    const handleRegistrarGasto = async (e) => {
        e.preventDefault();
        if (!gastoTitulo.trim() || !gastoMonto) {
            alert("Complete los campos del gasto.");
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
                onActualizar();
            } else {
                alert("Error al registrar gasto.");
            }
        } catch (error) {
            alert("Error de conexión.");
        }
    };

    // 4. Cambiar estado (Ocultar / Activar en lugar de eliminar)
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
                    onActualizar();
                } else {
                    alert("Error al cambiar el estado.");
                }
            } catch (error) {
                alert("Error de conexión.");
            }
        }
    };

    return (
        <div className="space-y-8">
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
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-money-check-dollar"></i> Gestión de Pagos Mensuales por Apoderado
                </h3>

                <div className="grid grid-cols-1 gap-4">
                    {datos.apoderados.map(apo => (
                        <div key={apo.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                                <div>
                                    <h4 className="font-bold text-white text-sm">
                                        {apo.nombre} {apo.activo === false && <span className="text-rose-400 text-xs">(Inactivo)</span>}
                                    </h4>
                                    <p className="text-xs text-emerald-400 font-medium">Alumno: {apo.alumno}</p>
                                </div>
                                <button 
                                    onClick={() => handleCambiarEstado(apo.id, apo.nombre, apo.activo !== false)}
                                    className={`text-xs px-3 py-1.5 rounded-xl border transition ${apo.activo === false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'}`}
                                >
                                    {apo.activo === false ? 'Activar Apoderado' : 'Ocultar / Retirar'}
                                </button>
                            </div>

                            {/* Meses, montos abonados y fechas */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {datos.configuracion.meses.map(mes => {
                                    const pago = apo.pagos[mes] || { pagado: false, monto: 0, fecha: null };
                                    const montoAbonado = Number(pago.monto || 0);
                                    const esCompleto = pago.pagado && (montoAbonado >= cuotaOficial);

                                    return (
                                        <div key={mes} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex flex-col justify-between space-y-2">
                                            <div>
                                                <span className="text-xs font-semibold text-slate-300 block">{mes}</span>
                                                <span className={`text-[10px] block font-medium mt-0.5 ${esCompleto ? 'text-emerald-400' : montoAbonado > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                                    {esCompleto ? 'Pagado ✓' : montoAbonado > 0 ? `Abono: $${montoAbonado}` : 'Pendiente'}
                                                </span>
                                                {pago.fecha && (
                                                    <span className="text-[9px] text-slate-400 block mt-1">
                                                        📅 {pago.fecha}
                                                    </span>
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => handleRegistrarPago(apo.id, mes, montoAbonado)}
                                                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 py-1 rounded-lg text-[10px] font-medium transition"
                                            >
                                                {montoAbonado > 0 ? 'Modificar / Abonar' : 'Registrar Pago'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}