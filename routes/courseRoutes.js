const Router = require(`express`);
const router = new Router();
const courseController = require(`../controllers/courseController`);
const authMiddleware = require(`../middleware/authMiddleware`);
const checkRoleMiddleware = require(`../middleware/checkRoleMiddleware`);
// +
router.post(`/add`, checkRoleMiddleware(`ADMIN`), courseController.add);
router.put(`/:id`, checkRoleMiddleware(`ADMIN`), courseController.update);
router.delete(`/:id`, checkRoleMiddleware(`ADMIN`), courseController.delete);
router.get(`/`, authMiddleware, courseController.getAll);
router.get(`/:id`, authMiddleware, courseController.getById);

module.exports = router;
