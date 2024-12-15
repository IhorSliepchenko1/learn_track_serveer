const Router = require(`express`);
const router = new Router();
const userRoutes = require(`./userRoutes.js`);
const courseRoutes = require(`./courseRoutes.js`);
const lessonRoutes = require(`./lessonRoutes.js`);
const testRoutes = require(`./testRoutes.js`);

router.use(`/user`, userRoutes);
router.use(`/course`, courseRoutes);
router.use(`/lesson`, lessonRoutes);
router.use(`/test`, testRoutes);

module.exports = router;
