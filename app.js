// app.js

/**
 * DATOS INICIALES y ESTRUCTURAS
 * Se proporcionan las estructuras predeterminadas (pueden ser modificadas dinámicamente)
 */
const defaultFormulations = [
    {
        id: 'compost_basico',
        name: 'Compost Básico',
        expectedVolume: 1000,
        inputs: [
            { id: 'i1', name: 'Rastrojo / Material Seco', quantity: 500, unit: 'libras', unitCost: 0.10 },
            { id: 'i2', name: 'Estiércol', quantity: 300, unit: 'libras', unitCost: 0.15 },
            { id: 'i3', name: 'Tierra negra', quantity: 150, unit: 'libras', unitCost: 0.05 },
            { id: 'i4', name: 'Ceniza / Cal agrícola', quantity: 30, unit: 'libras', unitCost: 0.50 },
            { id: 'i5', name: 'Melaza', quantity: 10, unit: 'litros', unitCost: 0.80 },
            { id: 'i6', name: 'Microorganismos', quantity: 10, unit: 'litros', unitCost: 1.50 }
        ],
        labor: [
            { id: 'l1', activity: 'Recolección y picado de material', workers: 1, costPerHour: 39.85, hours: 16 },
            { id: 'l2', activity: 'Armado de la pila', workers: 1, costPerHour: 39.85, hours: 8 },
            { id: 'l3', activity: 'Volteos y mantenimiento', workers: 1, costPerHour: 39.85, hours: 32 },
            { id: 'l4', activity: 'Cribado y ensacado', workers: 1, costPerHour: 39.85, hours: 16 }
        ]
    },
    {
        id: 'bocashi',
        name: 'Bocashi Rápido',
        expectedVolume: 500,
        inputs: [
            { id: 'i1', name: 'Tierra cernida', quantity: 150, unit: 'libras', unitCost: 0.05 },
            { id: 'i2', name: 'Cascarilla de arroz', quantity: 150, unit: 'libras', unitCost: 0.20 },
            { id: 'i3', name: 'Gallinaza / Estiércol', quantity: 150, unit: 'libras', unitCost: 0.15 },
            { id: 'i4', name: 'Carbón vegetal molido', quantity: 25, unit: 'libras', unitCost: 0.40 },
            { id: 'i5', name: 'Melaza', quantity: 5, unit: 'litros', unitCost: 0.80 },
            { id: 'i6', name: 'Levadura', quantity: 1, unit: 'libras', unitCost: 5.00 }
        ],
        labor: [
            { id: 'l1', activity: 'Mezclado inicial', workers: 1, costPerHour: 39.85, hours: 8 },
            { id: 'l2', activity: 'Volteos diarios (15 días)', workers: 1, costPerHour: 39.85, hours: 24 }
        ]
    }
];

/**
 * ESTADO DE LA APLICACIÓN
 */
let appState = {
    currentFormulationId: '',
    data: {} 
};

/**
 * FORMATEO DE MONEDA
 */
const formatMoney = (amount) => {
    return 'L. ' + (amount || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const parseNumber = (value) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * INICIALIZACIÓN
 */
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado con éxito.', reg))
            .catch(err => console.error('Error al registrar el Service Worker', err));
    });
}

function initApp() {
    loadData();
    populateFormulationSelector();
    bindGlobalEvents();
    renderAll();
}

/**
 * GESTIÓN DE DATOS (LOCAL STORAGE)
 */
function loadData() {
    const savedData = localStorage.getItem('agrocostos_data');
    if (savedData) {
        try {
            appState.data = JSON.parse(savedData);
        } catch (e) {
            console.error('Error parseando datos guardados', e);
            initializeDefaultData();
        }
    } else {
        initializeDefaultData();
    }
    
    // Seleccionar la primera por defecto si no hay ninguna
    if (Object.keys(appState.data).length > 0) {
        appState.currentFormulationId = Object.keys(appState.data)[0];
    }
}

function initializeDefaultData() {
    appState.data = {};
    defaultFormulations.forEach(form => {
        // Hacemos una copia profunda
        appState.data[form.id] = JSON.parse(JSON.stringify(form));
    });
}

function saveData() {
    localStorage.setItem('agrocostos_data', JSON.stringify(appState.data));
    showToast('Datos guardados correctamente', 'success');
}

/**
 * EVENTOS GLOBALES
 */
function bindGlobalEvents() {
    document.getElementById('formulation-select').addEventListener('change', (e) => {
        appState.currentFormulationId = e.target.value;
        renderAll();
    });

    document.getElementById('btn-save').addEventListener('click', saveData);
    
    document.getElementById('btn-reset').addEventListener('click', () => {
        if (confirm('¿Estás seguro de restablecer todos los datos a sus valores originales? Se perderán tus cambios.')) {
            initializeDefaultData();
            appState.currentFormulationId = defaultFormulations[0].id;
            saveData();
            populateFormulationSelector();
            renderAll();
            showToast('Datos restablecidos', 'success');
        }
    });

    document.getElementById('btn-export').addEventListener('click', exportToCSV);

    document.getElementById('expected-volume').addEventListener('input', (e) => {
        const val = parseNumber(e.target.value);
        if(val > 0) {
            e.target.classList.remove('input-error');
            getCurrentFormulation().expectedVolume = val;
            updateTotals();
            autoSave();
        } else {
            e.target.classList.add('input-error');
        }
    });

    // Agregar nuevo insumo
    document.getElementById('btn-add-input').addEventListener('click', () => {
        const formulation = getCurrentFormulation();
        formulation.inputs.push({
            id: 'i_new_' + Date.now(),
            name: 'Nuevo Insumo',
            quantity: 0,
            unit: 'libras',
            unitCost: 0
        });
        renderInputs();
        updateTotals();
        autoSave();
    });

    // Agregar nueva labor
    document.getElementById('btn-add-labor').addEventListener('click', () => {
        const formulation = getCurrentFormulation();
        formulation.labor.push({
            id: 'l_new_' + Date.now(),
            activity: 'Nueva Actividad',
            workers: 1,
            costPerHour: 39.85,
            hours: 1
        });
        renderLabor();
        updateTotals();
        autoSave();
    });
}

// Auto-guardado silencioso
let autoSaveTimeout;
function autoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        localStorage.setItem('agrocostos_data', JSON.stringify(appState.data));
    }, 1000);
}

function getCurrentFormulation() {
    return appState.data[appState.currentFormulationId];
}

/**
 * RENDERIZADO
 */
function populateFormulationSelector() {
    const select = document.getElementById('formulation-select');
    select.innerHTML = '';
    
    Object.values(appState.data).forEach(form => {
        const option = document.createElement('option');
        option.value = form.id;
        option.textContent = form.name;
        if (form.id === appState.currentFormulationId) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function renderAll() {
    if (!appState.currentFormulationId) return;
    const form = getCurrentFormulation();
    if (!form) return;

    document.getElementById('expected-volume').value = form.expectedVolume || 1;
    
    renderInputs();
    renderLabor();
    updateTotals();
}

/**
 * TABLA INSUMOS
 */
function renderInputs() {
    const tbody = document.querySelector('#inputs-table tbody');
    tbody.innerHTML = '';
    
    const inputs = getCurrentFormulation().inputs;
    
    inputs.forEach((input, index) => {
        const tr = document.createElement('tr');
        
        const total = input.quantity * input.unitCost;

        tr.innerHTML = `
            <td>
                <input type="text" class="table-input" value="${input.name}" data-idx="${index}" data-field="name">
            </td>
            <td>
                <input type="number" step="0.01" min="0" class="table-input" value="${input.quantity}" data-idx="${index}" data-field="quantity">
            </td>
            <td>
                <input type="text" class="table-input" value="${input.unit}" data-idx="${index}" data-field="unit" style="width: 80px;">
            </td>
            <td>
                <input type="number" step="0.01" min="0" class="table-input" value="${input.unitCost}" data-idx="${index}" data-field="unitCost">
            </td>
            <td class="font-bold row-total" data-idx="${index}">
                ${formatMoney(total)}
            </td>
            <td>
                <button class="btn-icon delete-input" data-idx="${index}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Ligar eventos de inputs de tabla
    tbody.querySelectorAll('.table-input').forEach(el => {
        el.addEventListener('input', handleInputEdit);
    });
    
    tbody.querySelectorAll('.delete-input').forEach(el => {
        el.addEventListener('click', (e) => {
            const idx = e.currentTarget.dataset.idx;
            getCurrentFormulation().inputs.splice(idx, 1);
            renderInputs();
            updateTotals();
            autoSave();
        });
    });
}

function handleInputEdit(e) {
    const el = e.target;
    const idx = el.dataset.idx;
    const field = el.dataset.field;
    let value = el.value;
    
    if (field === 'quantity' || field === 'unitCost') {
        value = parseNumber(value);
        if (value < 0) {
            el.classList.add('input-error');
            return;
        }
        el.classList.remove('input-error');
    }
    
    const inputObj = getCurrentFormulation().inputs[idx];
    inputObj[field] = value;
    
    // Actualizar total de la fila al vuelo si es numérico
    if (field === 'quantity' || field === 'unitCost') {
        const total = (inputObj.quantity || 0) * (inputObj.unitCost || 0);
        el.closest('tr').querySelector('.row-total').textContent = formatMoney(total);
        updateTotals();
        autoSave();
    } else {
        autoSave();
    }
}

/**
 * TABLA MANO DE OBRA
 */
function renderLabor() {
    const tbody = document.querySelector('#labor-table tbody');
    tbody.innerHTML = '';
    
    const labor = getCurrentFormulation().labor;
    
    labor.forEach((lab, index) => {
        const tr = document.createElement('tr');
        
        const total = lab.workers * lab.hours * lab.costPerHour;

        tr.innerHTML = `
            <td>
                <input type="text" class="table-input" value="${lab.activity}" data-idx="${index}" data-field="activity">
            </td>
            <td>
                <input type="number" step="1" min="0" class="table-input" value="${lab.workers}" data-idx="${index}" data-field="workers">
            </td>
            <td>
                <input type="number" step="0.01" min="0" class="table-input" value="${lab.costPerHour}" data-idx="${index}" data-field="costPerHour">
            </td>
            <td>
                <input type="number" step="0.1" min="0" class="table-input" value="${lab.hours}" data-idx="${index}" data-field="hours">
            </td>
            <td class="font-bold row-total" data-idx="${index}">
                ${formatMoney(total)}
            </td>
            <td>
                <button class="btn-icon delete-labor" data-idx="${index}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Ligar eventos
    tbody.querySelectorAll('.table-input').forEach(el => {
        el.addEventListener('input', handleLaborEdit);
    });
    
    tbody.querySelectorAll('.delete-labor').forEach(el => {
        el.addEventListener('click', (e) => {
            const idx = e.currentTarget.dataset.idx;
            getCurrentFormulation().labor.splice(idx, 1);
            renderLabor();
            updateTotals();
            autoSave();
        });
    });
}

function handleLaborEdit(e) {
    const el = e.target;
    const idx = el.dataset.idx;
    const field = el.dataset.field;
    let value = el.value;
    
    if (['workers', 'costPerHour', 'hours'].includes(field)) {
        value = parseNumber(value);
        if (value < 0) {
            el.classList.add('input-error');
            return;
        }
        el.classList.remove('input-error');
    }
    
    const laborObj = getCurrentFormulation().labor[idx];
    laborObj[field] = value;
    
    if (['workers', 'hours', 'costPerHour'].includes(field)) {
        const total = (laborObj.workers || 0) * (laborObj.hours || 0) * (laborObj.costPerHour || 0);
        el.closest('tr').querySelector('.row-total').textContent = formatMoney(total);
        updateTotals();
        autoSave();
    } else {
        autoSave();
    }
}

/**
 * CÁLCULO DE TOTALES
 */
function updateTotals() {
    const form = getCurrentFormulation();
    if (!form) return;

    // Totales insumos
    const totalInputs = form.inputs.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.unitCost || 0)), 0);
    document.getElementById('total-inputs-cost').textContent = formatMoney(totalInputs);
    document.getElementById('summary-inputs').textContent = formatMoney(totalInputs);
    
    // Totales jornales
    const totalLabor = form.labor.reduce((acc, curr) => acc + ((curr.workers || 0) * (curr.hours || 0) * (curr.costPerHour || 0)), 0);
    document.getElementById('total-labor-cost').textContent = formatMoney(totalLabor);
    document.getElementById('summary-labor').textContent = formatMoney(totalLabor);
    
    // Total General
    const grandTotal = totalInputs + totalLabor;
    document.getElementById('summary-total').textContent = formatMoney(grandTotal);
    
    // Costo por volumen (Ej: por kg o unidad)
    const vol = parseFloat(document.getElementById('expected-volume').value) || 1;
    const unitCost = grandTotal / vol;
    document.getElementById('summary-unit-cost').textContent = formatMoney(unitCost);

    // NUEVA LÓGICA CONDICIONAL: Costo del Lote Producido
    const formName = (form.name || '').toLowerCase();
    const isCompostOrBocashi = formName.includes('compost') || formName.includes('bocashi');
    const loteCostContainer = document.getElementById('lote-cost-container');

    if (isCompostOrBocashi) {
        // Obtenemos la 'Cantidad de Libras Totales' sumando los insumos que se miden en libras
        const cantidadLibrasTotales = form.inputs.reduce((acc, curr) => {
            const unit = (curr.unit || '').trim().toLowerCase();
            if (unit.includes('libra') || unit.includes('lb')) {
                return acc + parseNumber(curr.quantity);
            }
            return acc;
        }, 0);

        // Multiplica [Costo Unitario Producido] x [Cantidad de Libras Totales]
        const costoLoteProducido = unitCost * cantidadLibrasTotales;
        
        document.getElementById('summary-lote-cost').textContent = formatMoney(costoLoteProducido);
        loteCostContainer.style.display = 'flex';
    } else {
        loteCostContainer.style.display = 'none';
    }
}

/**
 * EXPORTAR A CSV
 */
function exportToCSV() {
    const form = getCurrentFormulation();
    if (!form) return;

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Añadir BOM para que Excel detecte UTF-8
    
    // Título
    csvContent += `Reporte de Costos: ${form.name}\n\n`;
    
    // INSUMOS
    csvContent += "INSUMOS\n";
    csvContent += "Insumo,Cantidad,Unidad,Costo Unitario (L.),Costo Total (L.)\n";
    let sumInputs = 0;
    form.inputs.forEach(i => {
        const tot = (i.quantity || 0) * (i.unitCost || 0);
        sumInputs += tot;
        csvContent += `"${i.name}",${i.quantity},"${i.unit}",${i.unitCost},${tot}\n`;
    });
    csvContent += `,,,TOTAL INSUMOS:,${sumInputs}\n\n`;
    
    // MANO DE OBRA
    csvContent += "MANO DE OBRA\n";
    csvContent += "Actividad,N Trabajadores,Costo x Hora (L.),Numero total de horas,Costo Total (L.)\n";
    let sumLabor = 0;
    form.labor.forEach(l => {
        const tot = (l.workers || 0) * (l.hours || 0) * (l.costPerHour || 0);
        sumLabor += tot;
        csvContent += `"${l.activity}",${l.workers},${l.costPerHour},${l.hours},${tot}\n`;
    });
    csvContent += `,,,TOTAL MANO DE OBRA:,${sumLabor}\n\n`;
    
    // RESUMEN
    const grandTotal = sumInputs + sumLabor;
    const vol = form.expectedVolume || 1;
    
    csvContent += "RESUMEN GENERAL\n";
    csvContent += `Total Insumos (L.),${sumInputs}\n`;
    csvContent += `Total Mano de Obra (L.),${sumLabor}\n`;
    csvContent += `Costo Total Produccion (L.),${grandTotal}\n`;
    csvContent += `Volumen Esperado,${vol}\n`;
    csvContent += `Costo Unitario Producido (L.),${grandTotal / vol}\n`;

    // Descarga
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Costos_${form.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Exportado a CSV con éxito', 'success');
}

/**
 * UI HELPERS: NOTIFICACIONES (TOAST)
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}
