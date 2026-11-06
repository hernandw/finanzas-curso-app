// src/components/VistaAdmin.jsx
import React, { useState } from 'react';

export default function VistaAdmin({ datos, onActualizar }) {
    // Estados para el módulo de pagos
    const [apoderadoSel, setApoderadoSel] = useState(datos.apoderados[0]?.id || '');
    const [mesSel, setMesSel] = useState('Marzo');
    const [pagado, setPagado] = useState(true);
    const [montoCuota, setMontoCuota] = useState(datos.configuracion.cuota_mensual || 15000);

    // Estados para el módulo de gastos
    const [tituloGasto, setTituloGasto] = useState('');
    const [montoGasto, setMontoGasto] = useState('');
    const [mesGasto, setMesGasto] = useState('Marzo');

    // Estados para agregar nuevo apoderado
    const [nombreNuevo, setNombreNuevo] = useState('');
    const [alumnoNuevo, setAlumnoNuevo] = useState('');

    // 1. Manejar actualización de pagos
    const handleActualizarPago = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/curso/admin/pago', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apoderadoId: apoderadoSel, mes: mesSel, pagado, monto: montoCuota })
        });
        if (res.ok) {
            alert("¡Pago actualizado correctamente!");
            onActualizar();
        } else {
            alert("Error al actualizar el pago.");
        }
    };

    // 2. Manejar registro de gastos
    const handleRegistrarGasto = async (e) => {
        e.preventDefault();
        if (!tituloGasto || !montoGasto) return alert("Completa los campos del gasto.");

        const res = await fetch('/api/curso/admin/gasto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mes: mesGasto, titulo: tituloGasto, monto: montoGasto })
        });
        if (res.ok) {
            alert("¡Gasto registrado con éxito!");
            setTituloGasto('');
            setMontoGasto('');
            onActualizar();
        } else {
            alert("Error al registrar el gasto.");
        }
    };

    // 3. Agregar apoderado dinámicamente
    const handleAgregarApoderado = async (e) => {
        e.preventDefault();
        if (!nombreNuevo || !alumnoNuevo) return alert("Completa nombre y alumno.");

        const res = await fetch('/api/curso/admin/apoderado/agregar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nombreNuevo, alumno: alumnoNuevo })
        });

        if (res.ok) {
            alert("¡Apoderado agregado con éxito!");
            setNombreNuevo('');
            setAlumnoNuevo('');
            onActualizar();
        }
    };

    // 4. Retirar / Eliminar apoderado
    const handleEliminarApoderado = async (id, nombre) => {
        if (confirm(`¿Estás seguro de retirar a ${nombre} del curso?`)) {
            const res = await fetch(`/api/curso/admin/apoderado/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert("Apoderado retirado correctamente.");
                onActualizar();
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-screwdriver-wrench text-emerald-400"></i> Panel de Administración / Tesorería
                </h2>

                {/* MODULO 1: REGISTRAR PAGOS DE APODERADOS */}
                <form onSubmit={handleActualizarPago} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                        <i className="fa-solid fa-money-check-dollar"></i> Registrar Cuota de Apoderado (Marzo - Diciembre)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Apoderado</label>
                            <select value={apoderadoSel} onChange={e => setApoderadoSel(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                                {datos.apoderados.map(a => <option key={a.id} value={a.id}>{a.nombre} ({a.alumno})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Mes</label>
                            <select value={mesSel} onChange={e => setMesSel(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                                {datos.configuracion.meses.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Estado de Pago</label>
                            <select value={pagado} onChange={e => setPagado(e.target.value === 'true')} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                                <option value="true">Pagado ✓</option>
                                <option value="false">Pendiente ✗</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Monto Pagado (CLP)</label>
                        <input type="number" value={montoCuota} onChange={e => setMontoCuota(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" required />
                    </div>
                    <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2 rounded-xl text-xs transition">
                        Guardar Estado de Pago
                    </button>
                </form>

                {/* MODULO 2: REGISTRAR GASTOS DEL CURSO */}
                <form onSubmit={handleRegistrarGasto} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                        <i className="fa-solid fa-receipt"></i> Registrar Gasto del Curso
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Título / Descripción del Gasto</label>
                            <input type="text" placeholder="Ej: Compra de materiales de aseo" value={tituloGasto} onChange={e => setTituloGasto(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" required />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Mes Asociado</label>
                            <select value={mesGasto} onChange={e => setMesGasto(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                                {datos.configuracion.meses.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Monto del Gasto (CLP)</label>
                        <input type="number" placeholder="Ej: 45000" value={montoGasto} onChange={e => setMontoGasto(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" required />
                    </div>
                    <button type="submit" className="w-full bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold py-2 rounded-xl text-xs transition">
                        Registrar Gasto General
                    </button>
                </form>

                {/* MODULO 3: GESTIÓN DE APODERADOS (AGREGAR / RETIRAR) */}
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-semibold text-sky-400 flex items-center gap-2">
                        <i className="fa-solid fa-users-gear"></i> Gestión de Apoderados ({datos.apoderados.length} Registrados)
                    </h3>
                    <form onSubmit={handleAgregarApoderado} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input type="text" placeholder="Nombre Apoderado" value={nombreNuevo} onChange={e => setNombreNuevo(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" required />
                        <input type="text" placeholder="Nombre Alumno" value={alumnoNuevo} onChange={e => setAlumnoNuevo(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" required />
                        <button type="submit" className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold py-2 rounded-xl text-xs transition">
                            + Agregar Apoderado
                        </button>
                    </form>

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 pt-2">
                        {datos.apoderados.map(apo => (
                            <div key={apo.id} className="flex justify-between items-center bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-xs">
                                <div>
                                    <span className="font-medium text-white">{apo.nombre}</span>
                                    <span className="text-slate-400 ml-2">(Alumno: {apo.alumno})</span>
                                </div>
                                <button onClick={() => handleEliminarApoderado(apo.id, apo.nombre)} className="text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                                    <i className="fa-solid fa-trash-can"></i> Retirar
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}