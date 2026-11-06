

// src/App.jsx
import React, { useState, useEffect } from 'react';
import VistaAdmin from './components/VistaAdmin';
import VistaPublica from './components/VistaPublica';

export default function App() {
    const [datos, setDatos] = useState(null);
    const [vistaActual, setVistaActual] = useState('publica'); // 'publica' o 'admin'

    // Función para obtener los datos frescos desde el backend
    const obtenerDatosDelBackend = async () => {
        try {
            const res = await fetch('/api/curso/datos');
            const json = await res.json();
            setDatos(json);
        } catch (error) {
            console.error("Error al conectar con el backend:", error);
        }
    };

    useEffect(() => {
        obtenerDatosDelBackend();
    }, []);

    // Pantalla de carga mientras responde el servidor
    if (!datos) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                    <i className="fa-solid fa-spinner animate-spin text-emerald-400"></i>
                    Cargando tesorería del curso...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Cabecera y Navegación entre Vistas */}
                <header className="flex flex-col sm:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <i className="fa-solid fa-wallet text-emerald-400"></i> Tesorería Curso
                        </h1>
                        <p className="text-xs text-slate-400">Control de finanzas, apoderados y mensualidades</p>
                    </div>

                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                        <button 
                            onClick={() => setVistaActual('publica')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${vistaActual === 'publica' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'}`}
                        >
                            <i className="fa-solid fa-eye mr-1"></i> Vista Pública
                        </button>
                        <button 
                            onClick={() => setVistaActual('admin')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${vistaActual === 'admin' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'}`}
                        >
                            <i className="fa-solid fa-lock mr-1"></i> Administración
                        </button>
                    </div>
                </header>

                {/* Renderizado condicional de las vistas principales */}
                <main>
                    {vistaActual === 'publica' ? (
                        <VistaPublica datos={datos} />
                    ) : (
                        <VistaAdmin datos={datos} onActualizar={obtenerDatosDelBackend} />
                    )}
                </main>

            </div>
        </div>
    );
}