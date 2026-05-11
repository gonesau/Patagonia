# Patagonia: Sistema de Administración Operativa y Logística

Panel administrativo integral diseñado para la gestión operativa y financiera de un operador de turismo de aventura. El sistema provee herramientas avanzadas para la administración del ciclo de vida de los tours, inscripciones, logística de guías y transporte, y auditoría financiera en tiempo real.

## Características Principales

*   **Gestión de Tours y Ciclo de Vida**: Administración de eventos turísticos a través de múltiples estados de operación y ejecución.
*   **Control de Inscripciones y Estados de Pago**: Monitoreo de clientes y participantes con seguimiento preciso del estatus financiero (Completo, Parcial, Pendiente).
*   **Logística Operativa**: Asignación y coordinación de guías encargados y distribución de detalles de transporte.
*   **Control de Gastos y Compras**: Registro centralizado de egresos financieros por evento para cálculo de rentabilidad.
*   **Generación Automatizada de Reportes PDF**: Exportación estructurada de listas de asistencia, estados de cuenta y resúmenes financieros formateados para operadores en campo.
*   **Tareas Programadas y Notificaciones**: Automatización mediante Schedulers para recordatorios de pagos, creación estructurada de directorios en Google Drive, y flujos de comunicación por correo electrónico apoyados en triggers de base de datos.

## Pila Tecnológica (Tech Stack)

### Frontend
*   React
*   TypeScript
*   Vite
*   Tailwind CSS

### Backend y Arquitectura Serverless
*   Firebase Firestore (Base de Datos NoSQL)
*   Firebase Authentication (Gestión de Identidad y Autenticación)
*   Firebase Storage (Almacenamiento de Archivos y Binarios)
*   Firebase Cloud Functions (Lógica de Negocio y Schedulers, implementado en TypeScript)

### Utilidades de Soporte
*   jsPDF / jspdf-autotable (Generación y maquetación de reportes PDF en el lado del cliente)

## Instalación y Configuración Local

### Requisitos Previos
*   Node.js (LTS recomendado)
*   Firebase CLI instalado globalmente y autenticado (`npm install -g firebase-tools`)

### Configuración de Variables de Entorno
Es indispensable definir las credenciales del entorno. En la raíz de la aplicación cliente (`tour-admin/`), utilice el archivo de referencia para generar su configuración local:

```bash
cp .env.example .env.local
```

### Instalación de Dependencias

Para el entorno del cliente web (Frontend):
```bash
cd tour-admin
npm install
```

Para las funciones serverless (Backend):
```bash
cd tour-admin/functions
npm install
```

### Comandos de Desarrollo

Levantar el servidor local de desarrollo (Frontend):
```bash
npm run dev
```

Generar el paquete estático optimizado para producción:
```bash
npm run build
```

## Base de Datos y Seguridad

El acceso y manipulación de datos está gobernado por políticas estrictas de seguridad desplegadas en la infraestructura.
*   **Base de datos**: Las reglas de acceso están declaradas en `firestore.rules`.
*   **Almacenamiento**: Las reglas de almacenamiento están declaradas en `storage.rules`.

Se recomienda encarecidamente utilizar el Emulador Local de Firebase (`firebase emulators:start`) durante el desarrollo para aislar las pruebas e interacciones de la base de datos de producción y probar los perfiles de seguridad.

## Migraciones de Datos

El repositorio dispone de scripts específicos para la manipulación masiva de datos en Firestore, previniendo así la edición manual no controlada.

Los scripts (escritos en formatos JS/MJS) se localizan en `tour-admin/scripts/migrations/` y su propósito principal es:
*   Poblar bases de datos con catálogos por defecto necesarios para la operativa.
*   Ejecutar transformaciones de esquema para colecciones y documentos legados.

Ejemplo de ejecución (requiere credenciales de cuenta de servicio configuradas):
```bash
node scripts/migrations/migration_script_name.mjs
```

## Despliegue

El aprovisionamiento de la aplicación a los servidores de producción se realiza a través de las herramientas de Firebase.

Despliegue del panel administrativo (Firebase Hosting):
```bash
npm run build
firebase deploy --only hosting
```

Despliegue de los servicios backend (Cloud Functions):
```bash
cd tour-admin/functions
npm run build
firebase deploy --only functions
```
