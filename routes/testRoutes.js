const Router = require(`express`);
const router = new Router();
const testController = require(`../controllers/testController`);
const authMiddleware = require(`../middleware/authMiddleware`);
const checkRoleMiddleware = require(`../middleware/checkRoleMiddleware`);
// +
router.post(`/add`, testController.add);
router.put(`/:id`, testController.update);
router.delete(`/:id`, testController.delete);
router.get(`/`, testController.getAll);
router.get(`/:id`, testController.getById);

module.exports = router;
