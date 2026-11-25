
module.exports = function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // 1. Check whether the user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    // 2. Check whether the user has an allowed role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource'
        }
      });
    }

    // 3. User is authenticated and has permission
    next();
  };
};
