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
    const saldoInicial = Number(datos.configuracion?.saldo_inicial || 0);
    const totalGastos = datos.gastos ? datos.gastos.reduce((acc, g) => acc + Number(g.monto), 0) : 0;
    const totalIngresosExtra = datos.ingresos_extra ? datos.ingresos_extra.reduce((acc, e) => acc + Number(e.monto), 0) : 0;
    
    const totalCuotasRecaudadas = datos.apoderados.reduce((acc, apo) => {
        let sub = 0;
        datos.configuracion.meses.forEach(m => { if (apo.pagos[m]?.monto) sub += Number(apo.pagos[m].monto); });
        return acc + sub;
    }, 0);

    const saldoRealCaja = saldoInicial + totalCuotasRecaudadas + totalIngresosExtra - totalGastos;

    return (
        <div className="space-y-6">
            {/* CABECERA INFORMATIVA DEL CURSO (SOLO LECTURA) */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                        Periodo {datos.anio_activo}
                    </span>
                    <h2 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                        <i className="fa-solid fa-school text-sky-400"></i> Tesorería Oficial - {datos.configuracion.nombre_curso || '4° Medio A'}
                    </h2>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400 mt-2">
                        <span><strong className="text-slate-300">Profesor/a:</strong> {datos.configuracion.profesor || 'No asignado'}</span>
                        <span>•</span>
                        <span><strong className="text-slate-300">Presidente/a:</strong> {datos.configuracion.presidente || 'No asignado'}</span>
                        <span>•</span>
                        <span><strong className="text-slate-300">Tesorero/a:</strong> {datos.configuracion.tesorero || 'No asignado'}</span>
                        <span>•</span>
                        <span><strong className="text-emerald-400">Cuota Mensual:</strong> ${Number(cuotaOficial).toLocaleString('es-CL')}</span>
                    </div>
                </div>
                <div className="w-full md:w-auto">
                    <input 
                        type="text"
                        placeholder="Buscar por apoderado o alumno..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full md:w-64 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
                    />
                </div>
            </div>

            {/* BALANCE GENERAL Y FLUJO DE CAJA */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <i className="fa-solid fa-scale-balanced"></i> Balance General y Flujo de Caja
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Saldo Anterior</span>
                        <span className="text-sm font-bold text-slate-200">
                            ${saldoInicial.toLocaleString('es-CL')}
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
                        <span className="text-[10px] text-slate-400 block">Total Egresos (Gastos)</span>
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

            {/* SECCIÓN DE GASTOS E INGRESOS EXTRA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                            <i className="fa-solid fa-receipt"></i> Relación de Gastos
                        </h3>
                        <span className="text-xs text-slate-300 font-medium">Total: <strong className="text-rose-400">${totalGastos.toLocaleString('es-CL')}</strong></span>
                    </div>
                    <div className="overflow-x-auto max-h-48 overflow-y-auto">
                        {datos.gastos && datos.gastos.length > 0 ? (
                            <table className="w-full text-left text-xs text-slate-300">
                                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                                    <tr><th className="p-2">Fecha</th><th className="p-2">Descripción</th><th className="p-2 text-right">Monto</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {datos.gastos.map(g => (
                                        <tr key={g.id} className="hover:bg-slate-950/40">
                                            <td className="p-2 text-slate-400 font-mono text-[10px]">{g.fecha}</td>
                                            <td className="p-2 font-semibold text-white">{g.titulo}</td>
                                            <td className="p-2 text-right font-bold text-rose-400">${Number(g.monto).toLocaleString('es-CL')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <p className="text-xs text-slate-500 text-center py-4">No hay gastos registrados.</p>}
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                            <i className="fa-solid fa-coins"></i> Ingresos Extra (Ventas / Rifas)
                        </h3>
                        <span className="text-xs text-slate-300 font-medium">Total: <strong className="text-emerald-400">${totalIngresosExtra.toLocaleString('es-CL')}</strong></span>
                    </div>
                    <div className="overflow-x-auto max-h-48 overflow-y-auto">
                        {datos.ingresos_extra && datos.ingresos_extra.length > 0 ? (
                            <table className="w-full text-left text-xs text-slate-300">
                                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                                    <tr><th className="p-2">Fecha</th><th className="p-2">Concepto</th><th className="p-2 text-right">Monto</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {datos.ingresos_extra.map(e => (
                                        <tr key={e.id} className="hover:bg-slate-950/40">
                                            <td className="p-2 text-slate-400 font-mono text-[10px]">{e.fecha}</td>
                                            <td className="p-2 font-semibold text-white">{e.titulo}</td>
                                            <td className="p-2 text-right font-bold text-emerald-400">${Number(e.monto).toLocaleString('es-CL')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <p className="text-xs text-slate-500 text-center py-4">No hay ingresos extra registrados.</p>}
                    </div>
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
                            No se encontraron apoderados activos.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}