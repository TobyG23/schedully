# PanSchedule - Sistema de Horarios para Panaderias

Sistema de gestion de horarios multi-sucursal con vista centralizada. Desarrollado para una panaderia con 9 locales donde la central puede supervisar los horarios de todas las sucursales.

## Caracteristicas Principales

- **Vista Centralizada**: La sucursal central puede ver y supervisar los horarios de todas las demas sucursales
- **Gestion de Turnos**: Crear, editar, copiar semanas, publicar horarios
- **Turnos Abiertos**: Empleados pueden tomar turnos disponibles
- **Control de Asistencia**: Clock-in/out con tracking de descansos
- **Solicitudes de Tiempo Libre**: Vacaciones, enfermedad, etc. con flujo de aprobacion
- **Multi-rol**: Super Admin, Admin, Manager, Supervisor, Empleado
- **Responsive**: Funciona en desktop y movil

## Tecnologias

### Backend
- Node.js + Express
- Prisma ORM
- MySQL
- JWT para autenticacion

### Frontend
- React 18 + Vite
- TailwindCSS
- React Router
- date-fns

## Instalacion Local

### Requisitos
- Node.js 18+
- MySQL 8.0+

### 1. Clonar y configurar

```bash
cd panaderia-schedule

# Configurar backend
cd backend
cp .env.example .env
# Editar .env con tus credenciales de MySQL

npm install
npm run db:generate
npm run db:push
npm run db:seed  # Carga datos de prueba

# En otra terminal, configurar frontend
cd frontend
npm install
```

### 2. Iniciar aplicacion

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 3. Acceder

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Credenciales de Prueba

```
Email: admin@elbuenpan.com
Password: admin123
```

## Despliegue con Docker

```bash
cp .env.example .env
# Editar .env

docker-compose up -d
```

## Despliegue en CloudPanel (DonWeb)

### 1. Crear aplicacion Node.js en CloudPanel

1. Crear sitio nuevo como "Node.js Application"
2. Configurar dominio

### 2. Subir codigo

```bash
# En el servidor
cd /home/usuario/htdocs/tudominio.com

git clone <tu-repositorio> .
# o subir archivos via SFTP
```

### 3. Configurar base de datos

1. Crear base de datos MySQL en CloudPanel
2. Crear archivo `.env` en `/backend`:

```env
DATABASE_URL="mysql://usuario:password@localhost:3306/panaderia_schedule"
JWT_SECRET="tu-secreto-super-seguro"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=production
FRONTEND_URL="https://tudominio.com"
```

### 4. Instalar dependencias y migrar

```bash
cd backend
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

### 5. Configurar PM2

```bash
pm2 start src/index.js --name "panaderia-api"
pm2 save
```

### 6. Build del frontend

```bash
cd frontend
npm install
npm run build
```

Configurar Nginx para servir `frontend/dist` y hacer proxy a la API.

## Estructura del Proyecto

```
panaderia-schedule/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Modelos de base de datos
│   │   └── seed.js          # Datos de prueba
│   ├── src/
│   │   ├── config/          # Configuracion
│   │   ├── middleware/      # Auth, permisos
│   │   ├── routes/          # API endpoints
│   │   └── index.js         # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── pages/           # Paginas
│   │   ├── context/         # AuthContext
│   │   ├── services/        # API client
│   │   └── App.jsx
│   └── package.json
└── docker-compose.yml
```

## API Endpoints

### Autenticacion
- `POST /api/auth/login` - Iniciar sesion
- `GET /api/auth/me` - Usuario actual
- `POST /api/auth/change-password` - Cambiar contrasena

### Dashboard
- `GET /api/dashboard/overview` - Resumen de todas las sucursales
- `GET /api/dashboard/alerts` - Alertas pendientes

### Usuarios
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario

### Sucursales
- `GET /api/locations` - Listar sucursales
- `POST /api/locations` - Crear sucursal

### Turnos
- `GET /api/shifts` - Listar turnos (filtros: locationId, startDate, endDate)
- `POST /api/shifts` - Crear turno
- `POST /api/shifts/copy-week` - Copiar semana anterior
- `POST /api/shifts/publish` - Publicar turnos

### Asistencia
- `POST /api/timesheets/clock-in` - Registrar entrada
- `POST /api/timesheets/clock-out` - Registrar salida
- `GET /api/timesheets/status` - Estado actual

### Solicitudes
- `GET /api/time-off` - Listar solicitudes
- `POST /api/time-off` - Crear solicitud
- `POST /api/time-off/:id/approve` - Aprobar
- `POST /api/time-off/:id/reject` - Rechazar

## Roles y Permisos

| Permiso | Super Admin | Admin | Manager | Supervisor | Employee |
|---------|-------------|-------|---------|------------|----------|
| Ver todas las sucursales | Si | Configurable | No | No | No |
| Gestionar sucursales | Si | Si | No | No | No |
| Gestionar empleados | Si | Si | Solo su sucursal | No | No |
| Crear turnos | Si | Si | Si | Si | No |
| Aprobar solicitudes | Si | Si | Si | Si | No |
| Clock in/out | Si | Si | Si | Si | Si |

## Soporte

Para reportar bugs o solicitar funciones, crear un issue en el repositorio.

## Licencia

MIT
