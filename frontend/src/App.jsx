// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import VistaPublica from './components/VistaPublica';
import VistaAdmin from './components/VistaAdmin';
import LoginAdmin from './components/LoginAdmin';

export default function App() {
    const [datos, setDatos] = useState(null);
    const [vistaActual, setVistaActual] = useState('publica'); // 'publica', 'login', 'admin'
    const [autenticado, setAutenticado] = useState(false);
    
    // Modo Dark / Light (Dark por defecto)
    const [modoOscuro, setModoOscuro] = useState(() => {
        const guardado = localStorage.getItem('tesoreria_tema');
        return guardado !== null ? guardado === 'dark' : true;
    });

    const timerInactividadRef = useRef(null);

    // Conmutar tema
    useEffect(() => {
        localStorage.setItem('tesoreria_tema', modoOscuro ? 'dark' : 'light');
        if (modoOscuro) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [modoOscuro]);

    // Cierre de sesión automático tras 3 minutos de inactividad
    const resetearTimerInactividad = () => {
        if (!autenticado) return;
        if (timerInactividadRef.current) clearTimeout(timerInactividadRef.current);
        
        // 3 minutos = 180.000 ms
        timerInactividadRef.current = setTimeout(() => {
            setAutenticado(false);
            setVistaActual('publica');
            alert("⏰ Su sesión ha expirado por 3 minutos de inactividad.");
        }, 3 * 60 * 1000);
    };

    useEffect(() => {
        if (autenticado) {
            const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
            eventos.forEach(ev => window.addEventListener(ev, resetearTimerInactividad));
            resetearTimerInactividad();

            return () => {
                eventos.forEach(ev => window.removeEventListener(ev, resetearTimerInactividad));
                if (timerInactividadRef.current) clearTimeout(timerInactividadRef.current);
            };
        }
    }, [autenticado]);

    const cargarDatos = async (anioDeseado = null) => {
        try {
            const url = anioDeseado ? `/api/curso/datos?anio=${anioDeseado}` : '/api/curso/datos';
            const res = await fetch(url);
            const json = await res.json();
            setDatos(json);
        } catch (error) {
            console.error("Error al cargar datos:", error);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const cerrarSesion = () => {
        if (timerInactividadRef.current) clearTimeout(timerInactividadRef.current);
        setAutenticado(false);
        setVistaActual('publica');
    };

    if (!datos) {
        return (
            <div className={`flex items-center justify-center min-h-screen ${modoOscuro ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-600'} text-xs font-sans`}>
                <i className="fa-solid fa-spinner animate-spin mr-2 text-emerald-500 text-sm"></i> Cargando tesorería...
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${modoOscuro ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} p-4 sm:p-8 font-sans transition-colors duration-200`}>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Cabecera Principal */}
                <header className={`flex flex-col sm:flex-row justify-between items-center ${modoOscuro ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border p-4 rounded-2xl shadow-xl gap-4`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-500/20">
                            <i className="fa-solid fa-graduation-cap"></i>
                        </div>
                        <div>
                            <h1 className="text-base font-bold flex items-center gap-2">
                                Tesorería del Curso
                            </h1>
                            <p className="text-xs text-slate-400">Control de cuotas, finanzas y transparencia</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Selector Modo Dark / Light */}
                        <button
                            onClick={() => setModoOscuro(!modoOscuro)}
                            className={`p-2 rounded-xl border text-xs transition flex items-center gap-1.5 ${modoOscuro ? 'bg-slate-950 border-slate-800 text-amber-400 hover:text-white' : 'bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-950'}`}
                            title="Cambiar Modo Claro/Oscuro"
                        >
                            <i className={`fa-solid ${modoOscuro ? 'fa-sun' : 'fa-moon'}`}></i>
                        </button>

                        {/* Navegación */}
                        <div className={`flex ${modoOscuro ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'} p-1 rounded-xl border text-xs`}>
                            <button
                                onClick={() => setVistaActual('publica')}
                                className={`px-3 py-1.5 rounded-lg font-medium transition ${vistaActual === 'publica' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                            >
                                <i className="fa-solid fa-eye mr-1"></i> Vista Pública
                            </button>

                            {autenticado ? (
                                <button
                                    onClick={() => setVistaActual('admin')}
                                    className={`px-3 py-1.5 rounded-lg font-medium transition ${vistaActual === 'admin' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <i className="fa-solid fa-user-shield mr-1"></i> Panel Admin
                                </button>
                            ) : (
                                <button
                                    onClick={() => setVistaActual('login')}
                                    className={`px-3 py-1.5 rounded-lg font-medium transition ${vistaActual === 'login' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <i className="fa-solid fa-lock mr-1"></i> Iniciar Sesión
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <main>
                    {vistaActual === 'publica' && (
                        <VistaPublica datos={datos} onCambiarAnio={cargarDatos} />
                    )}

                    {vistaActual === 'login' && !autenticado && (
                        <LoginAdmin
                            onLoginExitoso={() => {
                                setAutenticado(true);
                                setVistaActual('admin');
                            }}
                            onVolverPublica={() => setVistaActual('publica')}
                        />
                    )}

                    {vistaActual === 'admin' && autenticado && (
                        <VistaAdmin
                            datos={datos}
                            onActualizar={cargarDatos}
                            onCerrarSesion={cerrarSesion}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}