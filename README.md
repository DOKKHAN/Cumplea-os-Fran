# Birthday Fashion Party

Landing page estatica para promocionar una fiesta de cumpleanos de disfraces con direccion visual editorial, oscura y sofisticada. El proyecto usa HTML, CSS, JavaScript vanilla, Nginx y Docker Compose.

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

## Como funciona el RSVP local

El formulario valida campos obligatorios, guarda la respuesta en `localStorage` y muestra una confirmacion editorial con el mensaje:

```text
YOUR NAME IS ON THE LIST.
```

Si una persona vuelve desde el mismo navegador, puede editar su respuesta anterior.

Tambien existe una utilidad discreta al final de la pagina para revisar registros locales. La clave esta en `site/config.js`:

```js
adminPasscode: "frontrow"
```

## Advertencia sobre localStorage

`localStorage` no es una solucion real para recopilar respuestas de multiples invitados. Cada navegador guarda sus propios datos de forma aislada, por lo que la anfitriona no vera respuestas enviadas desde otros dispositivos.

Para una version real, reemplaza este flujo por Google Forms, Tally, Supabase, Airtable, NocoDB o una API propia.

## Como reemplazar el formulario por un endpoint

En `site/app.js`, busca el listener de `form.addEventListener("submit", ...)` dentro de `handleRsvp()`.

Actualmente el flujo hace esto:

1. Valida el formulario.
2. Convierte los campos con `formToResponse(form)`.
3. Guarda en `localStorage`.
4. Muestra la confirmacion.

Para usar un endpoint, reemplaza el bloque de guardado local por un `fetch`:

```js
await fetch("https://tu-endpoint.example/rsvp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(response)
});
```

Despues de una respuesta exitosa, conserva `showConfirmation(response)` para mantener la experiencia visual.

## Estructura

```text
.
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
