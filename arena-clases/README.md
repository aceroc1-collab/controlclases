# Control de clases — Beach tennis y funcional

PWA para llevar planes, asistencias, vencimientos y cobranza. Funciona sin conexión y se instala en el teléfono como una app.

## Cómo funciona el motor de planes

Hay tres tipos de plan y todos se resuelven con las mismas dos reglas: **vence por fecha o por consumo, lo que ocurra primero**.

| Tipo | Horario | Clases | Vence por |
|---|---|---|---|
| Beach tennis 2x / 3x / 4x | Días y hora asignados | 8 / 12 / 16 | La fecha de la última sesión, o agotar las clases |
| Funcional por sesiones | Libre | 8 / 12 / 16 | 28 días, o agotar las sesiones |
| Funcional mensual ilimitado | Libre | Sin límite | Solo la fecha (28 días) |

Reglas que aplica el código:

- **Beach tennis: faltar consume la clase.** La sesión se descuenta cuando llega su día, venga o no el alumno. Marcar asistencia sirve para saber quién vino y quién tiene derecho a recuperar.
- **Funcional: solo descuenta al marcar asistencia.** Si no viene, no se le descuenta nada.
- **Ilimitado: no cuenta sesiones.** Solo corre la fecha. Las asistencias se registran igual, para saber quién dejó de venir y cuánto se está usando.
- **Suspender un bloque no descuenta a nadie.** En beach tennis la fecha de cierre se corre una sesión más de su patrón (si ve martes y jueves, se le agrega el siguiente martes o jueves). En los ilimitados suma un día si suspendes el día completo.
- **Adelantar clases acorta el plan por consumo, nunca alarga la fecha.** No hay tope: tú decides caso por caso.
- **Recuperación no descuenta.** Repone una clase ya cobrada que no se usó.
- **Ajustes manuales** de clases y días, siempre con motivo, quedan en el historial.

## Sincronización y vista del alumno

La app funciona en dos modos, y cambia sola según haya o no variables de entorno:

- **Sin Supabase:** todo local, un solo dispositivo. Es como arrancó.
- **Con Supabase:** el teléfono y la computadora se sincronizan solos.

Los informes de los alumnos funcionan en los dos modos: se generan con los datos del dispositivo, sin depender de la nube.

Cómo sincroniza, en corto:

1. Cada cambio se guarda **primero en el dispositivo** y sigue funcionando sin señal.
2. Unos segundos después sube lo pendiente y baja lo que hizo el otro dispositivo.
3. El historial (asistencias, cargos, pagos, suspensiones) se fusiona solo, porque solo se añaden líneas.
4. En lo editable (alumnos, planes, precios) gana la edición más reciente. Como el único que escribe eres tú, no hay conflictos que resolver a mano.
5. Lo borrado viaja como lápida, para que el dispositivo que estaba desconectado no lo resucite.

## Informe del alumno

Desde la ficha de cada alumno, el botón **Generar informe** arma un estado de cuenta con su plan, las clases que le quedan, cuándo vence, sus últimas asistencias y el detalle de cargos y pagos. Se puede enviar de tres formas:

- **Enviar por WhatsApp** — va como mensaje de texto con la misma información. Es la vía que llega siempre, porque un enlace `wa.me` solo admite texto: no puede llevar archivos adjuntos.
- **Compartir imagen** — abre el menú de compartir del teléfono con la imagen ya lista, y desde ahí eliges WhatsApp. Aparece solo si el dispositivo lo soporta.
- **Guardar imagen** — la descarga al teléfono para adjuntarla a mano o archivarla.

La imagen se dibuja en el propio dispositivo, sin librerías y sin conexión. El informe es una foto del momento: si el alumno toma más clases, le generas uno nuevo.

## Requisitos

- Node.js 18 o superior — https://nodejs.org
- Cuenta de GitHub — https://github.com
- Cuenta de Vercel — https://vercel.com (entra con GitHub)

## 1. Probarla en tu computadora

```bash
npm install
npm run dev
```

Abre la dirección que aparece en la terminal (normalmente `http://localhost:5173`).

Para verificar que el motor de planes calcula bien:

```bash
npm test
```

## 2. Subirla a GitHub

Crea un repositorio vacío en GitHub (sin README, sin .gitignore). Luego, desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Control de clases"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

## 3. Conectar Supabase (opcional pero recomendado)

Sin este paso la app funciona igual, solo que sin sincronizar y sin vista del alumno.

1. Crea un proyecto en https://supabase.com (el plan gratuito sobra).
2. Ve a **SQL Editor → New query**, pega el contenido de `supabase/esquema.sql` completo y pulsa **Run**. Crea la tabla y las políticas de seguridad.
3. En **Authentication → Providers**, deja **Email** activado. No hace falta contraseña: se entra con enlace mágico.
4. En **Authentication → URL Configuration**, agrega la URL de tu app en *Site URL* y en *Redirect URLs*.
5. Copia de **Settings → API Keys** la clave pública: en proyectos nuevos es la *Publishable key* (`sb_publishable_...`), en los viejos la *anon*. Sirven las dos. La *Project URL* está en **Settings → API** o en el botón **Connect**.

Esa clave es pública a propósito: no da acceso a nada por sí sola, porque las políticas de seguridad exigen sesión iniciada. Sin sesión no se puede leer ni una fila. La que **nunca** se pone aquí es la *secret* o *service_role*: esa se salta toda la seguridad.

## 4. Publicarla en Vercel

1. Entra a https://vercel.com y elige **Add New → Project**.
2. Importa el repositorio que acabas de subir.
3. Vercel detecta Vite automáticamente. Deja los valores como están:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. En **Environment Variables**, agrega las dos de Supabase (omítelas si vas sin nube):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY`
5. Pulsa **Deploy**. En un minuto tienes la URL, con HTTPS incluido.

Si agregas las variables después, hay que volver a desplegar: Vite las incrusta al compilar.

## 5. Instalarla en el teléfono

- **Android (Chrome):** abre la URL → menú de tres puntos → *Instalar aplicación*.
- **iPhone (Safari):** abre la URL → botón compartir → *Añadir a pantalla de inicio*.

Instalada, abre a pantalla completa y funciona sin señal. Es importante instalarla y no dejarla como una pestaña: en iPhone, los datos de una pestaña normal pueden borrarse tras varios días sin usarla.

## 6. Configuración inicial

En **Ajustes**:

1. Entra con tu correo (recibes un enlace, sin contraseña). Hazlo en los dos dispositivos con el mismo correo.
2. Pon el nombre de la marca (aparece en los mensajes de WhatsApp).
3. Elige la moneda, el código de país (58 para Venezuela, 34 para España) y tu WhatsApp de contacto.
4. Revisa los planes precargados y ajusta precios, o crea los tuyos.
5. Revisa las plantillas de WhatsApp.

Luego ve a **Alumnos → Nuevo alumno**, y desde su ficha, **Asignar plan**.

## 7. Rutina diaria

- **Hoy:** aparecen los bloques del día. Un toque por alumno para pasar lista. Si llueve, un toque en *Suspender* y listo: nadie pierde clase y las fechas se corren solas.
- **Cobranza:** ábrelo los lunes. Vencidos arriba, por vencer abajo, y el botón de WhatsApp al lado de cada uno.
- **Informe:** al renovar o cuando alguien pregunte por su cuenta, entra a su ficha y genera el informe.
- **Ingresos:** cuánto deberías facturar este mes, cuánto llevas cobrado y cuánto está en riesgo.

## 8. Respaldo

Con Supabase conectado tus datos ya están a salvo y sincronizados: un dispositivo nuevo reconstruye todo al iniciar sesión.

Sin Supabase, los datos viven solo en ese dispositivo. Entra a **Ajustes → Descargar respaldo** una vez por semana y guarda el archivo donde no se pierda.

## Estructura del código

```
src/
  lib/
    fecha.js      Fechas sin problemas de zona horaria
    motor.js      Cálculo de planes, vencimientos, saldos y proyecciones
    db.js         Almacenamiento local, datos iniciales, respaldo
    acciones.js   Todas las operaciones que modifican datos
    mensajes.js   Plantillas, teléfonos y enlaces de WhatsApp
    informe.js    Estado de cuenta en texto y en imagen
    supabase.js   Cliente y sesión (la app funciona igual si no está configurado)
    sync.js       Subida, bajada y fusión entre dispositivos
  components/
    UI.jsx        Modal, avatar, doble contador, veredicto
    EnviarWA.jsx  Ventana de envío de WhatsApp
    Sesion.jsx    Inicio de sesión y estado de sincronización
    Informe.jsx   Vista previa del informe y opciones de envío
  views/
    Hoy.jsx           Agenda del día y pase de lista
    Alumnos.jsx       Listado y alta de alumnos
    AlumnoDetalle.jsx Ficha, planes, cuenta corriente, ajustes
    Cobranza.jsx      Vencidos, por vencer y deuda
    Ingresos.jsx      Proyección del mes y uso del ilimitado
    Ajustes.jsx       Marca, precios, plantillas, nube, respaldo
supabase/
  esquema.sql     Tabla y políticas de seguridad
pruebas/
  motor.mjs          Reglas de vencimiento con casos reales
  informe.mjs        Contenido, texto y dibujo del informe
  sincronizacion.mjs Dos dispositivos contra un servidor simulado
  pantallas.mjs      Render de todas las vistas
```

Toda la lógica de vencimientos está en `estadoPlan()` dentro de `src/lib/motor.js`. Si algún día cambias una regla del negocio, se cambia ahí y el resto de la app la hereda.




