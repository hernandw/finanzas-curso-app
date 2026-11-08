// src/components/VistaPublica.jsx
import React, { useState } from 'react';

export default function VistaPublica({ datos, onCambiarAnio }) {
    const [busqueda, setBusqueda] = useState('');

    if (!datos || !datos.apoderados) {
        return (
            <div className="flex items-center justify-center p-12 text-slate-400 text-xs font-sans">
                <i className="fa-solid fa-spinner animate-spin mr-2 text-[#00d084]"></i> Cargando información del curso...
            </div>
        );
    }

    const anioActivo = datos.anio_activo || "2026";
    const infoConfig = datos.configuracion || {};
    const cuotaOficial = Number(infoConfig.cuota_mensual || 21000);
    const saldoInicial = Number(infoConfig.saldo_inicial || 0);
    const meses = infoConfig.meses || [];
    const aniosDisponibles = datos.aniosDisponibles || ["2024", "2025", "2026"];

    const abreviarMes = (m) => m.substring(0, 3).toUpperCase();

    // Función precisa para extraer el apellido paterno
    const obtenerApellidoPaterno = (nombreCompleto = '') => {
        if (!nombreCompleto) return '';
        const partes = nombreCompleto.trim().split(/\s+/);
        if (partes.length === 1) return partes[0].toLowerCase();
        if (partes.length === 2) return partes[1].toLowerCase();
        if (partes.length === 3) return partes[1].toLowerCase();
        return partes[partes.length - 2].toLowerCase();
    };

    // Cálculos de balance general (solo estudiantes activos)
    let totalCuotasRecaudadas = 0;
    let totalDeudaPorRecoger = 0;

    (datos.apoderados || []).forEach(apo => {
        if (apo.activo === false) return;
        meses.forEach(m => {
            const p = apo.pagos ? apo.pagos[m] : null;
            if (p?.exonerado) return;
            const montoAbonado = Number(p?.monto || 0);
            totalCuotasRecaudadas += montoAbonado;
            const pendiente = Math.max(0, cuotaOficial - montoAbonado);
            totalDeudaPorRecoger += pendiente;
        });
    });

    const totalGastos = (datos.gastos || []).reduce((acc, g) => acc + Number(g.monto || 0), 0);
    const totalIngresosExtra = (datos.ingresos_extra || []).reduce((acc, e) => acc + Number(e.monto || 0), 0);
    const saldoRealCaja = saldoInicial + totalCuotasRecaudadas + totalIngresosExtra - totalGastos;

    // Filtro por búsqueda Y ordenamiento alfabético por Apellido Paterno
    const apoderadosFiltrados = (datos.apoderados || [])
        .filter(a => a.activo !== false && (
            a.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
            a.alumno.toLowerCase().includes(busqueda.toLowerCase())
        ))
        .sort((a, b) => {
            const apA = obtenerApellidoPaterno(a.alumno);
            const apB = obtenerApellidoPaterno(b.alumno);
            return apA.localeCompare(apB, 'es', { sensitivity: 'base', numeric: true });
        });

    return (
        <div className="space-y-6 font-sans text-slate-100">
            {/* 1. FICHA OFICIAL CON DATOS GENERALES DEL CURSO */}
            <div className="bg-[#0b1120] border border-[#162035] p-5 rounded-2xl shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#162035] pb-3">
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-school text-[#00d084] text-base"></i>
                        <h2 className="text-base font-bold text-white tracking-wide">
                            {infoConfig.nombre_curso || '8° Básico B'} — Datos del Curso
                        </h2>
                    </div>

                    <div className="flex items-center gap-2 bg-[#070b14] border border-[#162035] px-3 py-1.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Periodo:</span>
                        <select 
                            value={anioActivo}
                            onChange={(e) => onCambiarAnio && onCambiarAnio(e.target.value)}
                            className="bg-transparent text-[#00d084] font-bold text-xs outline-none cursor-pointer"
                        >
                            {aniosDisponibles.map(anio => (
                                <option key={anio} value={anio} className="bg-[#0b1120] text-white">
                                    {anio}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-medium block">Profesor/a Jefe:</span>
                        <span className="text-sm font-bold text-[#00d084]">{infoConfig.profesor || 'Aylin Chong'}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-medium block">Presidente/a:</span>
                        <span className="text-sm font-bold text-[#38bdf8]">{infoConfig.presidente || 'Ingrid Brito'}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-medium block">Tesorero/a:</span>
                        <span className="text-sm font-bold text-[#f59e0b]">{infoConfig.tesorero || 'Natalya Zakharova'}</span>
                    </div>
                    <div className="bg-[#070b14] border border-[#162035] p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-medium block">Cuota Mensual Oficial:</span>
                        <span className="text-sm font-bold text-white font-mono">${cuotaOficial.toLocaleString('es-CL')}</span>
                    </div>
                </div>
            </div>

            {/* 2. BALANCE GENERAL Y FLUJO DE CAJA (LAS 6 CARDS KPI) */}
            <div className="bg-[#0b1120] border border-[#162035] p-5 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-[#00d084] flex items-center gap-2">
                    <i className="fa-solid fa-scale-balanced text-base"></i> Balance General y Flujo de Caja ({anioActivo})
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                    <div className="bg-[#070b14] border border-[#162035] p-3.5 rounded-xl flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 font-medium block mb-1">Saldo Anterior</span>
                        <span className="text-base font-bold text-white tracking-tight">
                            ${saldoInicial.toLocaleString('es-CL')}
                        </span>
                    </div>

                    <div className="bg-[#070b14] border border-[#162035] p-3.5 rounded-xl flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 font-medium block mb-1">Cuotas Recaudadas</span>
                        <span className="text-base font-bold text-[#00d084] tracking-tight">
                            ${totalCuotasRecaudadas.toLocaleString('es-CL')}
                        </span>
                    </div>

                    <div className="bg-[#070b14] border border-[#162035] p-3.5 rounded-xl flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 font-medium block mb-1">Ingresos Extra</span>
                        <span className="text-base font-bold text-[#38bdf8] tracking-tight">
                            ${totalIngresosExtra.toLocaleString('es-CL')}
                        </span>
                    </div>

                    <div className="bg-[#070b14] border border-[#162035] p-3.5 rounded-xl flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 font-medium block mb-1">Total Egresos</span>
                        <span className="text-base font-bold text-[#f43f5e] tracking-tight">
                            ${totalGastos.toLocaleString('es-CL')}
                        </span>
                    </div>

                    <div className="bg-[#070b14] border border-[#00d084]/40 p-3.5 rounded-xl flex flex-col justify-center">
                        <span className="text-[10px] text-[#00d084] font-semibold block mb-1">Saldo Real en Caja</span>
                        <span className="text-lg font-black text-[#00d084] tracking-tight">
                            ${saldoRealCaja.toLocaleString('es-CL')}
                        </span>
                    </div>

                    <div className="bg-[#070b14] border border-[#f59e0b] p-3.5 rounded-xl flex flex-col justify-center shadow-lg shadow-[#f59e0b]/5">
                        <span className="text-[10px] text-[#f59e0b] font-bold block mb-1">Deuda por Recoger</span>
                        <span className="text-lg font-black text-[#f59e0b] tracking-tight">
                            ${totalDeudaPorRecoger.toLocaleString('es-CL')}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. BARRA DE BÚSQUEDA Y TOTAL POR RECOGER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1">
                <div className="flex items-center gap-2">
                    <i className="fa-solid fa-users text-[#00d084]"></i>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                        Estado Mensual por Estudiante ({apoderadosFiltrados.length})
                    </h3>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                        Total por Recoger: <strong className="text-[#f59e0b] font-bold">${totalDeudaPorRecoger.toLocaleString('es-CL')}</strong>
                    </span>
                    <input 
                        type="text" 
                        placeholder="Buscar estudiante..." 
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="bg-[#0b1120] border border-[#162035] rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00d084] w-full sm:w-56"
                    />
                </div>
            </div>

            {/* 4. TARJETAS HORIZONTALES ORDENADAS POR APELLIDO PATERNO */}
            <div className="space-y-4">
                {apoderadosFiltrados.map(apo => {
                    let totalAbonado = 0;
                    let deudaEstudiante = 0;

                    meses.forEach(m => {
                        const p = apo.pagos ? apo.pagos[m] : null;
                        if (p?.exonerado) return;
                        const monto = Number(p?.monto || 0);
                        totalAbonado += monto;
                        deudaEstudiante += Math.max(0, cuotaOficial - monto);
                    });

                    // Si no tiene deuda pendiente, está Al Día
                    const alDia = deudaEstudiante === 0;

                    return (
                        <div 
                            key={apo.id} 
                            className="bg-[#0b1120] border border-[#162035] rounded-2xl p-4 md:p-5 shadow-xl space-y-4 hover:border-[#223150] transition"
                        >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <i className="fa-solid fa-graduation-cap text-[#00d084] text-sm"></i>
                                        <h4 className="text-base font-bold text-white tracking-wide">
                                            {apo.alumno}
                                        </h4>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Apoderado: <span className="text-slate-300 font-medium">{apo.nombre}</span>
                                    </p>
                                </div>

                                {/* ESTADO: SI ESTÁ AL DÍA DESAPARECE "ABONÓ" Y "DEBE", QUEDA SOLO EL BOTÓN AZUL */}
                                <div className="flex items-center gap-2">
                                    {alDia ? (
                                        <span className="bg-blue-600/20 border border-blue-500/40 text-blue-400 px-4 py-1.5 rounded-xl text-xs font-bold tracking-wide shadow-sm shadow-blue-500/10">
                                            Al Día ✓
                                        </span>
                                    ) : (
                                        <>
                                            <span className="bg-[#00d084]/10 border border-[#00d084]/25 text-[#00d084] px-3 py-1 rounded-full text-xs font-bold">
                                                Abonado: ${totalAbonado.toLocaleString('es-CL')}
                                            </span>
                                            <span className="bg-[#f43f5e]/10 border border-[#f43f5e]/25 text-[#f43f5e] px-3 py-1 rounded-full text-xs font-bold">
                                                Debe: ${deudaEstudiante.toLocaleString('es-CL')}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Tira completa de los 10 meses */}
                            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                                {meses.map(m => {
                                    const p = apo.pagos ? apo.pagos[m] : null;
                                    const esExonerado = p?.exonerado;
                                    const monto = Number(p?.monto || 0);
                                    const esPagado = p?.pagado || monto >= cuotaOficial;
                                    const esAbono = !esPagado && monto > 0;

                                    return (
                                        <div 
                                            key={m} 
                                            className="bg-[#070b14] border border-[#162035] p-2.5 rounded-xl flex flex-col justify-between items-center text-center space-y-1.5"
                                        >
                                            <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                                                {abreviarMes(m)}
                                            </span>

                                            <div className="w-full">
                                                {esExonerado ? (
                                                    <span className="block w-full py-0.5 rounded text-[10px] font-bold bg-[#1e293b] text-slate-400 border border-slate-700">
                                                        Exon.
                                                    </span>
                                                ) : esPagado ? (
                                                    <span className="block w-full py-0.5 rounded text-[10px] font-bold bg-[#00d084]/15 text-[#00d084] border border-[#00d084]/30">
                                                        Pagado
                                                    </span>
                                                ) : esAbono ? (
                                                    <span className="block w-full py-0.5 rounded text-[10px] font-bold bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30">
                                                        Abono
                                                    </span>
                                                ) : (
                                                    <span className="block w-full py-0.5 rounded text-[10px] font-bold bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/25">
                                                        Pend.
                                                    </span>
                                                )}
                                            </div>

                                            <span className="text-[10px] text-slate-500 font-mono">
                                                {monto > 0 ? `$${monto.toLocaleString('es-CL')}` : '-'}
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
    );
}