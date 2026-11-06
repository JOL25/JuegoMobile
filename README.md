# JuegoMobile · Circle vs Geometry

Primera adaptación nativa para **Android e iOS** del juego [JOL25/Juego](https://github.com/JOL25/Juego), con **Expo SDK 58, React Native y Skia**. El motor conserva las reglas del juego original; la arena se dibuja con Skia y los menús y controles son componentes de React Native.

## Ya implementado

La rama **`visual`** añade botones con rebote y pulsos, tarjetas de mejora animadas, transferencia del objeto elegido hacia su inventario y una arena de circuitos geométricos. Ver [capturas y detalles](docs/VISUAL.md).

- Arena, jugador, cinco familias de enemigos, élites, armas automáticas, partículas y colisiones.
- Experiencia, selección de armas y mejoras, pasivas y tres definitivas desde nivel 5.
- Joystick táctil y botones DASH/ULT que funcionan con varios dedos.
- Menú, pausa, reinicio, fin de partida, instrucciones iniciales y anuncios de enemigos.
- Audio original convertido a WAV locales, con volumen configurable.
- Récord, idioma español/inglés, volumen y tutorial guardados en el dispositivo.
- Pausa al pasar a segundo plano; al regresar hace falta pulsar Continuar.
- Áreas seguras para recortes de pantalla y distribución para teléfonos y tabletas.

## Ejecutar en Android

Requisitos: Node.js 22.13 o superior, JDK 21 y Android SDK para compilar localmente. Usa las versiones de herramientas que indique Expo para SDK 58.

```sh
npm ci
npm run android
```

El comando genera el proyecto nativo con Expo y abre la aplicación en un dispositivo Android conectado o un emulador. Para reiniciar solo Metro después de instalar el development build:

```sh
npm start
```

En macOS, con Xcode y un simulador/dispositivo iOS configurados:

```sh
npm run ios
```

### APK de prueba con Expo Build / EAS

El perfil `preview` de `eas.json` está preparado para generar un APK instalable:

```sh
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

La primera compilación requiere vincular el proyecto con tu cuenta de Expo y configurar sus credenciales. No hay todavía un APK, una publicación en tiendas ni un proyecto de Expo Build vinculado a este repositorio.

## Verificar

```sh
npm test
npm run typecheck
npm run lint
npm run doctor
npm run export:native
```

`export:native` verifica el empaquetado de JavaScript/Hermes y los recursos de Android/iOS. **No sustituye una compilación nativa ni una prueba en un celular.** La validación inicial y las limitaciones están documentadas en [qa/VALIDACION.md](qa/VALIDACION.md).

### Vista web de control de calidad

Es una vista auxiliar del mismo motor y los mismos menús, con CanvasKit. La app móvil usa Skia nativo.

```sh
npm run web
```

Para ejecutar las pruebas de gestos y flujo en Windows, abre dos terminales:

```sh
npm run qa:serve
```

```sh
npm run test:mobile
```

En la rama `visual`, con el mismo servidor activo, `npm run test:visual` comprueba las transferencias al inventario, selección única, interrupciones y movimiento reducido.

El script usa Edge instalado. En Linux/macOS, instala Chromium con `npx playwright install chromium` y usa `BROWSER_CHANNEL=chromium npm run test:mobile`. El acceso de pruebas al motor existe únicamente en desarrollo con `EXPO_PUBLIC_QA=1`; no está disponible en los paquetes de producción.

## Estructura

```text
src/game/         Motor reutilizado: entidades, armas, colisiones y progresión
src/mobile/       UI, entrada táctil, ciclo de vida, audio y guardado nativos
src/rendering/    Adaptador de dibujo Skia y caché de sprites
assets/audio/     Efectos originales, locales y reproducibles
tests/            Regresiones del motor y adaptación móvil
scripts/          Generación de recursos y pruebas del flujo móvil
```

No se cargan el SDK de CrazyGames, publicidad de portal, HTML ni WebViews en la app móvil. Los menús son estados superpuestos de una sola pantalla de juego.

## Próxima validación

Instalar en Android e iPhone reales, medir partidas largas con hordas máximas, comprobar interrupciones de audio y ajustar tamaño del jugador, legibilidad y respuesta táctil con pruebas de uso. Los efectos de resplandor del Canvas original están simplificados en esta primera versión.

Procedencia y decisiones de adaptación: [docs/ADAPTACION.md](docs/ADAPTACION.md).
