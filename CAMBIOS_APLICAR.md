# Cambios a Implementar del Template HTML

## ✅ Ya Implementado:
1. Estados para páginas seleccionadas, info desplegable, guardado
2. Función eliminar páginas seleccionadas
3. Función toggle selección de página
4. Función guardar PDF en Drive
5. Import de Save

## 📝 Pendiente por Implementar:

### 1. **Botón Guardar en Header** (después del zoom)
Agregar después de la línea del zoom:

```jsx
{/* 💾 Botón Guardar */}
{!mostradoGuardadoExitoso ? (
  <button
    onClick={guardarPDFEnDrive}
    disabled={guardandoPDF}
    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
    title="Guardar cambios en Drive"
  >
    <Save className="w-4 h-4" />
    <span className="hidden md:inline text-xs">{guardandoPDF ? 'Guardando...' : 'Guardar'}</span>
  </button>
) : (
  <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-xl text-green-400 font-semibold animate-pulse">
    <CheckCircle className="w-4 h-4" />
    <span className="hidden md:inline text-xs">Guardado en Drive</span>
  </div>
)}
```

### 2. **Sección de Información Desplegable en Sidebar**
Agregar AL INICIO del contenido del sidebar (antes de ROTACIÓN):

```jsx
{/* SECCIÓN INFORMACIÓN (DESPLEGABLE) */}
<div className="border-b border-gray-700 mb-4">
  <button 
    onClick={() => setMostrarInfoDesplegable(!mostrarInfoDesplegable)}
    className="w-full px-4 py-3 bg-gray-800/50 text-white font-semibold text-sm hover:bg-gray-800 flex items-center justify-between transition-colors"
  >
    <span className="flex items-center gap-2">
      <User className="w-4 h-4" />
      👤 Información
    </span>
    <ChevronDown className={`w-4 h-4 transition-transform ${mostrarInfoDesplegable ? 'rotate-180' : ''}`} />
  </button>
  
  {mostrarInfoDesplegable && (
    <div className="bg-gray-800/30 p-3 space-y-2">
      <div>
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Nombre</div>
        <div className="text-xs text-gray-200 bg-black/30 px-2 py-1.5 rounded">{casoActualizado.nombre || 'N/A'}</div>
      </div>
      
      <div>
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Cédula</div>
        <div className="text-xs text-yellow-300 font-semibold bg-black/30 px-2 py-1.5 rounded">{casoActualizado.cedula || 'N/A'}</div>
      </div>
      
      <div>
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Teléfono</div>
        <div className="text-xs text-gray-200 bg-black/30 px-2 py-1.5 rounded">{casoActualizado.telefono || 'N/A'}</div>
      </div>
      
      <div>
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Email</div>
        <div className="text-xs text-gray-200 bg-black/30 px-2 py-1.5 rounded break-all">{casoActualizado.email || 'N/A'}</div>
      </div>
      
      <div>
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Empresa</div>
        <div className="text-xs text-gray-200 bg-black/30 px-2 py-1.5 rounded">{casoActualizado.empresa || 'N/A'}</div>
      </div>
      
      <div>
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Estado</div>
        <div className="flex items-center gap-2 bg-red-600/20 px-2 py-1.5 rounded border border-red-500/30">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
          <span className="text-xs text-red-300 font-semibold">{casoActualizado.estado}</span>
        </div>
      </div>
      
      {casoActualizado.metadata_reenvio?.tiene_reenvios && (
        <div>
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Reenvíos</div>
          <div className="text-xs text-orange-300 bg-black/30 px-2 py-1.5 rounded">
            {casoActualizado.metadata_reenvio.total_reenvios} intentos
          </div>
        </div>
      )}
      
      <div>
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Días</div>
        <div className="text-xs text-yellow-300 font-semibold bg-black/30 px-2 py-1.5 rounded">
          {casoActualizado.dias || 'N/A'} días
        </div>
      </div>
      
      <div>
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Tipo</div>
        <div className="text-xs text-gray-200 bg-black/30 px-2 py-1.5 rounded capitalize">
          {casoActualizado.tipo?.replace('_', ' ') || 'N/A'}
        </div>
      </div>
    </div>
  )}
</div>
```

### 3. **Actualizar Sección de Calidad con 3 Niveles**
Reemplazar el bloque actual de CALIDAD por:

```jsx
{/* CALIDAD */}
<div className="border border-gray-700 rounded-lg overflow-hidden">
  <button className="w-full px-4 py-2 bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 flex items-center justify-between">
    <span>✨ Mejorar Calidad</span>
    <span>▼</span>
  </button>
  <div className="bg-gray-800/50 p-2 space-y-1">
    <button 
      onClick={() => {mejorarCalidadHD('rapido'); setShowToolsMenu(false);}} 
      disabled={enviandoValidacion} 
      className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50"
    >
      ⚡ Rápido (1.8x)
    </button>
    <button 
      onClick={() => {mejorarCalidadHD('estandar'); setShowToolsMenu(false);}} 
      disabled={enviandoValidacion} 
      className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50"
    >
      ⚡ Estándar (2.5x)
    </button>
    <button 
      onClick={() => {mejorarCalidadHD('premium'); setShowToolsMenu(false);}} 
      disabled={enviandoValidacion} 
      className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50"
    >
      ⚡ Premium (3.5x)
    </button>
  </div>
</div>
```

### 4. **Agregar Filtro de Enfoque en FILTROS**
Agregar después de Brillo:

```jsx
<button 
  onClick={() => {aplicarFiltro('sharpen'); setShowToolsMenu(false);}} 
  disabled={enviandoValidacion} 
  className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50"
>
  🎯 Enfoque
</button>
```

### 5. **Agregar Sección Eliminar Páginas**
Agregar AL FINAL antes del panel de atajos:

```jsx
{/* ELIMINAR PÁGINAS */}
<div className="border border-red-700/30 rounded-lg overflow-hidden">
  <button 
    onClick={() => setMostrarMiniaturas(!mostrarMiniaturas)}
    className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 font-semibold text-sm flex items-center justify-between transition-colors"
  >
    <span className="flex items-center gap-2">
      🗑️ Eliminar Páginas
    </span>
    <span>▼</span>
  </button>
  <div className="bg-gray-800/50 p-3">
    <div className="text-xs text-gray-300 mb-2">
      Seleccionadas: <strong className="text-white">{paginasSeleccionadas.length}/{pages.length}</strong>
    </div>
    <button
      onClick={eliminarPaginasSeleccionadas}
      disabled={paginasSeleccionadas.length === 0 || enviandoValidacion}
      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {paginasSeleccionadas.length === 0 ? '❌ Selecciona primero' : `🗑️ Eliminar ${paginasSeleccionadas.length} pág.`}
    </button>
  </div>
</div>
```

### 6. **Agregar Checkboxes en Miniaturas**
En la sección de miniaturas, modificar cada miniatura para incluir checkbox:

```jsx
<div 
  key={idx}
  onClick={() => setCurrentPage(idx)}
  className={`relative cursor-pointer rounded-lg overflow-hidden transition-all ${
    idx === currentPage 
      ? 'ring-4 ring-blue-500 scale-105' 
      : 'ring-1 ring-gray-600 hover:ring-gray-400'
  }`}
  style={{
    width: '140px',
    aspectRatio: '8.5 / 11'
  }}
>
  {/* Checkbox para selección */}
  <input
    type="checkbox"
    checked={paginasSeleccionadas.includes(idx)}
    onChange={(e) => {
      e.stopPropagation();
      toggleSeleccionPagina(idx);
    }}
    className="absolute top-2 right-2 w-4 h-4 z-10 cursor-pointer accent-red-600"
    title="Seleccionar para eliminar"
  />
  
  <canvas
    ref={el => {
      if (el && page) {
        const viewport = page.getViewport({ scale: 0.5 });
        el.width = viewport.width;
        el.height = viewport.height;
        const ctx = el.getContext('2d');
        page.render({ canvasContext: ctx, viewport }).promise;
      }
    }}
    className="w-full h-full bg-white"
  />
  
  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
    <span className="text-white text-[10px] font-bold">{idx + 1}</span>
  </div>
</div>
```

## 🔧 Orden de Implementación:
1. ✅ Agregar botón Guardar en header
2. ✅ Agregar sección Información desplegable
3. ✅ Actualizar Calidad con 3 niveles
4. ✅ Agregar filtro Enfoque
5. ✅ Agregar sección Eliminar Páginas
6. ✅ Modificar miniaturas con checkboxes

## 🎯 Resultado Final:
El sidebar tendrá:
- **Información del caso** (desplegable)
- **Rotación** (3 opciones)
- **Calidad** (3 niveles: Rápido, Estándar, Premium)
- **Filtros** (4 filtros: B&N, Contraste, Brillo, Enfoque)
- **Geometría** (2 opciones)
- **Eliminar Páginas** (con contador y botón)
- **Atajos** (panel informativo)
