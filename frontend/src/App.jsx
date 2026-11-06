// src/App.jsx
/* import React, { useState, useEffect } from 'react';
import VistaPublica from './components/VistaPublica';
import VistaAdmin from './components/VistaAdmin';

export default function App() {
    const [datos, setDatos] = useState(null);
    const [vista, setVista] = useState('publico'); // 'publico' o 'admin'

    const cargarDatos = async () => {
        try {
            const res = await fetch('/api/curso/datos');
            const json = await res.json();
            setDatos(json);
        } catch (e) {
            console.error("Error al cargar los datos del curso:", e);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    if (!datos) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
                <div className="text-center space-y-2">
                    <i className="fa-solid fa-spinner fa-spin text-emerald-400 text-2xl"></i>
                    <p className="text-sm text-slate-400">Cargando tesorería del curso...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
            <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-bold text-sm">
                        <i className="fa-solid fa-graduation-cap"></i>
                    </div>
                    <h1 className="text-sm font-bold text-white">Tesorería Curso 2026</h1>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setVista('publico')} 
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${vista === 'publico' ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                        Vista Pública
                    </button>
                    {vista === 'publico' ? (
                        <button 
                            onClick={() => {
                                const clave = prompt("Ingresa la clave de tesorero:");
                                if (clave === 'admin123') { // Puedes cambiar tu clave aquí
                                    setVista('admin');
                                } else if (clave !== null) {
                                    alert("Clave incorrecta");
                                }
                            }} 
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700">
                            Acceso Tesorero 🔒
                        </button>
                    ) : (
                        <button 
                            onClick={() => setVista('publico')} 
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            Salir de Admin
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-grow max-w-4xl w-full mx-auto p-4 sm:p-6">
                {vista === 'publico' ? (
                    <VistaPublica datos={datos} />
                ) : (
                    <VistaAdmin datos={datos} onActualizar={cargarDatos} />
                )}
            </main>
        </div>
    );
} */

    // src/App.jsx
import React, { useState, useEffect } from 'react';
import VistaPublica from './components/VistaPublica';
import VistaAdmin from './components/VistaAdmin';

export default function App() {
    // Datos iniciales de prueba para los 18 apoderados y gastos
    const meses = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const apoderadosMock = Array.from({ length: 18 }, (_, i) => ({
        id: `apo-${i + 1}`,
        nombre: `Apoderado ${i + 1}`,
        alumno: `Alumno ${i + 1}`,
        pagos: meses.reduce((acc, mes) => ({ ...acc, [mes]: { pagado: i % 2 === 0, monto: 15000, fecha: '2026-03-01' } }), {})
    }));

    const [datos, setDatos] = useState({
        configuracion: { cuota_mensual: 15000, meses },
        apoderados: apoderadosMock,
        gastos: [
            { id: 'g1', mes: 'Marzo', titulo: 'Compra de materiales de aseo', monto: 45000, fecha: '2026-03-05' }
        ]
    });
    
    const [vista, setVista] = useState('publico');

    // Si prefieres usar la API real cuando el backend esté encendido, puedes dejar el fetch condicional:
    useEffect(() => {
        fetch('/api/curso/datos')
            .then(res => res.json())
            .then(json => { if (json && json.apoderados) setDatos(json); })
            .catch(e => console.log("Usando datos locales de respaldo por defecto."));
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
            <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-bold text-sm">
                        <i className="fa-solid fa-graduation-cap"></i>
                    </div>
                    <h1 className="text-sm font-bold text-white">Tesorería Curso 2026</h1>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setVista('publico')} 
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${vista === 'publico' ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                        Vista Pública
                    </button>
                    {vista === 'publico' ? (
                        <button 
                            onClick={() => {
                                const clave = prompt("Ingresa la clave de tesorero:");
                                if (clave === 'admin123') {
                                    setVista('admin');
                                } else if (clave !== null) {
                                    alert("Clave incorrecta");
                                }
                            }} 
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700">
                            Acceso Tesorero 🔒
                        </button>
                    ) : (
                        <button 
                            onClick={() => setVista('publico')} 
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            Salir de Admin
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-grow max-w-4xl w-full mx-auto p-4 sm:p-6">
                {vista === 'publico' ? (
                    <VistaPublica datos={datos} />
                ) : (
                    <VistaAdmin datos={datos} onActualizar={() => {}} />
                )}
            </main>
        </div>
    );
}