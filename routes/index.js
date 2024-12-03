const Router = require(`express`);
const router = new Router();
const userRoutes = require(`./userRoutes.js`);

router.use(`/user`, userRoutes);

module.exports = router;
