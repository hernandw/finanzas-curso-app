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

            {/* DETALLE DE PAGOS POR APODERADO EN FORMATO DE TABLA */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2 px-1">
                    <i className="fa-solid fa-users"></i> Relación de Pagos y Abonos por Alumno ({apoderadosFiltrados.length})
                </h3>

                <div className="grid grid-cols-1 gap-5">
                    {apoderadosFiltrados.length > 0 ? (
                        apoderadosFiltrados.map(apo => {
                            // Recopilar todos los meses que tienen algún pago o abono registrado
                            const mesesConPagos = datos.configuracion.meses.filter(mes => {
                                const p = apo.pagos[mes];
                                return p && Number(p.monto) > 0;
                            });

                            let totalPagadoApo = 0;
                            datos.configuracion.meses.forEach(mes => {
                                const p = apo.pagos[mes];
                                if (p && p.monto) totalPagadoApo += Number(p.monto);
                            });

                            return (
                                <div key={apo.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                                        <div>
                                            <h3 className="font-bold text-white text-sm">{apo.nombre}</h3>
                                            <p className="text-xs text-emerald-400 font-semibold mt-0.5">Alumno: {apo.alumno}</p>
                                        </div>
                                        <div className="text-xs text-slate-300 font-medium">
                                            Total Abonado: <strong className="text-emerald-400">${totalPagadoApo.toLocaleString('es-CL')}</strong>
                                        </div>
                                    </div>

                                    {/* Tabla de pagos tipo relación de gastos */}
                                    <div className="overflow-x-auto">
                                        {mesesConPagos.length > 0 ? (
                                            <table className="w-full text-left text-xs text-slate-300">
                                                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                                                    <tr>
                                                        <th className="p-3">Fecha de Pago</th>
                                                        <th className="p-3">Mes Correspondiente</th>
                                                        <th className="p-3">Estado Cuota</th>
                                                        <th className="p-3 text-right">Monto Abonado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/60">
                                                    {mesesConPagos.map(mes => {
                                                        const p = apo.pagos[mes];
                                                        const montoAbonado = Number(p.monto || 0);
                                                        const esCompleto = p.pagado && (montoAbonado >= cuotaOficial);

                                                        return (
                                                            <tr key={mes} className="hover:bg-slate-950/40">
                                                                <td className="p-3 text-slate-400 font-mono text-[11px]">
                                                                    {p.fecha || 'Sin fecha'}
                                                                </td>
                                                                <td className="p-3 font-semibold text-white">{mes}</td>
                                                                <td className="p-3">
                                                                    {esCompleto ? (
                                                                        <span className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                                                            Pagado Completo ✓
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                                                            Abono Parcial
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="p-3 text-right font-bold text-emerald-400">
                                                                    ${montoAbonado.toLocaleString('es-CL')}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <p className="text-xs text-slate-500 text-center py-3">Aún no registra pagos o abonos para este periodo.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-12 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
                            No se encontraron apoderados activos con ese criterio de búsqueda.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}