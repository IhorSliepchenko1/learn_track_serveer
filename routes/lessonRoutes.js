const Router = require(`express`);
const router = new Router();
const lessonController = require(`../controllers/lessonController`);
const authMiddleware = require(`../middleware/authMiddleware`);
const checkRoleMiddleware = require(`../middleware/checkRoleMiddleware`);
// +
router.post(`/add`, checkRoleMiddleware(`ADMIN`), lessonController.add);
router.put(`/:id`, checkRoleMiddleware(`ADMIN`), lessonController.update);
router.delete(`/:id`, checkRoleMiddleware(`ADMIN`), lessonController.delete);
router.get(`/:id`, authMiddleware, lessonController.getAll);
router.get(`/:id`, authMiddleware, lessonController.getById);

module.exports = router;
