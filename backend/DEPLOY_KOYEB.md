# Deploy Backend To Koyeb

This backend is configured to deploy to Koyeb from the `backend` directory using the included `Dockerfile`.

## Service settings

- Service type: `Web Service`
- Root directory: `backend`
- Exposed port: `8000`

## Required environment variables

- `DJANGO_SECRET_KEY`: a long random secret
- `DJANGO_DEBUG`: `False`
- `DJANGO_ALLOWED_HOSTS`: your Koyeb app hostname, for example `api-your-app.koyeb.app`
- `CORS_ALLOWED_ORIGINS`: comma-separated frontend origins
- `CSRF_TRUSTED_ORIGINS`: comma-separated trusted frontend origins including `https://`

## Optional environment variables

- `DATABASE_URL`: use this if you attach Postgres. If omitted, SQLite is used.
- `WEB_CONCURRENCY`: Gunicorn worker count
- `GUNICORN_TIMEOUT`: Gunicorn timeout in seconds
- `DJANGO_SECURE_SSL_REDIRECT`: set to `True` if you want Django to force HTTPS redirects
- `DJANGO_SECURE_HSTS_SECONDS`
- `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS`
- `DJANGO_SECURE_HSTS_PRELOAD`

## Notes

- The container startup command runs migrations and `collectstatic` before starting Gunicorn.
- SQLite works for simple testing, but for a real Koyeb deployment you should attach Postgres and set `DATABASE_URL`.
