// src/App.jsx
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, Link } from 'react-router-dom';
import VistaAdmin from './components/VistaAdmin';
import VistaPublica from './components/VistaPublica';

function LoginAdmin({ onLogin }) {
    const [usuario, setUsuario] = useState('');
    const [clave, setClave] = useState('');
    const [error, setError] = useState(false);
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        // Credenciales por defecto (puedes cambiarlas aquí)
        if (usuario === 'admin' && clave === '1234') {
            onLogin(true);
            navigate('/admin/panel');
        } else {
            setError(true);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm space-y-6">
                <div className="text-center">
                    <i className="fa-solid fa-lock text-emerald-400 text-3xl mb-2"></i>
                    <h2 className="text-lg font-bold text-white">Acceso Administrativo</h2>
                    <p className="text-xs text-slate-400 mt-1">Ingrese sus credenciales de tesorería</p>
                </div>

                {error && (
                    <div className="bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs p-3 rounded-xl text-center">
                        Usuario o contraseña incorrectos.
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Usuario</label>
                        <input 
                            type="text" 
                            value={usuario} 
                            onChange={(e) => setUsuario(e.target.value)}
                            placeholder="admin"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                            required 
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Contraseña</label>
                        <input 
                            type="password" 
                            value={clave} 
                            onChange={(e) => setClave(e.target.value)}
                            placeholder="••••"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                            required 
                        />
                    </div>
                    <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition">
                        Entrar al Panel
                    </button>
                </form>

                <div className="text-center pt-2">
                    <Link to="/" className="text-xs text-slate-500 hover:text-slate-300 transition">
                        ← Volver a la Vista Pública
                    </Link>
                </div>
            </div>
        </div>
    );
}

function MainApp() {
    const [datos, setDatos] = useState(null);
    const [isAdminAutenticado, setIsAdminAutenticado] = useState(false);

    const cargarDatos = async () => {
        try {
            const res = await fetch('/api/curso/datos');
            const data = await res.json();
            setDatos(data);
        } catch (error) {
            console.error("Error al cargar datos:", error);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Barra de Navegación Superior */}
            <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-emerald-400">
                        <i className="fa-solid fa-vault text-lg"></i>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-wide">
                            Tesorería Escolar {datos?.configuracion?.nombre_curso ? `- ${datos.configuracion.nombre_curso}` : ''}
                        </h1>
                        <p className="text-[10px] text-slate-400">Sistema de Gestión y Transparencia Financiera</p>
                    </div>
                </div>

                <nav className="flex items-center gap-3">
                    <Link to="/" className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition">
                        <i className="fa-solid fa-eye mr-1.5 text-emerald-400"></i> Vista Pública
                    </Link>
                    <Link to={isAdminAutenticado ? "/admin/panel" : "/admin/login"} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow">
                        <i className="fa-solid fa-lock mr-1.5"></i> {isAdminAutenticado ? 'Panel Admin' : 'Acceso Admin'}
                    </Link>
                </nav>
            </header>

            {/* Contenido Dinámico con Rutas */}
            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                <Routes>
                    <Route path="/" element={<VistaPublica datos={datos} />} />
                    <Route path="/admin/login" element={<LoginAdmin onLogin={setIsAdminAutenticado} />} />
                    <Route path="/admin/panel" element={
                        isAdminAutenticado ? (
                            <VistaAdmin datos={datos} onActualizar={cargarDatos} />
                        ) : (
                            <LoginAdmin onLogin={setIsAdminAutenticado} />
                        )
                    } />
                </Routes>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <HashRouter>
            <MainApp />
        </HashRouter>
    );
}