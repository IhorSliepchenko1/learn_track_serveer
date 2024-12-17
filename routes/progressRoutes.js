const Router = require(`express`);
const router = new Router();
const progressController = require(`../controllers/progressController`);
const authMiddleware = require(`../middleware/authMiddleware`);

router.get(`/`, authMiddleware, progressController.checkProgress);
module.exports = router;
