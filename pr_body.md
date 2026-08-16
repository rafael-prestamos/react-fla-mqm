## Sprint 6a-1 — Rebrand logo

Reemplazo del logo mascota SVG anterior por el nuevo logo (perro navy con costillar). Cubre toda la app: favicon, iconos PWA, splash, login, header, PDFs.

### Cambios
- `chore(assets)`: script de generación + logo fuente 1024×1024
- `feat(pwa)`: manifest con nuevos iconos + theme colors (#16325C navy / #FBF5E9 crema)
- `feat(ui)`: componente `BrandLogo` como single source of truth
- `feat(pdf)`: logo en cabecera de comprobante y estado de cuenta
- `docs`: DECISIONS, CLAUDE, GEMINI actualizados

### Verificación
- [x] 109 tests pasando
- [x] Build sin warnings nuevos
- [x] QA visual local OK

### Observación cliente (Rafa/Fla)
> "Actualizar el logo por este en toda la app, pdfs, pestaña de web, icono de app, app en el celular, login, etc"

Cierra observación #5 del documento `observaciones-rafa-1208.md`.
