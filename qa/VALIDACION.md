# Validación inicial · 6 de noviembre de 2026

- 112 pruebas del motor y de la integración móvil: aprobadas.
- TypeScript y ESLint: aprobados.
- Expo Doctor: 20 de 20 comprobaciones aprobadas.
- Exportación Hermes y recursos de Android e iOS: aprobada.
- Edge con emulación móvil y CanvasKit: flujo aprobado sin errores JavaScript.

El flujo automatizado incluye inicio y avance real de la simulación, dibujo Skia, movimiento y DASH con dos dedos enviados por el protocolo del navegador, liberación de un dedo, pausa, cambio de idioma y volumen, selección de mejoras, adquisición y activación de definitiva, interrupción del motor, fin de partida y persistencia de récord y opciones tras recargar. También comprueba controles en 320×568 y 768×1024, además de 390×844.

Reproducir con `npm run qa:serve` y, en otra terminal, `npm run test:mobile`. El informe se guarda en `qa/mobile-smoke.json` y las capturas se regeneran en esta carpeta. No se versionan estos archivos generados.

## Pendiente en dispositivos reales

- Compilar y ejecutar el código nativo en Android e iOS.
- Comprobar audio y gestos con dos dedos en hardware real, auriculares e interrupciones por llamadas.
- Revisar recortes, barras del sistema, botón Atrás y accesibilidad nativa.
- Medir memoria, temperatura y tiempos por frame en partidas largas con 260 enemigos.
- Generar un APK para pruebas y ajustar balance y escala según resultados.

La exportación de JavaScript y las pruebas del navegador no acreditan que una compilación nativa o una prueba física hayan ocurrido. Todavía no hay APK/IPA ni publicación en tiendas.
