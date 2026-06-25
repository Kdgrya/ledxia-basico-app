# Guía de entrega — Ledxia en Firebase

Proyecto Firebase preparado: `ledxia-c1316`.

URL de producción App Hosting: `https://ledxia-basico--ledxia-c1316.us-central1.hosted.app`

## Requisitos

- Node.js 22
- pnpm 10
- Firebase CLI 15.8.0 o superior
- Proyecto Firebase en plan Blaze para Cloud Functions y App Hosting

## Configuración incluida

- `.firebaserc` apunta a `ledxia-c1316`.
- `.env.example` y `.env.local.example` contienen la config web del proyecto.
- `.env.local` local también apunta a `ledxia-c1316`.
- `apphosting.yaml` configura Firebase App Hosting para la app Next.js.
- `firebase.json` despliega App Hosting, Firestore rules/indexes y Cloud Functions.
- `BOOTSTRAP_SECRET` está declarado como secret real de Firebase Functions v2.

## Preparar Firebase Console

1. En Firebase Console, abrir el proyecto `ledxia-c1316`.
2. Habilitar Authentication con proveedor Email/Password.
3. Crear Firestore Database en modo producción.
4. Habilitar App Hosting.
5. Confirmar que el proyecto está en plan Blaze.

## Instalar y validar

```bash
pnpm install
npm --prefix functions install
pnpm build
npm --prefix functions run build
```

## Configurar el secret de bootstrap

Ejecuta una vez:

```bash
firebase login
firebase use ledxia-c1316
firebase functions:secrets:set BOOTSTRAP_SECRET --project ledxia-c1316
```

Usa una cadena larga y guárdala. Se usa solo para crear la primera clínica/admin.

## Desplegar todo

```bash
pnpm deploy:firebase
```

Equivale a desplegar:

- Firebase App Hosting backend `ledxia-basico`
- Firestore rules e indexes
- Cloud Functions

Si App Hosting todavía no tiene el backend creado, inicialízalo una vez:

```bash
firebase init apphosting --project ledxia-c1316
```

Selecciona o crea el backend `ledxia-basico`, región `us-central1`, root directory `.`, runtime `nodejs22`.

## Crear la primera clínica/admin

Después de desplegar Functions, llama `bootstrapClinic`:

```bash
curl -X POST https://us-central1-ledxia-c1316.cloudfunctions.net/bootstrapClinic \
  -H "Content-Type: application/json" \
  -H "x-setup-secret: TU_BOOTSTRAP_SECRET" \
  -d '{
    "clinicName": "Mi Clínica",
    "adminEmail": "admin@miclinica.com",
    "adminPassword": "cambia-esta-contrasena",
    "adminName": "Administrador"
  }'
```

La respuesta devuelve `tenantId` y `uid`.

## Agente de impresión

El agente corre en la máquina local del cliente.

```bash
cd agent
npm install
cp .env.example .env
npm run build
npm start
```

Configura `GOOGLE_APPLICATION_CREDENTIALS` con una cuenta de servicio del proyecto y `TENANT_ID` con el `tenantId` creado por `bootstrapClinic`.
