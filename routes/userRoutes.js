const Router = require(`express`);
const router = new Router();
const userController = require(`../controllers/userController`);
const authMiddleware = require(`../middleware/authMiddleware`);
const checkRoleMiddleware = require(`../middleware/checkRoleMiddleware`);
const registrationLimiter = require(`../middleware/registrationMiddleware`)
// +
router.post(`/send-verification-code`, userController.sendVerificationCode);
router.post(`/registration`, registrationLimiter, userController.registration);
router.post(`/login`, registrationLimiter, userController.login);
router.get(`/check`, authMiddleware, userController.check);
router.get(`/`, authMiddleware, userController.getAll);
router.get(`/:id`, authMiddleware, userController.getById);
router.put(`/:id`, userController.updateUser);
router.delete(`/:id`, checkRoleMiddleware(`ADMIN`), userController.delete);

module.exports = router;
