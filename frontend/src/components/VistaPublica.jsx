// src/components/VistaPublica.jsx
import React, { useState } from 'react';

export default function VistaPublica({ datos, onCambiarAnio }) {
    const [busqueda, setBusqueda] = useState('');

    if (!datos || !datos.apoderados) {
        return (
            <div className="flex items-center justify-center p-12 text-slate-400 text-xs">
                <i className="fa-solid fa-spinner animate-spin mr-2 text-[#00c5ff]"></i>
                <span>Cargando información financiera del curso...</span>
            </div>
        );
    }

    const anioActivo = datos.anio_activo || "2026";
    const infoConfig = datos.configuracion || {};
    const cuotaOficial = Number(infoConfig.cuota_mensual || 21000);
    const saldoInicial = Number(infoConfig.saldo_inicial || 0);
    const meses = infoConfig.meses || ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const aniosDisponibles = datos.aniosDisponibles || [anioActivo];

    const gastos = datos.gastos || [];
    const ingresosExtra = datos.ingresos_extra || [];

    const abreviarMes = (m) => m.substring(0, 3).toUpperCase();

    // Extracción de apellido paterno para ordenamiento alfabético uniforme
    const extraerApellidoPaterno = (nombreCompleto = '') => {
        if (!nombreCompleto) return '';
        const partes = nombreCompleto.trim().split(/\s+/);
        if (partes.length === 1) return partes[0].toLowerCase();
        if (partes.length === 2) return partes[1].toLowerCase();
        if (partes.length === 3) return partes[1].toLowerCase();
        return partes[partes.length - 2].toLowerCase();
    };

    // Cálculos financieros excluyendo apoderados ocultos (activo === false)
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

    const totalGastos = gastos.reduce((acc, g) => acc + Number(g.monto || 0), 0);
    const totalIngresosExtra = ingresosExtra.reduce((acc, e) => acc + Number(e.monto || 0), 0);
    const saldoRealCaja = saldoInicial + totalRecaudado + totalIngresosExtra - totalGastos;

    // Filtrar solo estudiantes activos y ordenar por apellido paterno
    const apoderadosVisibles = (datos.apoderados || [])
        .filter(a => a.activo !== false)
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
            {/* CABECERA E INFORMACIÓN DEL CURSO */}
            <div className="bg-[#0b1120] border border-[#162035] p-5 rounded-2xl shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#162035] pb-4">
                    <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <i className="fa-solid fa-shield-halved text-[#00d084]"></i>
                            <span>Rendición de Cuentas y Transparencia ({anioActivo})</span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Cuota mensual oficial del periodo: <strong className="text-[#00d084] font-mono">${cuotaOficial.toLocaleString('es-CL')}</strong>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {onCambiarAnio && aniosDisponibles.length > 1 && (
                            <div className="flex items-center gap-1.5 bg-[#070b14] border border-[#162035] px-3 py-2 rounded-xl">
                                <span className="text-xs text-slate-400">Año:</span>
                                <select
                                    value={anioActivo}
                                    onChange={(e) => onCambiarAnio(e.target.value)}
                                    className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
                                >
                                    {aniosDisponibles.map(a => (
                                        <option key={a} value={a} className="bg-[#0b1120]">{a}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <input
                            type="text"
                            placeholder="Buscar estudiante o apoderado..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="bg-[#070b14] border border-[#162035] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00c5ff] w-full sm:w-64"
                        />
                    </div>
                </div>

                {/* Directiva */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Curso:</span>
                        <span className="text-sm font-bold text-white">{infoConfig.nombre_curso || '8° Básico B'}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Profesor/a Jefe:</span>
                        <span className="text-sm font-bold text-[#00d084]">{infoConfig.profesor || '-'}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Presidente/a:</span>
                        <span className="text-sm font-bold text-[#00c5ff]">{infoConfig.presidente || '-'}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Tesorero/a:</span>
                        <span className="text-sm font-bold text-[#f59e0b]">{infoConfig.tesorero || '-'}</span>
                    </div>
                </div>
            </div>

            {/* BALANCE GENERAL Y FLUJO DE CAJA */}
            <div className="bg-[#0b1120] border border-[#162035] p-5 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-[#00d084] flex items-center gap-2">
                    <i className="fa-solid fa-scale-balanced"></i> Balance General del Curso ({anioActivo})
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
                        <span className="text-[10px] text-[#00d084] font-semibold block mb-1">Saldo Real en Caja</span>
                        <span className="text-lg font-black text-[#00d084] tracking-tight">${saldoRealCaja.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#f59e0b]/60 p-3 rounded-xl">
                        <span className="text-[10px] text-[#f59e0b] font-bold block mb-1">Por Recaudar</span>
                        <span className="text-lg font-black text-[#f59e0b] tracking-tight">${totalDeudaPorRecoger.toLocaleString('es-CL')}</span>
                    </div>
                </div>
            </div>

            {/* RELACIÓN DETALLADA DE GASTOS E INGRESOS EXTRA (SI EXISTEN) */}
            <div className={`grid grid-cols-1 ${ingresosExtra.length > 0 ? 'lg:grid-cols-2' : ''} gap-5`}>
                {/* Relación Detallada de Gastos */}
                <div className="bg-[#0b1120] border border-[#162035] p-5 rounded-2xl shadow-xl space-y-3">
                    <div className="flex justify-between items-center border-b border-[#162035] pb-3">
                        <h3 className="text-sm font-bold text-[#f43f5e] flex items-center gap-2">
                            <i className="fa-solid fa-receipt"></i> Relación Detallada de Gastos
                        </h3>
                        <span className="text-xs text-slate-400">
                            Total Egresos: <strong className="text-[#f43f5e] font-mono">${totalGastos.toLocaleString('es-CL')}</strong>
                        </span>
                    </div>

                    <div className="overflow-x-auto max-h-72 overflow-y-auto">
                        {gastos.length > 0 ? (
                            <table className="w-full text-left text-xs">
                                <thead className="bg-[#070b14] text-slate-400 border-b border-[#162035] sticky top-0">
                                    <tr>
                                        <th className="p-2.5">Fecha</th>
                                        <th className="p-2.5">Mes</th>
                                        <th className="p-2.5">Descripción / Concepto</th>
                                        <th className="p-2.5 text-right">Monto</th>
                                        <th className="p-2.5 text-center">Respaldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#162035] text-slate-300">
                                    {gastos.map(g => (
                                        <tr key={g.id} className="hover:bg-[#070b14]/50 transition">
                                            <td className="p-2.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">{g.fecha}</td>
                                            <td className="p-2.5 text-[11px] text-slate-400">{g.mes || '-'}</td>
                                            <td className="p-2.5 font-semibold text-white">{g.titulo}</td>
                                            <td className="p-2.5 text-right font-bold text-[#f43f5e] font-mono whitespace-nowrap">
                                                ${Number(g.monto).toLocaleString('es-CL')}
                                            </td>
                                            <td className="p-2.5 text-center">
                                                {g.comprobante ? (
                                                    <a
                                                        href={g.comprobante}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-[#00c5ff] hover:underline text-[11px] font-medium"
                                                    >
                                                        <i className="fa-solid fa-paperclip"></i> Ver
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-xs text-slate-500 text-center py-6">
                                No se registran gastos en este periodo escolar.
                            </p>
                        )}
                    </div>
                </div>

                {/* Relación Detallada de Ingresos Extra (solo se muestra si hay ingresos extra) */}
                {ingresosExtra.length > 0 && (
                    <div className="bg-[#0b1120] border border-[#162035] p-5 rounded-2xl shadow-xl space-y-3">
                        <div className="flex justify-between items-center border-b border-[#162035] pb-3">
                            <h3 className="text-sm font-bold text-[#00d084] flex items-center gap-2">
                                <i className="fa-solid fa-coins"></i> Relación Detallada de Ingresos Extra
                            </h3>
                            <span className="text-xs text-slate-400">
                                Total Ingresos: <strong className="text-[#00d084] font-mono">${totalIngresosExtra.toLocaleString('es-CL')}</strong>
                            </span>
                        </div>

                        <div className="overflow-x-auto max-h-72 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-[#070b14] text-slate-400 border-b border-[#162035] sticky top-0">
                                    <tr>
                                        <th className="p-2.5">Fecha</th>
                                        <th className="p-2.5">Concepto / Actividad</th>
                                        <th className="p-2.5 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#162035] text-slate-300">
                                    {ingresosExtra.map(e => (
                                        <tr key={e.id} className="hover:bg-[#070b14]/50 transition">
                                            <td className="p-2.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">{e.fecha}</td>
                                            <td className="p-2.5 font-semibold text-white">{e.titulo}</td>
                                            <td className="p-2.5 text-right font-bold text-[#00d084] font-mono whitespace-nowrap">
                                                +${Number(e.monto).toLocaleString('es-CL')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ESTADO DE CUOTAS MENSUALES POR ESTUDIANTE */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <i className="fa-solid fa-users text-[#00c5ff]"></i>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                        Estado de Cuotas por Estudiante
                    </h3>
                    <span className="bg-[#00c5ff]/15 border border-[#00c5ff]/30 text-[#00c5ff] text-[10px] font-bold px-2.5 py-0.5 rounded-full ml-1">
                        {apoderadosVisibles.length} Estudiantes
                    </span>
                </div>

                <div className="space-y-4">
                    {apoderadosVisibles.length > 0 ? (
                        apoderadosVisibles.map(apo => {
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

                            return (
                                <div
                                    key={apo.id}
                                    className="bg-[#0b1120] border border-[#162035] rounded-2xl p-5 md:p-6 shadow-xl flex flex-col xl:flex-row justify-start items-start xl:items-center gap-6 hover:border-[#223150] transition duration-200"
                                >
                                    {/* Datos del Estudiante y Resumen de Estado */}
                                    <div className="space-y-2.5 w-full xl:w-72 flex-shrink-0">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <i className="fa-solid fa-graduation-cap text-[#00c5ff] text-base"></i>
                                                <h4 className="text-base font-bold text-white tracking-wide">
                                                    {apo.alumno}
                                                </h4>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Apoderado: <span className="text-slate-300 font-medium">{apo.nombre}</span>
                                            </p>
                                        </div>

                                        <div className="pt-1">
                                            {alDia ? (
                                                <span className="bg-blue-600/20 border border-blue-500/40 text-blue-400 px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide shadow inline-flex items-center gap-1">
                                                    Al Día ✓
                                                </span>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 bg-[#070b14] border border-[#162035] px-2.5 py-1 rounded-xl text-[11px] font-mono">
                                                    <span className="text-slate-400 text-[10px]">Abonó:</span>
                                                    <span className="font-bold text-[#00d084]">
                                                        ${totalAbonado.toLocaleString('es-CL')}
                                                    </span>
                                                    <span className="text-slate-600">|</span>
                                                    <span className="text-slate-400 text-[10px]">Debe:</span>
                                                    <span className="font-bold text-[#f43f5e]">
                                                        ${deudaEstudiante.toLocaleString('es-CL')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Cuadrícula de los 10 meses */}
                                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5 flex-1 w-full">
                                        {meses.map(m => {
                                            const p = apo.pagos ? apo.pagos[m] : null;
                                            const esExonerado = Boolean(p?.exonerado);
                                            const monto = Number(p?.monto || 0);
                                            const esPagado = Boolean(p?.pagado) || monto >= cuotaOficial;
                                            const esAbono = monto > 0 && monto < cuotaOficial;

                                            return (
                                                <div
                                                    key={m}
                                                    className="bg-[#070b14] border border-[#162035] p-3 rounded-2xl flex flex-col justify-between items-center text-center w-full h-[88px] shadow-sm"
                                                >
                                                    <span className="text-[11px] font-bold text-slate-300 tracking-wider">
                                                        {abreviarMes(m)}
                                                    </span>

                                                    <div className="w-full py-0.5">
                                                        {esExonerado ? (
                                                            <span className="block w-full py-1 rounded-lg text-[10px] font-bold bg-[#1e293b] text-slate-400 border border-slate-700">
                                                                Exon.
                                                            </span>
                                                        ) : esPagado ? (
                                                            <span className="block w-full py-1 rounded-lg text-[10px] font-bold bg-[#00d084]/15 text-[#00d084] border border-[#00d084]/30">
                                                                ✓ Pagado
                                                            </span>
                                                        ) : esAbono ? (
                                                            <span className="block w-full py-1 rounded-lg text-[10px] font-bold bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30">
                                                                Abono
                                                            </span>
                                                        ) : (
                                                            <span className="block w-full py-1 rounded-lg text-[10px] font-bold bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/25">
                                                                Pend.
                                                            </span>
                                                        )}
                                                    </div>

                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        {esAbono
                                                            ? `$${monto.toLocaleString('es-CL')}`
                                                            : (p?.fecha ? p.fecha.slice(5) : '-')}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 text-slate-500 text-xs bg-[#0b1120] border border-[#162035] rounded-2xl">
                            No se encontraron estudiantes con ese criterio de búsqueda.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}