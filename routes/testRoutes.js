const Router = require(`express`);
const router = new Router();
const testController = require(`../controllers/testController`);
const authMiddleware = require(`../middleware/authMiddleware`);
const checkRoleMiddleware = require(`../middleware/checkRoleMiddleware`);

router.post(`/add`, checkRoleMiddleware(`ADMIN`), testController.add);
router.put(`/:id`, checkRoleMiddleware(`ADMIN`), testController.update);
router.delete(`/:id`, checkRoleMiddleware(`ADMIN`), testController.delete);
router.get(`/`, authMiddleware, testController.getAll);
router.get(`/:id`, authMiddleware, testController.getById);

module.exports = router;
