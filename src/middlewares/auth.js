function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login');
  next();
}
function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    if (req.session.user.role !== role) return res.status(403).render('errors/403');
    next();
  };
}
module.exports = { requireAuth, requireRole };
