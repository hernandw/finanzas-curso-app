// src/components/VistaAdmin.jsx
import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cursoApi } from '../services/cursoApi';

export default function VistaAdmin({ datos, onActualizar, onCerrarSesion }) {
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [tipoMensaje, setTipoMensaje] = useState('info');

    // Modales y formularios
    const [modalApoderado, setModalApoderado] = useState(false);
    const [apoderadoEditando, setApoderadoEditando] = useState(null);
    const [formApoderado, setFormApoderado] = useState({ nombre: '', alumno: '', email: '' });

    const [modalGasto, setModalGasto] = useState(false);
    const [formGasto, setFormGasto] = useState({ mes: 'Marzo', titulo: '', monto: '', fecha: '' });

    const [modalPago, setModalPago] = useState(false);
    const [apoderadoPago, setApoderadoPago] = useState(null);
    const [formPago, setFormPago] = useState({ montoEntregado: '', fecha: '', responsable: '' });

    const fileInputRef = useRef(null);

    const anioActivo = datos.anio_activo || "2026";
    const infoConfig = datos.configuracion || {};
    const cuotaMensual = Number(infoConfig.cuota_mensual || 21000);
    const apoderados = datos.apoderados || [];
    const gastos = datos.gastos || [];
    const meses = infoConfig.meses || [];

    const mostrarAlerta = (txt, tipo = 'info') => {
        setMensaje(txt);
        setTipoMensaje(tipo);
        setTimeout(() => setMensaje(null), 6000);
    };

    // Generar archivo PDF en memoria
    const generarBlobPDF = () => {
        const doc = new jsPDF('landscape');
        doc.setFontSize(16);
        doc.text(`Balance General - ${infoConfig.nombre_curso || "Curso"} (${anioActivo})`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Profesor: ${infoConfig.profesor || "-"} | Presidente: ${infoConfig.presidente || "-"} | Tesorero: ${infoConfig.tesorero || "-"}`, 14, 22);

        const head = [['#', 'Apoderado', 'Alumno', ...meses, 'Total']];
        const body = apoderados.filter(a => a.activo !== false).map((apo, idx) => {
            let totalApo = 0;
            const filaMeses = meses.map(m => {
                const p = apo.pagos[m];
                if (p?.exonerado) return 'Exon.';
                const monto = Number(p?.monto || 0);
                totalApo += monto;
                return monto > 0 ? `$${monto.toLocaleString('es-CL')}` : '-';
            });
            return [idx + 1, apo.nombre, apo.alumno, ...filaMeses, `$${totalApo.toLocaleString('es-CL')}`];
        });

        autoTable(doc, {
            head,
            body,
            startY: 28,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1.5 },
            headStyles: { fillColor: [30, 41, 59] }
        });

        return doc.output('blob');
    };

    // 1. Enviar PDF por Correo y guardar copia local automáticamente
    const handleEnviarPdfCorreo = async () => {
        try {
            setCargando(true);
            const pdfBlob = generarBlobPDF();

            // Descarga automática en el computador local
            const urlBlob = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = urlBlob;
            a.download = `Balance_${anioActivo}_Oficial.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(urlBlob);

            // Envío al servidor para distribución por correo
            const formData = new FormData();
            formData.append('pdf', pdfBlob, `balance-${anioActivo}.pdf`);
            formData.append('anio', anioActivo);

            const res = await cursoApi.enviarPdfCorreo(formData);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Fallo al enviar PDF");

            mostrarAlerta(`✅ Copia guardada en tu equipo y enviada por correo a ${data.destinatarios} apoderados.`, 'success');
        } catch (error) {
            mostrarAlerta(`❌ ${error.message}`, 'error');
        } finally {
            setCargando(false);
        }
    };

    // 2. Enviar Correo de Bienvenida a todos
    const handleEnviarBienvenida = async () => {
        if (!confirm(`¿Deseas enviar el correo oficial de bienvenida y presentación de directiva a todos los apoderados con correo del año ${anioActivo}?`)) return;
        try {
            setCargando(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/curso/admin/enviar-correo-bienvenida`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ anio: anioActivo })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fallo al enviar bienvenidas");

            mostrarAlerta(`🎉 Correo de bienvenida enviado con éxito a ${data.destinatarios} apoderados.`, 'success');
        } catch (error) {
            mostrarAlerta(`❌ ${error.message}`, 'error');
        } finally {
            setCargando(false);
        }
    };

    // 3. Backup JSON
    const handleBackup = () => {
        window.open(cursoApi.backupUrl(), '_blank');
    };

    // 4. Restaurar Backup
    const handleArchivoRestaurar = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                setCargando(true);
                const res = await cursoApi.restaurarBackup(event.target.result);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Error al restaurar");
                mostrarAlerta("✅ Tesorería restaurada exitosamente.", 'success');
                onActualizar();
            } catch (err) {
                mostrarAlerta(`❌ ${err.message}`, 'error');
            } finally {
                setCargando(false);
            }
        };
        reader.readAsText(file);
    };

    // Guardar / Modificar Apoderado
    const handleGuardarApoderado = async (e) => {
        e.preventDefault();
        try {
            setCargando(true);
            if (apoderadoEditando) {
                await cursoApi.modificarApoderado(apoderadoEditando.id, { ...formApoderado, anio: anioActivo });
                mostrarAlerta("Apoderado actualizado correctamente.", 'success');
            } else {
                await cursoApi.agregarApoderado({ ...formApoderado, anio: anioActivo });
                mostrarAlerta("Nuevo apoderado agregado.", 'success');
            }
            setModalApoderado(false);
            setApoderadoEditando(null);
            setFormApoderado({ nombre: '', alumno: '', email: '' });
            onActualizar();
        } catch (err) {
            mostrarAlerta("Error al guardar apoderado.", 'error');
        } finally {
            setCargando(false);
        }
    };

    // Registrar Pago Global
    const handleRegistrarPago = async (e) => {
        e.preventDefault();
        try {
            setCargando(true);
            await cursoApi.registrarPagoGlobal({
                apoderadoId: apoderadoPago.id,
                montoEntregado: Number(formPago.montoEntregado),
                fecha: formPago.fecha,
                responsable: formPago.responsable,
                anio: anioActivo
            });
            mostrarAlerta("Abono procesado correctamente.", 'success');
            setModalPago(false);
            setFormPago({ montoEntregado: '', fecha: '', responsable: '' });
            onActualizar();
        } catch (err) {
            mostrarAlerta("Error al registrar pago.", 'error');
        } finally {
            setCargando(false);
        }
    };

    // Registrar Gasto
    const handleRegistrarGasto = async (e) => {
        e.preventDefault();
        try {
            setCargando(true);
            await cursoApi.registrarGasto({ ...formGasto, monto: Number(formGasto.monto), anio: anioActivo });
            mostrarAlerta("Gasto registrado con éxito.", 'success');
            setModalGasto(false);
            setFormGasto({ mes: 'Marzo', titulo: '', monto: '', fecha: '' });
            onActualizar();
        } catch (err) {
            mostrarAlerta("Error al registrar gasto.", 'error');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-6 font-sans">
            {/* BARRA SUPERIOR: TÍTULO + IDENTIFICADOR ADMIN + BOTÓN CERRAR SESIÓN */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 md:p-6 shadow-xl mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                        Panel de Administración — {infoConfig.nombre_curso} ({anioActivo})
                    </h1>
                    <p className="text-slate-400 text-xs mt-1">
                        Gestión financiera escolar, rendición de cuentas y distribución de informes
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider shadow">
                        ADMIN
                    </span>
                    <button
                        onClick={onCerrarSesion}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow hover:shadow-lg flex items-center gap-1.5"
                    >
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </div>

            {/* ALERTAS */}
            {mensaje && (
                <div className={`p-4 rounded-xl mb-6 text-sm font-semibold shadow-md ${
                    tipoMensaje === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    tipoMensaje === 'error' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                    'bg-blue-100 text-blue-800 border border-blue-300'
                }`}>
                    {mensaje}
                </div>
            )}

            {/* BOTONERA PRINCIPAL DE ACCIONES */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-2.5 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleEnviarPdfCorreo}
                        disabled={cargando}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
                    >
                        📄 Descargar y Enviar Balance PDF
                    </button>

                    <button
                        onClick={handleEnviarBienvenida}
                        disabled={cargando}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
                    >
                        ✉️ Enviar Bienvenida a Todos
                    </button>

                    <button
                        onClick={() => {
                            setApoderadoEditando(null);
                            setFormApoderado({ nombre: '', alumno: '', email: '' });
                            setModalApoderado(true);
                        }}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow"
                    >
                        ➕ Nuevo Apoderado
                    </button>

                    <button
                        onClick={() => setModalGasto(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow"
                    >
                        🏷️ Registrar Gasto
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleBackup}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    >
                        💾 Backup .json
                    </button>

                    <input
                        type="file"
                        accept=".json"
                        ref={fileInputRef}
                        onChange={handleArchivoRestaurar}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current.click()}
                        disabled={cargando}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    >
                        📥 Restaurar
                    </button>
                </div>
            </div>

            {/* TABLA PRINCIPAL DE APODERADOS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-sm font-bold text-slate-800">
                        Nómina de Estudiantes y Cuotas Mensuales ({apoderados.length})
                    </h2>
                    <span className="text-xs text-slate-500 font-medium">Cuota: ${cuotaMensual.toLocaleString('es-CL')}</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                            <tr>
                                <th className="p-3">Apoderado / Alumno</th>
                                <th className="p-3">Correo Electrónico</th>
                                {meses.map(m => <th key={m} className="p-3 text-center">{m}</th>)}
                                <th className="p-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {apoderados.map(apo => (
                                <tr key={apo.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3">
                                        <div className="font-bold text-slate-900">{apo.nombre}</div>
                                        <div className="text-slate-500 text-[11px]">{apo.alumno}</div>
                                    </td>
                                    <td className="p-3">
                                        {apo.email ? (
                                            <span className="text-slate-700 font-medium">{apo.email}</span>
                                        ) : (
                                            <span className="text-rose-500 text-[10px] font-bold">Sin correo</span>
                                        )}
                                    </td>
                                    {meses.map(m => {
                                        const p = apo.pagos[m];
                                        if (p?.exonerado) {
                                            return <td key={m} className="p-3 text-center"><span className="text-slate-400 font-bold">Exon.</span></td>;
                                        }
                                        const pagado = p?.pagado;
                                        const monto = Number(p?.monto || 0);
                                        return (
                                            <td key={m} className="p-3 text-center">
                                                {pagado ? (
                                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                        ${monto.toLocaleString('es-CL')}
                                                    </span>
                                                ) : monto > 0 ? (
                                                    <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                        ${monto.toLocaleString('es-CL')}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 font-medium">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="p-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                onClick={() => {
                                                    setApoderadoPago(apo);
                                                    setFormPago({ montoEntregado: '', fecha: new Date().toISOString().slice(0, 10), responsable: apo.nombre });
                                                    setModalPago(true);
                                                }}
                                                className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors"
                                            >
                                                Pagar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setApoderadoEditando(apo);
                                                    setFormApoderado({ nombre: apo.nombre, alumno: apo.alumno, email: apo.email || '' });
                                                    setModalApoderado(true);
                                                }}
                                                className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors"
                                            >
                                                Editar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL APODERADO */}
            {modalApoderado && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-slate-900 mb-4">
                            {apoderadoEditando ? 'Modificar Apoderado' : 'Registrar Nuevo Apoderado'}
                        </h3>
                        <form onSubmit={handleGuardarApoderado} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Apoderado</label>
                                <input
                                    type="text"
                                    required
                                    value={formApoderado.nombre}
                                    onChange={e => setFormApoderado({ ...formApoderado, nombre: e.target.value })}
                                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Alumno</label>
                                <input
                                    type="text"
                                    required
                                    value={formApoderado.alumno}
                                    onChange={e => setFormApoderado({ ...formApoderado, alumno: e.target.value })}
                                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico (Notificaciones)</label>
                                <input
                                    type="email"
                                    placeholder="ejemplo@gmail.com"
                                    value={formApoderado.email}
                                    onChange={e => setFormApoderado({ ...formApoderado, email: e.target.value })}
                                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalApoderado(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={cargando}
                                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL PAGO GLOBAL */}
            {modalPago && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-slate-900 mb-1">Abonar Cuotas</h3>
                        <p className="text-xs text-slate-500 mb-4">{apoderadoPago?.alumno} — {apoderadoPago?.nombre}</p>
                        <form onSubmit={handleRegistrarPago} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Monto Entregado ($)</label>
                                <input
                                    type="number"
                                    required
                                    min="100"
                                    placeholder="Ej: 21000"
                                    value={formPago.montoEntregado}
                                    onChange={e => setFormPago({ ...formPago, montoEntregado: e.target.value })}
                                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    required
                                    value={formPago.fecha}
                                    onChange={e => setFormPago({ ...formPago, fecha: e.target.value })}
                                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Responsable del Pago</label>
                                <input
                                    type="text"
                                    value={formPago.responsable}
                                    onChange={e => setFormPago({ ...formPago, responsable: e.target.value })}
                                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalPago(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={cargando}
                                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow"
                                >
                                    Procesar Abono
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL GASTO */}
            {modalGasto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-slate-900 mb-4">Registrar Nuevo Gasto</h3>
                        <form onSubmit={handleRegistrarGasto} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Mes Contable</label>
                                <select
                                    value={formGasto.mes}
                                    onChange={e => setFormGasto({ ...formGasto, mes: e.target.value })}
                                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {meses.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción / Título</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Torta aniversario o abono paseo"
                                    value={formGasto.titulo}
                                    onChange={e => setFormGasto({ ...formGasto, titulo: e.target.value })}
                                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Monto ($)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    placeholder="Ej: 35000"
                                    value={formGasto.monto}
                                    onChange={e => setFormGasto({ ...formGasto, monto: e.target.value })}
                                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    value={formGasto.fecha}
                                    onChange={e => setFormGasto({ ...formGasto, fecha: e.target.value })}
                                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalGasto(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={cargando}
                                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow"
                                >
                                    Guardar Gasto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}