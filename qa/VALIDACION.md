# Validación inicial · 6 de noviembre de 2026

- 121 pruebas del motor y de la integración móvil: aprobadas en la rama `visual`.
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

## Rama visual

Se aprobaron seis comprobaciones adicionales de interacción: vuelo de un arma nueva a su espacio medido, rechazo de selecciones repetidas durante el vuelo, mejora del objeto ya equipado sin duplicar su espacio, adquisición de pasivas, interrupción durante la adquisición de una definitiva, modo de movimiento reducido y tarjetas desplazables en teléfonos pequeños. El informe local se regenera con `npm run test:visual`. Las seis comprobaciones generales de `test:mobile` también pasaron con los nuevos controles.

## Rediseño roguelite

Se aprobaron otras seis comprobaciones de interfaz mediante `test:rogue`: menú compacto, las 15 identidades geométricas, todas las estadísticas tácticas de mejora (incluidos ralentización y ataque por ambos lados), inventario completo y traducido, resumen de pausa, derrota y reinicio. Los builds completos se preparan con datos de prueba en emulación. No se realizó una prueba en dispositivos físicos.


## Horizontal y rendimiento · 8 de noviembre de 2026

128 pruebas automatizadas aprobadas, TypeScript y ESLint aprobados, exportación Hermes Android/iOS aprobada. La configuración solicita orientación horizontal y pantalla completa en iPad.

`test:landscape` aprobó 25 comprobaciones: pantallas de 568×320, 844×390 y 1280×720; tres mejoras sin recortes por el viewport ni por sus contenedores; todas las estadísticas tácticas; opciones, pausa, derrota y reinicio; anuncios delante de la vida, transparentes a los toques y con caducidad; galería de cinco enemigos, élites y congelados. Incluye DASH y ULT antes/después del joystick y ambos dedos iniciados en un mismo evento, con los dos órdenes. `test:mobile`, `test:visual` y `test:rogue` mantienen seis comprobaciones aprobadas cada uno: 43 comprobaciones de interfaz y controles en total.

Las mediciones en Edge/CanvasKit dieron 59,09 FPS enviados al inicio de una partida y 58,01–59,84 con 260 enemigos. No son presentaciones medidas de GPU ni pruebas nativas. La caché raster a 3× evitó repetir el dibujo vectorial por enemigo; React no se actualiza por cada frame de combate. Se conserva la simulación a paso fijo y solo se limita el dibujo cosmético de chispas y cifras.

Los valores completos, condiciones de prueba y capturas están en [docs/HORIZONTAL.md](../docs/HORIZONTAL.md). El rendimiento estable en celulares y partidas largas sigue pendiente de medición física.
