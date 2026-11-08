# Adaptación inicial

Origen: `JOL25/Juego`, rama `main`, commit `9ea835d5a228a9ae274a3c4f62c3db0a95519cf2`. El original se consultó y se copió a este repositorio sin modificarlo.

Se reutilizan configuración de balance, utilidades, reloj de simulación a 60 Hz, cámara, entidades, cuadrícula espacial, colisiones, oleadas, armas, pasivas, definitivas, progresión e instrucciones iniciales. Las pruebas originales se trasladaron ajustando las rutas de importación; las pruebas exclusivas del navegador, Web Audio y CrazyGames se sustituyeron por verificaciones de la adaptación correspondiente.

`Game` recibe entrada, menús, sonido y renderer como dependencias. Su constructor no crea eventos DOM ni inicia un bucle global. `GameCanvas` controla los frames y cancela el bucle al desmontarse. `Game.suspend()` limpia controles, pausa el sonido y la simulación. `Game.resume()` reinicia el reloj, conservando las elecciones pendientes y la pausa.

`WorldRenderer` conserva la composición del mundo y los métodos de dibujo de las entidades. `SkiaContext` implementa solo las operaciones utilizadas por el juego mediante Paint, PathBuilder y PictureRecorder nativos. Los sprites geométricos se graban como vectores Skia y se rasterizan a 3× en una caché limitada; el parpadeo de invulnerabilidad mantiene su transparencia. No se actualiza un componente React por enemigo. Los indicadores de la interfaz se refrescan cada 100 ms y la escena tiene un componente separado.

`TouchInput` conserva un identificador de dedo para movimiento y colas independientes para acciones. Las coordenadas de pantalla evitan saltos al cambiar el elemento que entrega un gesto. DASH/ULT se activan en el inicio del toque para admitir pulsaciones cortas sin los retrasos de Pressability. Soltar otro dedo no cancela el joystick.

`hydrateStorage` carga AsyncStorage antes de construir el juego. El motor usa una caché síncrona y las escrituras persistentes se serializan para evitar que un récord antiguo sobrescriba uno reciente. Una falla de almacenamiento no bloquea la partida. No se guarda una partida en curso: se guardan el récord y las preferencias.

Los sonidos originales se sintetizan durante el desarrollo con `npm run assets:audio` y se incluyen como WAV. Expo Audio reproduce los recursos locales sin solicitar permiso de micrófono. Se limitan voces y repeticiones; las operaciones de reproducción pendientes se invalidan al pausar o reiniciar.

No se portan las integraciones de CrazyGames ni sus anuncios. La primera versión simplifica los resplandores y dibuja las cifras de daño con glifos geométricos. La identidad del icono también se genera con código (`npm run assets:icons`).

La plantilla inicial es `create-expo-app` / `blank-typescript`. Su aviso de licencia se conserva en `THIRD_PARTY_NOTICES/Expo-template-LICENSE.txt`; no se asigna una licencia nueva al código del juego.
