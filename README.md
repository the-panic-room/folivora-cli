# Folivora CLI

Interfaz de comandos para gestionar un mirror Proxy HTTP para repositorios linux.

## Uso

### Comprobar errores en paquetes descargados.

    ./bin/mirror-cli check <repo_name> <repo_path>

Donde *repo_name* es el nombre del repositorio y *repo_path* es el directorio de evaluación.

### Descargar paquetes.

    ./bin/mirror-cli download <repo_name> <repo_path> [--mirror <url> --arch <arch>]

Use *--mirror* para definir la url del repositorio a descargar y *--arch* para definir la arquitectura.

### Montar el servidor.

    ./bin/mirror-cli runserver [host] [--cache-path <path>]

Use *--cache-path* para definir la ruta de almacenamiento de paquetes.

**Nota**: Esta en una fase inestable y solo probado en repositorios **archlinux**.