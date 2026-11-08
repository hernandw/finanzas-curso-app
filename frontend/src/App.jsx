// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import VistaPublica from './components/VistaPublica';
import VistaAdmin from './components/VistaAdmin';
import { cursoApi } from './services/cursoApi';

export default function App() {
    const [datos, setDatos] = useState(null);
    const [vistaActual, setVistaActual] = useState('publica'); // 'publica', 'login', 'admin'
    const [autenticado, setAutenticado] = useState(() => {
        return localStorage.getItem('tesoreria_admin_auth') === 'true';
    });

    // Formulario de login
    const [usuarioInput, setUsuarioInput] = useState('');
    const [claveInput, setClaveInput] = useState('');
    const [recordar, setRecordar] = useState(true);
    const [errorLogin, setErrorLogin] = useState(false);

    const timerInactividadRef = useRef(null);

    // Timeout de inactividad de 3 minutos
    const reiniciarTimer = () => {
        if (!autenticado) return;
        if (timerInactividadRef.current) clearTimeout(timerInactividadRef.current);
        timerInactividadRef.current = setTimeout(() => {
            handleCerrarSesion();
            alert("⏰ Tu sesión ha caducado por 3 minutos de inactividad.");
        }, 3 * 60 * 1000);
    };

    useEffect(() => {
        if (autenticado) {
            const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
            eventos.forEach(ev => window.addEventListener(ev, reiniciarTimer));
            reiniciarTimer();
            return () => {
                eventos.forEach(ev => window.removeEventListener(ev, reiniciarTimer));
                if (timerInactividadRef.current) clearTimeout(timerInactividadRef.current);
            };
        }
    }, [autenticado]);

    const cargarDatos = async (anio = null) => {
        try {
            const res = await cursoApi.obtenerDatos(anio);
            const data = await res.json();
            setDatos(data);
        } catch (error) {
            console.error("Error al cargar datos:", error);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        if (usuarioInput === 'admin' && claveInput === '1234') {
            setAutenticado(true);
            if (recordar) {
                localStorage.setItem('tesoreria_admin_auth', 'true');
            }
            setErrorLogin(false);
            setVistaActual('admin');
        } else {
            setErrorLogin(true);
        }
    };

    const handleCerrarSesion = () => {
        if (timerInactividadRef.current) clearTimeout(timerInactividadRef.current);
        setAutenticado(false);
        localStorage.removeItem('tesoreria_admin_auth');
        setVistaActual('publica');
    };

    if (!datos) {
        return (
            <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center font-sans">
                <div className="flex items-center gap-3 bg-[#0d1322] border border-[#1a233a] px-6 py-4 rounded-2xl shadow-xl">
                    <div className="w-5 h-5 border-2 border-[#00d084] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-slate-300 font-medium">Cargando tesorería del curso...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
            {/* ÚNICO HEADER GLOBAL DE TODA LA APLICACIÓN */}
            <header className="bg-[#0b1120] border-b border-[#162035] px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00d084] text-[#070b14] flex items-center justify-center font-bold text-lg shadow-md shadow-[#00d084]/20">
                        <i className="fa-solid fa-graduation-cap"></i>
                    </div>
                    <div>
                        <h1 className="text-sm md:text-base font-bold text-white tracking-wide">
                            Tesorería del Curso
                        </h1>
                        <p className="text-[11px] text-slate-400">Control de cuotas, finanzas y transparencia</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setVistaActual('publica')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                            vistaActual === 'publica' 
                                ? 'bg-[#00d084]/15 text-[#00d084] border border-[#00d084]/30' 
                                : 'bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300'
                        }`}
                    >
                        <i className="fa-solid fa-eye text-[#00d084]"></i>
                        <span>Vista Pública</span>
                    </button>

                    {/* EN VISTA PÚBLICA / SIN LOGIN NO APARECE CERRAR SESIÓN */}
                    {autenticado ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setVistaActual('admin')}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                                    vistaActual === 'admin' 
                                        ? 'bg-[#00d084] text-[#070b14] font-bold shadow-lg shadow-[#00d084]/20' 
                                        : 'bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300'
                                }`}
                            >
                                <i className="fa-solid fa-user-shield"></i>
                                <span>Panel Admin</span>
                            </button>
                            <button
                                onClick={handleCerrarSesion}
                                className="bg-[#e11d48]/15 hover:bg-[#e11d48]/25 border border-[#e11d48]/30 text-[#ff4b72] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                            >
                                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                                <span>Cerrar Sesión</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setVistaActual('login')}
                            className="bg-[#00d084] hover:bg-[#00b572] text-[#070b14] px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-lg shadow-[#00d084]/20 flex items-center gap-1.5"
                        >
                            <i className="fa-solid fa-lock text-[10px]"></i>
                            <span>Iniciar Sesión</span>
                        </button>
                    )}
                </div>
            </header>

            {/* VISTAS */}
            <main className="flex-1 w-full p-4 md:p-6 max-w-[1400px] mx-auto">
                {vistaActual === 'publica' && (
                    <VistaPublica datos={datos} onCambiarAnio={cargarDatos} />
                )}

                {vistaActual === 'login' && !autenticado && (
                    <div className="min-h-[75vh] flex items-center justify-center p-4">
                        <div className="bg-[#0b1120] border border-[#162035] p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-6">
                            <div className="text-center">
                                <div className="w-14 h-14 bg-[#00d084]/10 border border-[#00d084]/20 text-[#00d084] rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <i className="fa-solid fa-lock text-2xl"></i>
                                </div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Acceso a Tesorería</h2>
                                <p className="text-xs text-slate-400 mt-1">Ingrese sus credenciales de administración del curso</p>
                            </div>

                            {errorLogin && (
                                <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs p-3 rounded-xl text-center">
                                    Usuario o contraseña incorrectos.
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">Usuario</label>
                                    <input 
                                        type="text" 
                                        value={usuarioInput} 
                                        onChange={(e) => setUsuarioInput(e.target.value)}
                                        placeholder="admin"
                                        className="w-full bg-[#070b14] border border-[#1c2744] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00d084]"
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">Contraseña</label>
                                    <input 
                                        type="password" 
                                        value={claveInput} 
                                        onChange={(e) => setClaveInput(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-[#070b14] border border-[#1c2744] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00d084]"
                                        required 
                                    />
                                </div>

                                <div className="flex items-center justify-between text-xs pt-1">
                                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={recordar}
                                            onChange={(e) => setRecordar(e.target.checked)}
                                            className="rounded border-[#1c2744] text-[#00d084] focus:ring-0" 
                                        />
                                        <span>Recordar credenciales</span>
                                    </label>
                                    <span className="text-slate-500 text-[11px]">Sesión caduca en 3 min</span>
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full bg-[#00d084] hover:bg-[#00b572] text-[#070b14] font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-[#00d084]/20"
                                >
                                    Iniciar Sesión
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setVistaActual('publica')}
                                    className="w-full bg-[#0f172a] hover:bg-[#17223b] text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition border border-[#1c2744]"
                                >
                                    Volver a Vista Pública
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {vistaActual === 'admin' && autenticado && (
                    <VistaAdmin datos={datos} onActualizar={cargarDatos} onCerrarSesion={handleCerrarSesion} />
                )}
            </main>
        </div>
    );
}