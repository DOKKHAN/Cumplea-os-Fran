# Birthday Fashion Party

Landing page para promocionar una fiesta de cumpleanos de disfraces con direccion visual editorial, oscura y sofisticada. El proyecto usa HTML, CSS, JavaScript vanilla, un servidor Node liviano y Docker Compose.

## Requisitos

- Docker
- Docker Compose

## Levantar el sitio

```bash
docker compose up -d --build
```

Luego abre:

```text
http://localhost:8080
```

Si el puerto `8080` ya esta ocupado, puedes levantarlo con otro puerto:

```bash
HOST_PORT=8082 docker compose up -d --build
```

En PowerShell:

```powershell
$env:HOST_PORT = "8082"; docker compose up -d --build
```

Para detener y limpiar el contenedor:

```bash
docker compose down -v
```

## Donde editar la informacion del evento

Los datos principales estan centralizados en:

```text
site/config.js
```

Ahi puedes cambiar nombre de la cumpleanera, titulo, fecha, hora, ubicacion, dress code, hashtag, deadline de RSVP y clave simple del panel local.

Usa `eventDateISO` para el contador. Debe ser una fecha valida para JavaScript, idealmente con zona horaria:

```js
eventDateISO: "2026-09-12T21:00:00-03:00"
```

## Donde editar colores, textos y estilos

- Colores, tipografias, layout y animaciones: `site/styles.css`
- Estructura y textos fijos de secciones: `site/index.html`
- Comportamiento del contador, RSVP y panel local: `site/app.js`
- Datos editables del evento: `site/config.js`

La paleta esta definida con variables CSS al inicio de `site/styles.css`.

## Como funciona el RSVP

El formulario valida campos obligatorios, envia la respuesta a la API interna `/api/rsvps`, la guarda en `/data/rsvps.json` dentro del contenedor y muestra una confirmacion editorial con el mensaje:

```text
YOUR NAME IS ON THE LIST.
```

Si una persona vuelve desde el mismo navegador, puede editar su respuesta anterior porque el navegador conserva solo el identificador de su ultimo RSVP.

Tambien existe una utilidad discreta al final de la pagina para revisar los registros del contenedor. La clave por defecto esta en `site/config.js` y en el servidor:

```js
adminPasscode: "frontrow"
```

En produccion puedes cambiar la clave con la variable de entorno:

```text
ADMIN_PASSCODE=tu-clave
```

## Advertencia sobre almacenamiento en contenedor

Las respuestas se guardan en `/data/rsvps.json`. Para que sobrevivan a recreaciones del contenedor, configura persistencia para `/data` en Coolify. El archivo `docker-compose.coolify.yml` declara un volumen llamado `rsvp-data`.

Para una version mas robusta, reemplaza este flujo por Google Forms, Tally, Supabase, Airtable, NocoDB o una API propia con base de datos.

## Como reemplazar el formulario por un endpoint

En `site/app.js`, busca `saveResponseToApi(response)`. Actualmente envia los datos a:

```text
POST /api/rsvps
```

Para usar un endpoint, reemplaza el bloque de guardado local por un `fetch`:

```js
await fetch("https://tu-endpoint.example/rsvp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(response)
});
```

Despues de una respuesta exitosa, conserva `showConfirmation(response)` para mantener la experiencia visual.

## Deploy en Coolify

Opcion recomendada con Docker Compose:

- Source: Public Repository
- Repository: `https://github.com/DOKKHAN/Cumplea-os-Fran.git`
- Branch: `main`
- Build Pack: `Docker Compose`
- Docker Compose Location: `/docker-compose.coolify.yml`
- Port Exposes: `3000`
- Persistent Storage: montar `/data`

Este archivo usa el `Dockerfile`, que levanta un servidor Node liviano, sirve `site/` y guarda las respuestas en `/data/rsvps.json`. No publica puertos directamente; Coolify enruta el trafico con su proxy.

Opcion alternativa:

- Build Pack: `Dockerfile`
- Dockerfile Location: `/Dockerfile`
- Port Exposes: `3000`
- Persistent Storage: montar `/data`

Si ves la pagina default de Nginx, normalmente significa que Coolify no esta usando este Dockerfile/Compose, o que el deploy anterior quedo cacheado. Ejecuta `Force Redeploy` despues de cambiar el build pack.

## Estructura

```text
.
├── Dockerfile
├── docker-compose.coolify.yml
├── docker-compose.yml
├── nginx/
│   └── default.conf
├── site/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── config.js
│   └── assets/
│       └── README.md
├── README.md
└── .gitignore
```
