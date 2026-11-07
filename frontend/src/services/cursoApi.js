// src/services/cursoApi.js

export const cursoApi = {
    // 1. Obtener datos (permite especificar año o usar el activo)
    obtenerDatos: (anio = null) => {
        const url = anio ? `/api/curso/datos?anio=${anio}` : '/api/curso/datos';
        return fetch(url);
    },

    // 2. Gestión de Años
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

    // 3. Configuración y Datos del Curso
    actualizarConfiguracion: (config) =>
        fetch('/api/curso/admin/configuracion', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        }),

    // 4. Pagos, Abonos y Exoneración
    registrarPagoGlobal: (pago) =>
        fetch('/api/curso/admin/pago-global', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pago)
        }),

    eliminarPagoMes: (apoderadoId, mes) =>
        fetch(`/api/curso/admin/pago/${apoderadoId}/${mes}`, {
            method: 'DELETE'
        }),

    exonerarMes: (apoderadoId, mes) =>
        fetch(`/api/curso/admin/pago/exonerar/${apoderadoId}/${mes}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        }),

    // 5. Apoderados y Alumnos
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

    cambiarEstadoApoderado: (id, activo) =>
        fetch(`/api/curso/admin/apoderado/estado/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo })
        }),

    eliminarApoderado: (id) =>
        fetch(`/api/curso/admin/apoderado/${id}`, {
            method: 'DELETE'
        }),

    // 6. Gastos
    registrarGasto: (gasto) =>
        fetch('/api/curso/admin/gasto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gasto)
        }),

    eliminarGasto: (id) =>
        fetch(`/api/curso/admin/gasto/${id}`, {
            method: 'DELETE'
        }),

    // 7. Ingresos Extra
    registrarIngresoExtra: (ingreso) =>
        fetch('/api/curso/admin/ingreso-extra', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ingreso)
        }),

    eliminarIngresoExtra: (id) =>
        fetch(`/api/curso/admin/ingreso-extra/${id}`, {
            method: 'DELETE'
        }),

    // 8. Copias de Seguridad y Reset
    restaurarBackup: (json) =>
        fetch('/api/curso/backup/restaurar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(json)
        }),

    resetApp: () =>
        fetch('/api/curso/reset', {
            method: 'DELETE'
        })
};