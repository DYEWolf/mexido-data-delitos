# Stage 2 Cloudflare readiness probe

Fecha de verificación: 2026-09-22

## Alcance y límites

Este reporte resume una revisión local y no destructiva de preparación Cloudflare/Wrangler para la Etapa 2. No se crearon cuentas, buckets, Workers, aplicaciones Access, widgets Turnstile, tokens, secretos, registros DNS ni despliegues. No se imprimieron valores secretos; las variables de entorno se verificaron solo como presentes o ausentes.

## Comandos ejecutados

- `command -v wrangler`
- `command -v npx`
- `node_modules/.bin/wrangler --version` solo si existía el binario local.
- `wrangler --version` solo si existía el binario global.
- Verificación de presencia para `CF_ACCOUNT_ID`, `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_API_TOKEN` sin imprimir valores.

## Resultado de herramientas

| Ítem | Estado | Evidencia sanitizada |
| --- | --- | --- |
| Wrangler local | Bloqueado | `node_modules/.bin/wrangler` no existe. |
| Wrangler global | Bloqueado | `command -v wrangler` no encontró binario global. |
| `npx` | Listo | Disponible en el entorno Node actual. |
| `wrangler whoami` | No determinable | No se ejecutó porque Wrangler no está instalado local ni globalmente. |
| `CF_ACCOUNT_ID` | Requiere acción | Variable ausente. |
| `CLOUDFLARE_ACCOUNT_ID` | Requiere acción | Variable ausente. |
| `CLOUDFLARE_API_TOKEN` | Requiere acción | Variable ausente. |
| `.env.example` | Listo | Creado con nombres de variables y placeholders vacíos, sin secretos. |

## AC-0 readiness

| AC-0 / Cloudflare | Estado | Comentario |
| --- | --- | --- |
| Desarrollador autorizado puede desplegar dev/staging sin pedir nuevas credenciales | Bloqueado | No hay Wrangler instalado ni auth verificable; faltan variables de cuenta/token. |
| Account ID verificado | Bloqueado | `CF_ACCOUNT_ID` y `CLOUDFLARE_ACCOUNT_ID` están ausentes. |
| Entornos Workers `dev` y `staging` preparados | Requiere acción | Falta definir/crear config de Worker y autenticación; no se debe crear sin aprobación explícita. |
| R2 habilitado | No determinable | Requiere acceso de cuenta Cloudflare; no se verificó por falta de Wrangler/auth. |
| Bucket privado `seguridad-jalisco-private` | Requiere acción | Debe crearse manualmente o bajo aprobación futura. |
| Bucket público/reservado `seguridad-jalisco-public` | Requiere acción | Debe crearse manualmente o bajo aprobación futura. |
| Token CI/CD de privilegio mínimo | Requiere acción | Debe crearlo un operador autorizado; no debe almacenarse en Git. |
| Secrets configurados fuera de Git | Requiere acción | No se ejecutó ningún comando secret-bearing. |
| Cloudflare Access para staging/admin | Requiere acción | Debe configurarse con aprobación y política de identidad. |
| Turnstile site key/secret para formulario futuro | Requiere acción | Debe crearse con aprobación; no se generaron widgets. |
| Observabilidad habilitada | Requiere acción | Depende de la configuración final de Worker/Cloudflare. |
| No existen secretos en Git | Parcialmente listo | Los archivos creados no contienen secretos; no se hizo auditoría histórica completa. |

## Acciones explícitas requeridas del usuario

1. Autorizar cómo se instalará Wrangler si se decide hacerlo en este repo; la recomendación operativa es instalación local de desarrollo (`npm install -D wrangler@latest`) en un cambio separado, porque modifica `package.json`/lockfile.
2. Proveer o configurar fuera de Git el Account ID y el método de autenticación Cloudflare autorizado.
3. Confirmar nombres definitivos de cuenta, zona/dominio, Worker y entornos antes de crear recursos.
4. Ejecutar manualmente o autorizar los comandos de bootstrap futuros; no se agregó checklist separado para evitar ampliar la superficie de cambios.

## Comandos futuros documentados, no ejecutados

Estos comandos requieren decisión o aprobación explícita antes de ejecutarse:

```sh
# Instalación local futura; modifica package.json/package-lock.json.
npm install -D wrangler@latest

# Verificaciones posteriores no destructivas.
npx wrangler --version
npx wrangler whoami

# Login interactivo si el operador lo aprueba.
npx wrangler login
# Alternativa para entornos remotos.
npx wrangler login --device

# Creación futura de R2; crea recursos en Cloudflare.
npx wrangler r2 bucket create seguridad-jalisco-private
npx wrangler r2 bucket create seguridad-jalisco-public

# Secrets futuros; no ejecutar hasta tener Worker/config final y valores fuera de Git.
npx wrangler secret put DATABASE_URL
npx wrangler secret put TURNSTILE_SECRET_KEY
```

## Notas de seguridad

- `.env.example` contiene solo nombres de variables y valores vacíos.
- No se leyeron ni imprimieron tokens, secretos ni Account IDs.
- La ausencia de variables en este shell no implica que no existan en otro entorno de desarrollo o CI.

## 2026-09-22 Worker config scaffold update

### Scope and limits

A repo-safe Worker scaffold was added for Stage 2 using the already-installed local Wrangler devDependency. No Cloudflare account mutation was performed: no deploy, secret write, DNS change, Access configuration, bucket creation, custom domain binding, or object upload was attempted.

### Files added or updated

- `wrangler.jsonc` defines `mexico-data-seguridad-api` with `src/worker/index.mjs`, a recent compatibility date, observability, default and staging R2 bindings, and non-secret vars only. `nodejs_compat` is intentionally omitted because the current Worker uses standard Web APIs only.
- `src/worker/index.mjs` exposes only `/health`, denies `/admin/health` with `403` until Cloudflare Access exists, and returns `404` elsewhere.
- `tests/worker-config.test.cjs` validates the config, confirms `TURNSTILE_SECRET_KEY` is absent, and exercises Worker fetch behavior with a mocked environment.

### Sanitized validation commands run

```sh
node --test tests/worker-config.test.cjs
node --test tests/*.test.cjs
npx wrangler deploy --dry-run --env staging
```

Results:

- Targeted Worker config tests: passed 5/5.
- Full repository Node tests: passed 51/51.
- Wrangler staging dry run: passed; it reported only the expected R2 bindings and non-secret variables, then exited with `--dry-run: exiting now`.

### Cloudflare facts now reflected in config

| Item | Repo-safe value |
| --- | --- |
| Worker name | `mexico-data-seguridad-api`; staging name `mexico-data-seguridad-api-staging` |
| Main module | `src/worker/index.mjs` |
| Zone name | `mexicovisible.com` |
| Zone ID | `85c67e08d554811b9fdd86533473f66c` |
| Planned public host | `staging.mexicovisible.com` |
| Planned admin host | `admin-staging.mexicovisible.com` |
| Private R2 bucket binding | `PRIVATE_ASSETS` -> `seguridad-jalisco-private` |
| Public derivatives R2 bucket binding | `PUBLIC_DERIVATIVES` -> `seguridad-jalisco-public` |
| Turnstile site key | Stored as non-secret `TURNSTILE_SITE_KEY` |
| Turnstile secret key | Not present in Git; must be set with Wrangler secret storage |

### Manual Cloudflare dependencies still pending

These steps require an authorized operator and must not be run by the scaffold worker automatically:

```sh
# Store the Turnstile secret after the Worker exists; enter the value interactively.
npx wrangler secret put TURNSTILE_SECRET_KEY --env staging

# Deploy the staging Worker after reviewing routes and bindings.
npx wrangler deploy --env staging
```

DNS and Access remain manual/dashboard-or-token work because the current OAuth context lacks `dns_records:edit`, and Access policy setup has not been approved here:

1. Create or verify DNS records for `staging.mexicovisible.com` and `admin-staging.mexicovisible.com` according to the chosen Worker routing/domain model.
2. Configure Cloudflare Access for the admin hostname before enabling any admin functionality.
3. Verify observability in the Cloudflare dashboard after first deployment.
4. Keep `TURNSTILE_SECRET_KEY` only in Cloudflare secrets or another approved secret store; never add it to `.env.example`, `wrangler.jsonc`, tests, or reports.


## 2026-09-22 validación de staging desplegado

### Alcance y límites

Se ejecutaron verificaciones HTTP seguras con `curl`, sin seguir redirecciones para el hostname administrativo y sin imprimir secretos. No se ejecutó `wrangler deploy`, no se modificaron recursos Cloudflare y no se consultaron ni registraron valores de tokens.

### Hechos operativos reportados por el usuario

- `TURNSTILE_SECRET_KEY` ya está almacenado como secreto para `staging`.
- `npx wrangler deploy --env staging` terminó correctamente.
- DNS está correcto para `staging.mexicovisible.com` y `admin-staging.mexicovisible.com`.
- Cloudflare Access está activo para el hostname administrativo: aplicación self-hosted `71cbb3d9-ce33-4eea-b6e5-0e98761db5f1`, sesión de 24 horas, política `admins` / `allow` / incluir email, team domain `mexicovisible.cloudflareaccess.com`.
- Observabilidad está activa.
- El token operativo `CF_DNS_API_TOKEN` ahora cubre DNS y Zero Trust pese a su nombre; sus valores no se registran en Git ni en este reporte.

### Verificación HTTP realizada

| URL | Resultado observado | Interpretación |
| --- | --- | --- |
| `https://staging.mexicovisible.com/health` | `200` con `{"ok":true,"environment":"staging"}` | El Worker público de staging responde correctamente. |
| `https://staging.mexicovisible.com/admin/health` | `403` | La ruta administrativa en el hostname público queda bloqueada por código. |
| `https://staging.mexicovisible.com/noexiste` | `404` | Las rutas inexistentes responden como no encontradas. |
| `https://admin-staging.mexicovisible.com/health` | `302` sin seguir redirecciones, hacia Cloudflare Access | El hostname administrativo está protegido por Access antes de llegar al Worker. |

Verificaciones adicionales reportadas por el usuario: `admin-staging.mexicovisible.com/admin/health`, `/` y `/cualquier/cosa` también devuelven `302` hacia Cloudflare Access sin seguir redirecciones.

### Estado actualizado de AC-0 Cloudflare

| AC-0 / Cloudflare | Estado | Comentario |
| --- | --- | --- |
| Staging desplegado | Listo | `npx wrangler deploy --env staging` fue reportado como exitoso y `/health` responde `200` en staging. |
| Secret `TURNSTILE_SECRET_KEY` fuera de Git | Listo | Reportado como almacenado para staging; no se registró el valor. |
| DNS de hostnames staging/admin | Listo | Reportado como correcto y coherente con las pruebas HTTP. |
| Cloudflare Access para admin | Listo para staging | El hostname administrativo redirige a Access con `302`; configuración reportada: app `71cbb3d9-ce33-4eea-b6e5-0e98761db5f1`, self-hosted, sesión 24h, política admins/allow/include email. |
| Observabilidad | Listo | Reportada como activa. |
| Ruta pública `/admin/*` | Precaución | El hostname público todavía alcanza código del Worker para `/admin/*` y hoy responde `403`; los endpoints administrativos futuros deben estar disponibles solo por hostname admin y/o validar `Cf-Access-Jwt-Assertion`. |
| Baseline/assets completos | Pendiente | El despliegue no completa el baseline de datos ni la adquisición/escritura de assets. |
