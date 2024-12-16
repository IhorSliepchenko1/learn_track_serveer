const ApiError = require(`../error/ApiError`);
const { prisma } = require(`../prisma/prisma-clients`);

class UserResponseController {
  async userResponse(req, res, next) {
    try {
      const { id } = req.user;
      const { lesson_id, test_id, user_answer } = req.body;

      if (!lesson_id || !test_id || !user_answer || !id) {
        return next(ApiError.badRequest("Все данные обязательны"));
      }

      const checkTest = await prisma.user_response.findFirst({
        where: {
          user_id: Number(id),
          test_id: Number(test_id),
          lesson_id: Number(lesson_id),
        },
      });

      if (checkTest) {
        return next(ApiError.badRequest("Вы уже отвечали на этот вопрос"));
      }

      const lesson = await prisma.lesson.findFirst({
        where: {
          id: Number(lesson_id),
          tests: {
            some: {
              id: Number(test_id),
            },
          },
        },
      });

      if (!lesson) {
        return next(ApiError.notFound("Урок или тест не найден"));
      }
      const test = await prisma.test.findFirst({
        where: { id: Number(test_id) },
      });

      if (!test) {
        return next(ApiError.notFound("Тест не найден"));
      }

      const is_correct = user_answer === test.correct_answer;

      const userResponse = await prisma.user_response.create({
        data: {
          lesson_id: Number(lesson_id),
          user_id: Number(id),
          test_id: Number(test_id),
          user_answer,
          is_correct,
        },
      });

      res.status(200).json({ userResponse });
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }
  async delete(req, res, next) {
    try {
      const { id } = req.user;
      const { lesson_id } = req.body;

      if (!lesson_id) {
        return next(ApiError.notFound(`lesson_id не обнаружен`));
      }

      const checkId = await prisma.lesson.findFirst({
        where: { id: Number(lesson_id) },
      });

      if (!checkId) {
        return next(ApiError.notFound(`lesson не найден`));
      }

      await prisma.user_response.deleteMany({
        where: {
          lesson_id: Number(lesson_id),
          user_id: Number(id),
        },
      });

      return res.status(200).json(`Тест ${lesson_id} удалён`);
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }
  async getAll(req, res, next) {
    try {
      const { id } = req.body;

      const userResponse = await prisma.user_response.findMany({
        where: { user_id: id },
      });

      res.status(200).json({ userResponse });
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }
  async getById(req, res, next) {
    try {
      const { id } = req.body;

      const userResponse = await prisma.user_response.findMany({
        where: { id },
      });

      res.status(200).json({ userResponse });
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }
}

module.exports = new UserResponseController();
