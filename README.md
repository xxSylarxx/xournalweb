# Xournal++ Web 🚀

Replicación moderna de **Xournal++** para la web, diseñada con enfoque de alto rendimiento, baja latencia y compatibilidad total con archivos `.xopp`.

## Características Implementadas

- 🖊️ **Motor de Trazo de Alta Fidelidad**:
  - Integración con `perfect-freehand` para trazos suaves tipo pluma estilográfica.
  - Soporte para **Pointer Events** con captura de micro-puntos de hardware (`getCoalescedEvents`) a 120 Hz – 240 Hz.
  - Sensibilidad a la presión nativa de Stylus / Apple Pencil / Surface Pen.
  - Marcador resaltador con modo de mezcla `multiply` y transparencia natural.
- 🧽 **Borrador de Trazos**:
  - Detección precisa de colisiones vectoriales segmento a segmento (`isPointNearStroke`).
- ↩️ **Historial Deshacer / Rehacer (Undo / Redo)**:
  - Patrón Command para revertir y restaurar trazos y borrados (`Ctrl+Z` / `Ctrl+Y`).
- 📄 **Compatibilidad Nativa con Archivos `.xopp`**:
  - Apertura directa de archivos `.xopp` y `.xoj` descomprimiendo GZIP y parseando la estructura XML.
  - Guardado y descarga directa en formato `.xopp` comprimido con GZIP listo para abrirse en el Xournal++ de escritorio.
- 📐 **Lienzo Multicapa de Alto Rendimiento**:
  - Separación en capas: Fondo (papel/cuadrícula), Trazos confirmados y Trazo activo (60-120 FPS sin redibujar el documento entero).
  - Fondos de página configurables: Rayado, Cuadriculado, Puntos y En blanco.
- 📑 **Gestor Multipágina y Zoom**:
  - Barra lateral de navegación con miniaturas y conteo de trazos.
  - Creación y eliminación de páginas dinámicas.
  - Controles de zoom (30% - 300%) y ajuste al 100%.

## Requisitos y Puesta en Marcha

1. Asegúrate de tener instalado **Node.js** (v18 o superior).
2. Entra al directorio:
   ```sh
   cd C:\Users\AxelSoft\Downloads\xournalpp_web
   ```
3. Inicia el servidor de desarrollo:
   ```sh
   npm run dev
   ```
4. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Arquitectura de Tecnologías

- **Framework**: React 19 + TypeScript + Vite
- **Estilos**: Tailwind CSS + Lucide Icons
- **Estado**: Zustand
- **Motor de Trazos**: `perfect-freehand` + Canvas 2D acelerado por hardware
- **Códec .xopp**: `fflate` (GZIP) + `fast-xml-parser` (XML)

