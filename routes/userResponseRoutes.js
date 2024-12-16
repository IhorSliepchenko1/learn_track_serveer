const Router = require(`express`);
const router = new Router();
const userResponseController = require(`../controllers/userResponseController`);
const authMiddleware = require(`../middleware/authMiddleware`);

router.post(`/`, authMiddleware, userResponseController.userResponse);
router.get(`/`, authMiddleware, userResponseController.getAll);
router.get(`/:id`, authMiddleware, userResponseController.getById);
router.delete(`/again`, authMiddleware, userResponseController.delete);

module.exports = router;