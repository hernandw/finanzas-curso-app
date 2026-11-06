// src/components/VistaAdmin.jsx
import React, { useState } from 'react';

export default function VistaAdmin({ datos, onActualizar }) {
    // 1. Estados para el módulo de pagos
    const [apoderadoSel, setApoderadoSel] = useState(datos.apoderados[0]?.id || '');
    const [mesSel, setMesSel] = useState('Marzo');
    const [pagado, setPagado] = useState(true);
    const [montoCuota, setMontoCuota] = useState(datos.configuracion.cuota_mensual || 15000);

    // 2. Estados para el módulo de gastos
    const [tituloGasto, setTituloGasto] = useState('');
    const [montoGasto, setMontoGasto] = useState('');
    const [mesGasto, setMesGasto] = useState('Marzo');

    // 3. Estados para gestión de apoderados (Crear / Editar)
    const [editandoId, setEditandoId] = useState(null);
    const [nombreApoderado, setNombreApoderado] = useState('');
    const [alumnoApoderado, setAlumnoApoderado] = useState('');

    // --- ACCIONES DE LA API ---

    // Guardar o actualizar pago
    const handleActualizarPago = async (e) => {
        e.preventDefault();
        try {
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
        } catch (error) {
            alert("Error de conexión con el servidor.");
        }
    };

    // Registrar gasto general
    const handleRegistrarGasto = async (e) => {
        e.preventDefault();
        if (!tituloGasto || !montoGasto) return alert("Completa los campos del gasto.");

        try {
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
        } catch (error) {
            alert("Error de conexión con el servidor.");
        }
    };

    // Crear o Editar Apoderado (Usa la ruta completa con /api/)
    const handleGuardarApoderado = async (e) => {
        e.preventDefault();
        if (!nombreApoderado || !alumnoApoderado) return alert("Completa nombre y alumno.");

        const url = editandoId 
            ? `/api/curso/admin/apoderado/${editandoId}` 
            : '/api/curso/admin/apoderado/agregar';
        
        const method = editandoId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nombreApoderado, alumno: alumnoApoderado })
            });

            if (res.ok) {
                alert(editandoId ? "¡Apoderado actualizado con éxito!" : "¡Apoderado agregado con éxito!");
                setNombreApoderado('');
                setAlumnoApoderado('');
                setEditandoId(null);
                onActualizar();
            } else {
                alert("Error al procesar la solicitud del apoderado.");
            }
        } catch (error) {
            alert("Error de conexión con el servidor.");
        }
    };

    const iniciarEdicion = (apo) => {
        setEditandoId(apo.id);
        setNombreApoderado(apo.nombre);
        setAlumnoApoderado(apo.alumno);
    };

    const cancelarEdicion = () => {
        setEditandoId(null);
        setNombreApoderado('');
        setAlumnoApoderado('');
    };

    const handleEliminarApoderado = async (id, nombre) => {
        if (confirm(`¿Estás seguro de retirar a ${nombre} del curso?`)) {
            try {
                const res = await fetch(`/api/curso/admin/apoderado/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    alert("Apoderado retirado correctamente.");
                    onActualizar(); // <--- ¡Esta línea es la que le avisa a React que debe refrescar los datos automáticamente!
                } else {
                    alert("Error al retirar al apoderado.");
                }
            } catch (error) {
                alert("Error de conexión con el servidor.");
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
{/* MODULO NUEVO: RESUMEN FINANCIERO DE CADA ALUMNO */}
<div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
    <h3 className="text-sm font-semibold text-sky-400 flex items-center gap-2">
        <i className="fa-solid fa-chart-pie"></i> Resumen de Pagos por Alumno
    </h3>
    
    <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                    <th className="p-2">Apoderado / Alumno</th>
                    <th className="p-2 text-center">Total Pagado</th>
                    <th className="p-2 text-center">Meses Pendientes</th>
                    <th className="p-2 text-right">Saldo Deuda</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
                {datos.apoderados.filter(a => a.activo !== false).map(apo => {
                    let totalPagadoApo = 0;
                    let mesesDebe = 0;
                    
                    datos.configuracion.meses.forEach(mes => {
                        const p = apo.pagos[mes];
                        if (p && p.pagado) {
                            totalPagadoApo += Number(p.monto || 0);
                        } else {
                            // Si dejó un abono parcial, sumamos lo abonado pero cuenta como mes pendiente
                            if (p && p.monto > 0) totalPagadoApo += Number(p.monto);
                            mesesDebe++;
                        }
                    });

                    const deudaTotal = mesesDebe * datos.configuracion.cuota_mensual;

                    return (
                        <tr key={apo.id} className="hover:bg-slate-900/50">
                            <td className="p-2">
                                <span className="font-semibold text-white block">{apo.nombre}</span>
                                <span className="text-slate-400 text-[10px]">{apo.alumno}</span>
                            </td>
                            <td className="p-2 text-center font-bold text-emerald-400">
                                ${totalPagadoApo.toLocaleString('es-CL')}
                            </td>
                            <td className="p-2 text-center text-amber-400">
                                {mesesDebe} meses
                            </td>
                            <td className="p-2 text-right font-bold text-rose-400">
                                ${deudaTotal.toLocaleString('es-CL')}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
</div>
                {/* MODULO 3: GESTIÓN DE APODERADOS (AGREGAR / EDITAR / RETIRAR) */}
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-sky-400 flex items-center gap-2">
                            <i className="fa-solid fa-users-gear"></i> Gestión de Apoderados ({datos.apoderados.length} Registrados)
                        </h3>
                        {editandoId && (
                            <button onClick={cancelarEdicion} className="text-xs text-slate-400 hover:text-white underline">
                                Cancelar edición
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleGuardarApoderado} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input 
                            type="text" 
                            placeholder="Nombre Apoderado" 
                            value={nombreApoderado} 
                            onChange={e => setNombreApoderado(e.target.value)} 
                            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" 
                            required 
                        />
                        <input 
                            type="text" 
                            placeholder="Nombre Alumno" 
                            value={alumnoApoderado} 
                            onChange={e => setAlumnoApoderado(e.target.value)} 
                            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" 
                            required 
                        />
                        <button type="submit" className={`font-semibold py-2 rounded-xl text-xs transition ${editandoId ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' : 'bg-sky-500 hover:bg-sky-400 text-slate-950'}`}>
                            {editandoId ? '💾 Guardar Cambios' : '+ Agregar Apoderado'}
                        </button>
                    </form>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 pt-2">
                        {datos.apoderados.map(apo => (
                            <div key={apo.id} className="flex justify-between items-center bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-xs">
                                <div>
                                    <span className="font-medium text-white">{apo.nombre}</span>
                                    <span className="text-slate-400 ml-2">(Alumno: {apo.alumno})</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => iniciarEdicion(apo)} className="text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                                        <i className="fa-solid fa-pen"></i> Editar
                                    </button>
                                    <button onClick={() => handleEliminarApoderado(apo.id, apo.nombre)} className="text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                                        <i className="fa-solid fa-trash-can"></i> Retirar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}