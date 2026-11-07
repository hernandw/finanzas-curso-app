// src/services/cursoApi.js

export const cursoApi = {
    cambiarAnio: (nuevoAnio) =>
        fetch('/api/curso/admin/cambiar-anio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nuevoAnio })
        }),

    aperturarAnio: (nuevoAnio, cuotaMensual) =>
        fetch('/api/curso/admin/cambiar-anio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nuevoAnio, cuotaMensual })
        }),

    cerrarAnioEscolar: () =>
        fetch('/api/curso/admin/cerrar-anio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }),

    actualizarConfiguracion: (config) =>
        fetch('/api/curso/admin/configuracion', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        }),

    registrarPagoGlobal: (pago) =>
        fetch('/api/curso/admin/pago-global', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pago)
        }),

    eliminarPagoMes: (apoderadoId, mes) =>
        fetch(`/api/curso/admin/pago/${apoderadoId}/${mes}`, { method: 'DELETE' }),

    agregarApoderado: (apoderado) =>
        fetch('/api/curso/admin/apoderado/agregar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apoderado)
        }),

    editarApoderado: (id, apoderado) =>
        fetch(`/api/curso/admin/apoderado/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apoderado)
        }),

    eliminarApoderado: (id) =>
        fetch(`/api/curso/admin/apoderado/${id}`, { method: 'DELETE' }),

    cambiarEstadoApoderado: (id, activo) =>
        fetch(`/api/curso/admin/apoderado/estado/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo })
        }),

    registrarGasto: (gasto) =>
        fetch('/api/curso/admin/gasto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gasto)
        }),

    eliminarGasto: (id) =>
        fetch(`/api/curso/admin/gasto/${id}`, { method: 'DELETE' }),

    registrarIngresoExtra: (ingreso) =>
        fetch('/api/curso/admin/ingreso-extra', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ingreso)
        }),

    eliminarIngresoExtra: (id) =>
        fetch(`/api/curso/admin/ingreso-extra/${id}`, { method: 'DELETE' }),

    restaurarBackup: (json) =>
        fetch('/api/curso/backup/restaurar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(json)
        }),

    resetApp: () =>
        fetch('/api/curso/reset', { method: 'DELETE' })
};