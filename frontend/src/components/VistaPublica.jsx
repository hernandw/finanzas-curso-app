// src/components/VistaPublica.jsx
import React, { useState } from 'react';

export default function VistaPublica({ datos, onCambiarAnio }) {
    if (!datos || !datos.apoderados) {
        return (
            <div className="flex items-center justify-center p-8 text-slate-400 text-xs">
                <i className="fa-solid fa-spinner animate-spin mr-2"></i> Cargando...
            </div>
        );
    }

    const [inputBusqueda, setInputBusqueda] = useState('');
    const [filtroConfirmado, setFiltroConfirmado] = useState('');

    const obtenerApellidoPaterno = (nombreCompleto = '') => {
        if (!nombreCompleto) return '';
        const partes = nombreCompleto.trim().split(/\s+/);
        if (partes.length === 1) return partes[0].toLowerCase();
        if (partes.length === 2 || partes.length === 3) return partes[1].toLowerCase();
        return partes[partes.length - 2].toLowerCase();
    };

    const handleBuscar = (e) => {
        e.preventDefault();
        setFiltroConfirmado(inputBusqueda.trim());
    };

    const handleLimpiar = () => {
        setInputBusqueda('');
        setFiltroConfirmado('');
    };

    const apoderadosFiltrados = datos.apoderados
        .filter(a => 
            (a.activo !== false) && (
                a.nombre.toLowerCase().includes(filtroConfirmado.toLowerCase()) || 
                a.alumno.toLowerCase().includes(filtroConfirmado.toLowerCase())
            )
        )
        .sort((a, b) => {
            const apA = obtenerApellidoPaterno(a.alumno);
            const apB = obtenerApellidoPaterno(b.alumno);
            return apA.localeCompare(apB, 'es', { sensitivity: 'base', numeric: true });
        });

    const cuotaOficial = datos.configuracion?.cuota_mensual || 11000;
    const saldoInicial = Number(datos.configuracion?.saldo_inicial || 0);
    const totalGastos = datos.gastos ? datos.gastos.reduce((acc, g) => acc + Number(g.monto), 0) : 0;
    const totalIngresosExtra = datos.ingresos_extra ? datos.ingresos_extra.reduce((acc, e) => acc + Number(e.monto), 0) : 0;
    
    let totalCuotasRecaudadas = 0;
    let totalDeudaPorRecoger = 0;

    datos.apoderados.forEach(apo => {
        if (apo.activo === false) return;
        datos.configuracion.meses.forEach(m => {
            const p = apo.pagos[m];
            if (p?.exonerado) return;
            const montoAbonado = Number(p?.monto || 0);
            totalCuotasRecaudadas += montoAbonado;
            if (!p?.pagado) {
                totalDeudaPorRecoger += (cuotaOficial - montoAbonado);
            }
        });
    });

    const saldoRealCaja = saldoInicial + totalCuotasRecaudadas + totalIngresosExtra - totalGastos;
    const aniosDisponibles = datos.aniosDisponibles || ["2024", "2025", "2026", "2027", "2028"];

    return (
        <div className="space-y-6">
            {/* CABECERA CON BUSCADOR CON BOTÓN BUSCAR */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                            Periodo {datos.anio_activo}
                        </span>
                        
                        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl">
                            <span className="text-[10px] text-slate-400 font-medium">Ver Año:</span>
                            <select 
                                value={datos.anio_activo}
                                onChange={(e) => onCambiarAnio && onCambiarAnio(e.target.value)}
                                className="bg-transparent text-emerald-400 font-bold text-xs outline-none cursor-pointer"
                            >
                                {aniosDisponibles.map(anio => (
                                    <option key={anio} value={anio} className="bg-slate-900 text-white">
                                        {anio}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <h2 className="text-xl font-extrabold text-white mt-2 flex items-center gap-2">
                        <i className="fa-solid fa-school text-sky-400"></i> Tesorería - {datos.configuracion.nombre_curso || '8° Básico B'}
                    </h2>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400 mt-2">
                        <span><strong className="text-slate-300">Profesor/a:</strong> {datos.configuracion.profesor || 'N/A'}</span>
                        <span>•</span>
                        <span><strong className="text-slate-300">Presidente/a:</strong> {datos.configuracion.presidente || 'N/A'}</span>
                        <span>•</span>
                        <span><strong className="text-slate-300">Tesorero/a:</strong> {datos.configuracion.tesorero || 'N/A'}</span>
                        <span>•</span>
                        <span><strong className="text-emerald-400">Cuota:</strong> ${Number(cuotaOficial).toLocaleString('es-CL')}</span>
                    </div>
                </div>

                {/* FORMULARIO DE BÚSQUEDA CON BOTÓN */}
                <form onSubmit={handleBuscar} className="w-full md:w-auto flex items-center gap-2">
                    <input 
                        type="text"
                        placeholder="Estudiante o apoderado..."
                        value={inputBusqueda}
                        onChange={(e) => setInputBusqueda(e.target.value)}
                        className="w-full md:w-56 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
                    />
                    <button
                        type="submit"
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
                    >
                        <i className="fa-solid fa-magnifying-glass"></i> Buscar
                    </button>
                    {filtroConfirmado && (
                        <button
                            type="button"
                            onClick={handleLimpiar}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-2 rounded-xl text-xs transition"
                            title="Limpiar búsqueda"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    )}
                </form>
            </div>

            {/* BALANCE GENERAL Y DEUDA POR RECOGER */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <i className="fa-solid fa-scale-balanced"></i> Balance General y Flujo de Caja ({datos.anio_activo})
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Saldo Anterior</span>
                        <span className="text-sm font-bold text-slate-200">${saldoInicial.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Cuotas Recaudadas</span>
                        <span className="text-sm font-bold text-emerald-400">${totalCuotasRecaudadas.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Ingresos Extra</span>
                        <span className="text-sm font-bold text-sky-400">${totalIngresosExtra.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Total Egresos</span>
                        <span className="text-sm font-bold text-rose-400">${totalGastos.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="bg-slate-950 border border-emerald-500/30 p-3 rounded-xl bg-emerald-950/10">
                        <span className="text-[10px] text-emerald-400 block font-semibold">Saldo Real en Caja</span>
                        <span className="text-sm font-extrabold text-emerald-400">${saldoRealCaja.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="bg-slate-950 border border-amber-500/30 p-3 rounded-xl bg-amber-950/10">
                        <span className="text-[10px] text-amber-400 block font-semibold">Deuda por Recoger</span>
                        <span className="text-sm font-extrabold text-amber-400">${totalDeudaPorRecoger.toLocaleString('es-CL')}</span>
                    </div>
                </div>
            </div>

            {/* RELACIÓN DE GASTOS E INGRESOS EXTRA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                            <i className="fa-solid fa-receipt"></i> Relación de Gastos ({datos.anio_activo})
                        </h3>
                        <span className="text-xs text-slate-300 font-medium">Total: <strong className="text-rose-400">${totalGastos.toLocaleString('es-CL')}</strong></span>
                    </div>
                    <div className="overflow-x-auto max-h-52 overflow-y-auto">
                        {datos.gastos && datos.gastos.length > 0 ? (
                            <table className="w-full text-left text-xs text-slate-300">
                                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                                    <tr><th className="p-2">Fecha</th><th className="p-2">Descripción</th><th className="p-2 text-right">Monto</th><th className="p-2 text-center">Recibo</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {datos.gastos.map(g => (
                                        <tr key={g.id} className="hover:bg-slate-950/40">
                                            <td className="p-2 text-slate-400 font-mono text-[10px]">{g.fecha}</td>
                                            <td className="p-2 font-semibold text-white">{g.titulo}</td>
                                            <td className="p-2 text-right font-bold text-rose-400">${Number(g.monto).toLocaleString('es-CL')}</td>
                                            <td className="p-2 text-center">
                                                {g.reciboUrl ? (
                                                    <a href={g.reciboUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300" title="Ver Recibo">
                                                        <i className="fa-solid fa-paperclip"></i>
                                                    </a>
                                                ) : <span className="text-slate-600">-</span>}
                                            </td>
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
                            <i className="fa-solid fa-coins"></i> Ingresos Extra ({datos.anio_activo})
                        </h3>
                        <span className="text-xs text-slate-300 font-medium">Total: <strong className="text-emerald-400">${totalIngresosExtra.toLocaleString('es-CL')}</strong></span>
                    </div>
                    <div className="overflow-x-auto max-h-52 overflow-y-auto">
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

            {/* TARJETAS HORIZONTALES POR ALUMNO A LO ANCHO */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                        <i className="fa-solid fa-users"></i> Estado Mensual por Estudiante ({apoderadosFiltrados.length})
                    </h3>
                    <span className="text-xs text-slate-400">
                        Total por Recoger: <strong className="text-amber-400 font-bold">${totalDeudaPorRecoger.toLocaleString('es-CL')}</strong>
                    </span>
                </div>

                <div className="flex flex-col gap-4">
                    {apoderadosFiltrados.map(apo => {
                        let totalPagadoApo = 0;
                        let deudaApo = 0;

                        datos.configuracion.meses.forEach(mes => {
                            const p = apo.pagos[mes];
                            if (p && p.monto && !p.exonerado) totalPagadoApo += Number(p.monto);
                            if (!p?.exonerado && !p?.pagado) {
                                deudaApo += (cuotaOficial - Number(p?.monto || 0));
                            }
                        });

                        return (
                            <div key={apo.id} className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl hover:border-slate-700 transition flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
                                <div className="xl:w-1/4 flex-shrink-0 border-b xl:border-b-0 xl:border-r border-slate-800 pb-3 xl:pb-0 xl:pr-4 flex justify-between xl:flex-col items-center xl:items-start gap-1">
                                    <div>
                                        <h3 className="font-extrabold text-white text-base tracking-wide flex items-center gap-2">
                                            <i className="fa-solid fa-graduation-cap text-sky-400 text-sm"></i> {apo.alumno}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Apoderado: <span className="text-slate-200 font-medium">{apo.nombre}</span>
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-bold">
                                            Abonado: ${totalPagadoApo.toLocaleString('es-CL')}
                                        </span>
                                        {deudaApo > 0 ? (
                                            <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-lg font-bold">
                                                Debe: ${deudaApo.toLocaleString('es-CL')}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-lg font-bold">
                                                Al día ✓
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                                    {datos.configuracion.meses.map(mes => {
                                        const pago = apo.pagos[mes] || { pagado: false, monto: 0, exonerado: false, fecha: null };
                                        const montoAbonado = Number(pago.monto || 0);
                                        const esCompleto = pago.pagado && (montoAbonado >= cuotaOficial);
                                        const esAbono = !esCompleto && (montoAbonado > 0);

                                        return (
                                            <div key={mes} className={`border p-2 rounded-xl flex flex-col justify-between text-center min-h-[64px] ${pago.exonerado ? 'bg-slate-950/40 border-slate-800/40 opacity-70' : 'bg-slate-950 border-slate-800'}`}>
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{mes.slice(0, 3)}</span>
                                                <div className="my-1">
                                                    {pago.exonerado ? (
                                                        <span className="inline-block w-full text-center bg-sky-500/10 text-sky-400 border border-sky-500/20 py-0.5 rounded text-[9px] font-bold">
                                                            Exon.
                                                        </span>
                                                    ) : esCompleto ? (
                                                        <span className="inline-block w-full text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-0.5 rounded text-[9px] font-bold">
                                                            ✓ Pagado
                                                        </span>
                                                    ) : esAbono ? (
                                                        <span className="inline-block w-full text-center bg-amber-500/10 text-amber-400 border border-amber-500/20 py-0.5 rounded text-[9px] font-bold">
                                                            ${(montoAbonado / 1000).toFixed(0)}k
                                                        </span>
                                                    ) : (
                                                        <span className="inline-block w-full text-center bg-rose-500/10 text-rose-400 border border-rose-500/20 py-0.5 rounded text-[9px] font-bold">
                                                            Pend.
                                                        </span>
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
                        );
                    })}
                </div>
            </div>
        </div>
    );
}