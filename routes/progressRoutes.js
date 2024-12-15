const Router = require(`express`);
const router = new Router();
const progressController = require(`../controllers/progressController`);
const authMiddleware = require(`../middleware/authMiddleware`);
const checkRoleMiddleware = require(`../middleware/checkRoleMiddleware`);
// +
router.post(`/`, authMiddleware, progressController.add);
// router.get(`/`, userResponsprogressControllereController.getAll);
// router.get(`/:id`, userResponseController.getById);

module.exports = router;
