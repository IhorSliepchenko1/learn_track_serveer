const Router = require(`express`);
const router = new Router();
const userResponseController = require(`../controllers/userResponseController`);
const authMiddleware = require(`../middleware/authMiddleware`);
const checkRoleMiddleware = require(`../middleware/checkRoleMiddleware`);
// +
router.post(`/`, authMiddleware, userResponseController.userResponse);
router.get(`/`, userResponseController.getAll);
router.get(`/:id`, userResponseController.getById);

module.exports = router;
