# Configuración de la base de datos

El backend usa PostgreSQL y la variable de entorno `DATABASE_URL`. Render debe conectarse a una base PostgreSQL administrada por un proveedor externo; el disco local del servicio gratuito no es persistente.

## Render

1. Crea una base de datos PostgreSQL en el proveedor elegido y copia su URL de conexión con SSL habilitado.
2. En Render, abre el servicio `ludex` y ve a **Environment**.
3. Añade `DATABASE_URL` con la URL de conexión completa y guarda los cambios.
4. Vuelve a desplegar el servicio. Al iniciar, el backend crea las tablas y `npm run seed` agrega los datos iniciales que todavía no existan.

No publiques ni compartas la URL: contiene las credenciales de la base. Si falta `DATABASE_URL` o la conexión falla, el backend registra el error y no inicia.

## Desarrollo local

Define `DATABASE_URL` en `Backend/.env` con una base PostgreSQL accesible desde tu equipo y luego ejecuta:

```sh
cd Backend
npm run seed
npm start
```

La configuración de `.env` no debe subirse al repositorio.
