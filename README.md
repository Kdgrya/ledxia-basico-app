# Ledxia

Sistema de gestión clínica para consultorios y clínicas pequeñas. Cubre el flujo de
trabajo de recepción de principio a fin: registro de pacientes, generación de cargos,
caja y facturación con comprobante fiscal electrónico (e-CF/DGII), impresión de recibos
y administración de usuarios con permisos por módulo.

A diferencia de la plataforma completa, esta edición se enfoca en lo esencial: un
dashboard directo, sin laboratorio, sobre infraestructura Firebase. Cada clínica opera
de forma aislada (multi-tenant).

## Estado del proyecto

Esta edición nace como una **extracción** de una plataforma más amplia: se tomaron los
módulos esenciales y se reconstruyeron sobre Firebase. Por esa razón, algunos módulos
pueden estar **parcialmente implementados** o cubrir solo el flujo principal, y ciertas
piezas quedan como base para extender.

El desarrollador que continúe debe **avanzar a su discreción**: revisar cada módulo,
completar lo que falte y adaptarlo a los requerimientos del cliente. Conviene validar el
comportamiento de cada pantalla antes de darla por terminada y apoyarse en la sección
[Cómo ampliar el proyecto](#cómo-ampliar-el-proyecto) más abajo.

## Módulos

- **Pacientes** — alta, edición y búsqueda de pacientes con su historial básico.
- **Recepción** — puesto de front-desk: localiza al paciente, arma la orden con el
  catálogo de servicios y la deja lista para cobro. Puede facturarse a un paciente o a
  una empresa (crédito).
- **Facturación / Caja** — apertura y cierre de caja con conteo de denominaciones,
  registro de pagos (efectivo, tarjeta, transferencia), depósitos y retiros, y emisión
  del comprobante fiscal electrónico (e-CF) ante la DGII.
- **Servicios** — catálogo de servicios y precios.
- **Configuración** — perfil de la clínica y branding, parámetros del sistema,
  plantillas de impresión, configuración fiscal (e-CF) e impresoras.
- **Usuarios** — gestión de usuarios y roles con permisos por módulo.

## Stack tecnológico

- **Next.js 16** (App Router) y **React 19**.
- **TypeScript** en modo estricto.
- **Tailwind CSS 4** con componentes **shadcn/ui** sobre **Base UI**.
- **sonner** para notificaciones, **lucide-react** para iconografía.
- **Firebase**:
  - **Firestore** como base de datos (modelo multi-tenant).
  - **Authentication** (email/contraseña, con custom claims `tenantId` y `role`).
  - **Cloud Functions v2** para aprovisionamiento de clínicas, gestión de usuarios,
    e-CF y orquestación de impresión.
  - **App Hosting** para desplegar la aplicación Next.js.
- **Ledxia Connect** — agente de impresión local en Node (carpeta `agent/`) que corre en
  la red del cliente, escucha los trabajos de impresión en Firestore y los envía a las
  impresoras térmicas vía ESC/POS.

## Requisitos

- Node.js 22
- pnpm 10
- Firebase CLI 15.8.0 o superior
- Un proyecto Firebase en plan Blaze (necesario para Cloud Functions y App Hosting)

## Desarrollo local

Instala las dependencias:

```bash
pnpm install
```

Crea tu archivo de entorno a partir del ejemplo:

```bash
cp .env.example .env.local
```

### Opción A — Contra el proyecto Firebase real

El `.env.local` ya apunta al proyecto incluido. Solo arranca el servidor:

```bash
pnpm dev
```

La app queda en http://localhost:3000.

### Opción B — Con emuladores de Firebase

Para trabajar sin tocar datos en la nube, activa los emuladores en `.env.local`:

```bash
NEXT_PUBLIC_USE_EMULATORS=1
```

Levanta los emuladores (Auth en `:9099`, Firestore en `:8080`) y, en otra terminal, la app:

```bash
firebase emulators:start
pnpm dev
```

## Variables de entorno

Todas las variables son públicas (`NEXT_PUBLIC_*`) porque corresponden a la configuración
web de Firebase, que es segura de exponer en el cliente.

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | API key web del proyecto Firebase. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de autenticación (`<proyecto>.firebaseapp.com`). |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ID del proyecto Firebase. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket de almacenamiento. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID de mensajería. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ID de la aplicación web. |
| `NEXT_PUBLIC_USE_EMULATORS` | `1` para usar los emuladores locales; en blanco o `0` para el proyecto real. |

Estos valores se obtienen en Firebase Console › Configuración del proyecto › Aplicaciones web.

## Scripts

- `pnpm dev` — servidor de desarrollo.
- `pnpm build` — build de producción (incluye chequeo de tipos).
- `pnpm lint` — ESLint.
- `pnpm deploy:firebase` — despliega App Hosting, Firestore y Functions.

## Estructura del proyecto

```
src/
  app/
    (auth)/login/          Pantalla de inicio de sesión
    (dashboard)/           Área autenticada (layout con sidebar + topbar)
      dashboard/           Inicio / resumen
      pacientes/           Listado y formulario de pacientes
      recepcion/           Front-desk y creación de órdenes
      facturacion/         Caja (POS), listado de facturas y detalle de factura
      servicios/           Catálogo de servicios
      usuarios/            Gestión de usuarios y roles
      configuracion/       Perfil, sistema, plantillas, e-CF e impresoras
  components/
    ui/                    Componentes shadcn/Base UI
    layout/                Sidebar, topbar y shell del dashboard
    patients/ reception/   Formularios y diálogos por dominio
    cash/ companies/       (caja, empresas, etc.)
    auth/                  AuthGuard
  lib/
    data/                  Capa de acceso a Firestore (patients, billing, cash,
                           reception, services, ecf, printing, companies, settings)
    firebase/              Cliente Firebase y wrappers de Cloud Functions
    auth/                  Contexto de sesión y permisos
    modules.ts             Catálogo de módulos y roles (RBAC)
    types.ts               Modelo de datos del dominio
    utils.ts               Utilidades

functions/
  src/index.ts             Cloud Functions: bootstrap de clínica, usuarios
                           (createUser/updateUser), e-CF (saveEcfConfig,
                           uploadCertificate, activateEcf, submitEcf, pollEcfStatus)
                           e impresión (createPrintJob, reportPrintResult)

agent/
  src/                     Ledxia Connect: agente de impresión local
    index.ts listener.ts   Arranque y suscripción a trabajos de impresión
    processor.ts printing.ts
    escpos.ts receipt.ts   Generación ESC/POS y render del recibo
```

Configuración de Firebase en la raíz: `firebase.json`, `firestore.rules`,
`firestore.indexes.json` y `apphosting.yaml`.

## Despliegue

El despliegue es a Firebase: App Hosting (la app Next.js), reglas e índices de Firestore
y Cloud Functions. El procedimiento completo —preparar la consola, configurar el secret
de bootstrap, desplegar y crear la primera clínica/admin— está documentado en
[`DEPLOY.md`](./DEPLOY.md).

## Cómo ampliar el proyecto

### Agregar un módulo nuevo

1. Crea la ruta bajo `src/app/(dashboard)/<modulo>/` (un `page.tsx` de servidor y, si
   necesita interactividad, un `*-client.tsx` con `"use client"`).
2. Regístralo en `src/lib/modules.ts`: añade su clave a `SYSTEM_MODULES`, su metadata
   (label, path, icono) a `MODULES`, y otórgalo a los roles correspondientes en
   `BUILTIN_ROLES`. Si no debe aparecer en el menú lateral, márcalo como `hidden`.
3. Crea su capa de datos en `src/lib/data/<modulo>.ts`. Todas las lecturas/escrituras
   deben colgar de `tenants/{tenantId}/...` para respetar el aislamiento multi-tenant.
4. Ajusta `firestore.rules` (y los índices en `firestore.indexes.json` si añades
   consultas compuestas) para las nuevas colecciones.

### Convenciones de código

- TypeScript estricto: nada de `any` salvo casos justificados.
- UI con componentes de `src/components/ui` (shadcn/Base UI); reutiliza antes de crear.
- Toda la información de una clínica vive bajo `tenants/{tenantId}/`. La identidad del
  tenant proviene de los custom claims del usuario, no de la URL.
- El control de acceso se define en `src/lib/modules.ts` y lo refuerzan las reglas de
  Firestore y las Cloud Functions: nunca confíes solo en la UI.

### Agregar una Cloud Function

1. Añade el handler en `functions/src/index.ts` (`onCall` para llamadas desde la app,
   `onRequest` para HTTP, `onSchedule` para tareas programadas).
2. Para llamadas autenticadas (`onCall`), valida `request.auth` y los claims
   (`tenantId`, `role`) antes de operar.
3. Si la app la invoca, agrega el wrapper correspondiente en `src/lib/firebase/functions.ts`.
4. Compila y despliega con `pnpm deploy:firebase:functions`.
