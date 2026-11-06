// frontend/src/components/VistaPublica.jsx
import React, { useState } from 'react';

export default function VistaPublica({ datos }) {
    const [busqueda, setBusqueda] = useState('');

    const apoderadosFiltrados = datos.apoderados.filter(a => 
        a.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
        a.alumno.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Tarjeta de Apoderados (Marzo a Diciembre) */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                <div>
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                        <i class="fa-solid fa-users text-emerald-400"></i> Estado de Cuentas - Apoderados (18 en total)
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Busca tu nombre o el de tu alumno para revisar los pagos mes a mes (Marzo a Diciembre).</p>
                </div>

                <input 
                    type="text" 
                    placeholder="🔍 Buscar por nombre de apoderado o alumno..." 
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {apoderadosFiltrados.length === 0 ? (
                        <p className="text-xs text-slate-500 italic text-center py-4">No se encontraron apoderados con ese nombre.</p>
                    ) : (
                        apoderadosFiltrados.map(apo => (
                            <div key={apo.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-white text-sm">{apo.nombre}</h3>
                                        <span className="text-xs text-slate-400">Alumno: <strong className="text-slate-300">{apo.alumno}</strong></span>
                                    </div>
                                    <span className="text-[10px] bg-slate-900 text-emerald-400 px-2 py-1 rounded-lg border border-slate-800 font-medium">
                                        Cuota: ${datos.configuracion.cuota_mensual.toLocaleString()}
                                    </span>
                                </div>
                                
                                {/* Cuadrícula de Marzo a Diciembre */}
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    {Object.entries(apo.pagos).map(([mes, info]) => (
                                        <div key={mes} className={`p-2 rounded-xl border text-center text-xs transition ${info.pagado ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}>
                                            <span className="font-bold block text-[11px] text-slate-300">{mes}</span>
                                            <span className="text-[10px] font-medium">{info.pagado ? `✓ Pagado` : '• Pendiente'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Gastos Generales del Curso (Modo Público) */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <i class="fa-solid fa-receipt text-emerald-400"></i> Gastos Generales del Curso
                </h2>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {datos.gastos.length === 0 ? (
                        <p className="text-xs text-slate-500 italic text-center py-3">No hay gastos registrados todavía en el curso.</p>
                    ) : (
                        datos.gastos.map(g => (
                            <div key={g.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                                <div>
                                    <span className="font-semibold text-white block">{g.titulo}</span>
                                    <span className="text-[10px] text-slate-400">Mes asignado: <strong className="text-slate-300">{g.mes}</strong> | Fecha: {g.fecha}</span>
                                </div>
                                <span className="font-bold text-rose-400 text-sm">-$${g.monto.toLocaleString()}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}