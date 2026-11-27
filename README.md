# Cancha TV

App de Android TV que muestra https://canchatv.base44.app/ a pantalla completa.

## Contenido

- Proyecto Android nativo en Java, sin dependencias externas.
- Icono y banner de TV generados con tu configuracion.
- Icono y banner de TV ya colocados en res/mipmap (192x192 y 320x180).
- Navegacion con mando: el D-pad mueve el foco y el boton OK pulsa el elemento.
- APK universal: una sola compilacion para todas las arquitecturas (ARM 32/64 bits y x86),
  asi el mismo archivo se instala en cualquier television o TV box.
- Formato Android TV: la web se muestra con el texto ampliado un 30 %, sin barras de
  desplazamiento y con areas pulsables mas grandes, para leerla desde el sofa.
- Flujo de GitHub Actions que compila y firma el APK automaticamente.

## Navegacion con mando (D-pad)

El archivo app/src/main/assets/tv-nav.js se inyecta en cada pagina y gestiona el
mando a distancia:

- Recorrido completo: entran botones, enlaces y cualquier elemento clicable de la
  pagina, aunque no sea un boton nativo.
- Flechas: mueven el foco al elemento mas cercano en esa direccion y lo desplazan
  a la vista si queda fuera de pantalla.
- OK / Enter / Play: pulsa el elemento enfocado.
- Atras: vuelve a la pagina anterior dentro de la web.
- Canales: al pulsar un canal, el reproductor ocupa toda la pantalla y Atras
  vuelve a la lista.
- Video: los reproductores que piden pantalla completa se muestran a pantalla
  completa y Atras vuelve a la pagina.

Puedes ajustar el grosor y el color del anillo de foco en la regla .tv-focus-ring
de ese archivo.

## 1. Crea tu clave de firma (solo una vez)

    keytool -genkeypair -v -keystore keystore/release.jks -alias tvtool -keyalg RSA -keysize 2048 -validity 10000

Guarda release.jks y sus contrasenas: son la identidad de tu app.
Para publicar actualizaciones tendras que firmar con la misma clave.

## 2. Opcion A: compilar en Android Studio (recomendado)

1. Abre esta carpeta con Android Studio (genera el wrapper automaticamente).
2. Copia tu keystore a keystore/release.jks.
3. Define las variables de entorno KEYSTORE_PASSWORD, KEY_ALIAS y KEY_PASSWORD.
4. Build > Generate Signed App Bundle / APK > APK > release.
5. El APK firmado queda en app/build/outputs/apk/release/.

## 3. Opcion B: compilar en GitHub, sin instalar nada

1. Sube este proyecto a un repositorio de GitHub.
2. En Settings > Secrets and variables > Actions crea estos secretos:
   KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD
3. Convierte tu keystore a base64:

       base64 -w0 keystore/release.jks > keystore.b64

4. Abre la pestana Actions y ejecuta "Build signed APK".
5. Descarga el APK firmado desde los artefactos de la ejecucion.

## 4. Instala en la television

    adb connect IP_DE_TU_TV:5555
    adb install -r app-release.apk

Tambien puedes copiar el APK a la TV y abrirlo con una app tipo Downloader.

## Version

versionName 1.0 · versionCode 1
