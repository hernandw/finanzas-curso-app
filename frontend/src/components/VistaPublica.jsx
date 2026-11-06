// src/components/VistaPublica.jsx
import React, { useState } from 'react';

export default function VistaPublica({ datos }) {
    if (!datos || !datos.apoderados) {
        return (
            <div className="flex items-center justify-center p-8 text-slate-400 text-xs">
                <i className="fa-solid fa-spinner animate-spin mr-2"></i> Cargando información del curso...
            </div>
        );
    }

    const [busqueda, setBusqueda] = useState('');

    const apoderadosFiltrados = datos.apoderados.filter(a => 
        (a.activo !== false) && (
            a.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
            a.alumno.toLowerCase().includes(busqueda.toLowerCase())
        )
    );

    const cuotaOficial = datos.configuracion?.cuota_mensual || 15000;
    const totalGastos = datos.gastos ? datos.gastos.reduce((acc, g) => acc + Number(g.monto), 0) : 0;

    return (
        <div className="space-y-6">
            {/* Cabecera y Cuota Fija del Año */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <i className="fa-solid fa-clipboard-user text-emerald-400"></i> Estado General de Cuotas y Gastos
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Cuota mensual fija del año: <strong className="text-emerald-400 font-semibold">${Number(cuotaOficial).toLocaleString('es-CL')}</strong>
                    </p>
                </div>
                <div className="w-full sm:w-auto">
                    <input 
                        type="text"
                        placeholder="Buscar por apoderado o alumno..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full sm:w-64 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
                    />
                </div>
            </div>

            {/* SECCIÓN DE GASTOS GENERALES */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                        <i className="fa-solid fa-receipt"></i> Gastos Registrados del Curso
                    </h3>
                    <span className="text-xs text-slate-300 font-medium">
                        Total Gastos: <strong className="text-rose-400">${totalGastos.toLocaleString('es-CL')}</strong>
                    </span>
                </div>

                <div className="overflow-x-auto">
                    {datos.gastos && datos.gastos.length > 0 ? (
                        <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                                <tr>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Descripción</th>
                                    <th className="p-3">Mes Asociado</th>
                                    <th className="p-3 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {datos.gastos.map(gasto => (
                                    <tr key={gasto.id} className="hover:bg-slate-950/40">
                                        <td className="p-3 text-slate-400 font-mono text-[11px]">{gasto.fecha || 'N/A'}</td>
                                        <td className="p-3 font-semibold text-white">{gasto.titulo}</td>
                                        <td className="p-3 text-slate-300">{gasto.mes}</td>
                                        <td className="p-3 text-right font-bold text-rose-400">
                                            ${Number(gasto.monto).toLocaleString('es-CL')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-xs text-slate-500 text-center py-4">No hay gastos generales registrados todavía.</p>
                    )}
                </div>
            </div>

            {/* TARJETAS DETALLADAS POR APODERADO */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2 px-1">
                    <i className="fa-solid fa-users"></i> Estado de Pagos por Apoderado ({apoderadosFiltrados.length})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {apoderadosFiltrados.length > 0 ? (
                        apoderadosFiltrados.map(apo => {
                            let totalPagadoApo = 0;
                            datos.configuracion.meses.forEach(mes => {
                                const p = apo.pagos[mes];
                                if (p && p.monto) totalPagadoApo += Number(p.monto);
                            });

                            return (
                                <div key={apo.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 hover:border-slate-700 transition flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start border-b border-slate-800 pb-3 mb-3">
                                            <div>
                                                <h3 className="font-bold text-white text-sm">{apo.nombre}</h3>
                                                <p className="text-xs text-emerald-400 font-semibold mt-0.5">Alumno: {apo.alumno}</p>
                                            </div>
                                            <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-300 px-2 py-1 rounded-lg font-medium">
                                                Total: ${totalPagadoApo.toLocaleString('es-CL')}
                                            </span>
                                        </div>

                                        {/* Cuadrícula de meses en formato de tarjetas */}
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            {datos.configuracion.meses.map(mes => {
                                                const pago = apo.pagos[mes] || { pagado: false, monto: 0, fecha: null };
                                                const montoAbonado = Number(pago.monto || 0);
                                                const esCompleto = pago.pagado && (montoAbonado >= cuotaOficial);
                                                const esAbono = !esCompleto && (montoAbonado > 0);

                                                return (
                                                    <div key={mes} className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl flex flex-col justify-between space-y-1">
                                                        <span className="text-[11px] font-medium text-slate-400">{mes}</span>
                                                        <div className="mt-1">
                                                            {esCompleto ? (
                                                                <span className="inline-block w-full text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-0.5 rounded text-[10px] font-bold">
                                                                    Pagado ✓
                                                                </span>
                                                            ) : esAbono ? (
                                                                <span className="inline-block w-full text-center bg-amber-500/10 text-amber-400 border border-amber-500/20 py-0.5 rounded text-[10px] font-bold" title={`Abonó $${montoAbonado.toLocaleString('es-CL')}`}>
                                                                    Abono (${montoAbonado.toLocaleString('es-CL')})
                                                                </span>
                                                            ) : (
                                                                <span className="inline-block w-full text-center bg-rose-500/10 text-rose-400 border border-rose-500/20 py-0.5 rounded text-[10px] font-bold">
                                                                    Pendiente ✗
                                                                </span>
                                                            )}
                                                        </div>
                                                        {pago.fecha && (
                                                            <span className="text-[9px] text-slate-400 block text-center mt-0.5">
                                                                📅 {pago.fecha}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-12 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
                            No se encontraron apoderados con ese criterio de búsqueda.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}