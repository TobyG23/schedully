const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        company: true,
        userLocations: {
          include: { location: true }
        },
        userPositions: {
          include: { position: true }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    req.user = user;
    req.companyId = user.companyId;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(500).json({ error: 'Error de autenticacion' });
  }
};

// Middleware para verificar roles
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permiso para esta accion' });
    }

    next();
  };
};

// Middleware para verificar acceso a una ubicacion
const requireLocationAccess = async (req, res, next) => {
  try {
    const locationId = req.params.locationId || req.body.locationId || req.query.locationId;

    if (!locationId) {
      return next(); // No se especifico ubicacion, continuar
    }

    // Super admin y usuarios con canViewAll pueden ver todo
    if (req.user.role === 'SUPER_ADMIN' || req.user.canViewAll) {
      return next();
    }

    // Verificar si el usuario tiene acceso a esta ubicacion
    const hasAccess = req.user.userLocations.some(ul => ul.locationId === locationId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'No tienes acceso a esta sucursal' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error verificando acceso' });
  }
};

module.exports = {
  authMiddleware,
  requireRole,
  requireLocationAccess
};
