const ApiError = require(`../error/ApiError`);
const { prisma } = require(`../prisma/prisma-clients`);

class ProgressController {
  async checkProgress(req, res, next) {
    try {
      const { id } = req.user;
      const { course_id } = req.body;

      if (!course_id) {
        return next(ApiError.badRequest("ID курса обязателен"));
      }

      const countLessons = await prisma.lesson.findMany({
        where: { course_id: Number(course_id) },
      });

      const tests = await Promise.all(
        countLessons.map(async (lesson) => {
          const testData = await prisma.test.findMany({
            where: { lesson_id: lesson.id },
          });

          const userResponse = await prisma.user_response.findMany({
            where: { user_id: Number(id), lesson_id: lesson.id },
          });

          const correctAnswers = userResponse.filter((item) => item.is_correct);

          return {
            completed_lessons: testData.length === userResponse.length ? 1 : 0,
            count_tests: testData.length,
            correct_answers_of_tests: correctAnswers.length,
            incorrect_answers_of_tests:
              userResponse.length - correctAnswers.length,
          };
        })
      );

      const progress = tests.reduce(
        (acc, current) => {
          acc.completed_lessons += current.completed_lessons;
          acc.count_tests += current.count_tests;
          acc.correct_answers_of_tests += current.correct_answers_of_tests;
          acc.incorrect_answers_of_tests += current.incorrect_answers_of_tests;
          return acc;
        },
        {
          completed_lessons: 0,
          count_tests: 0,
          correct_answers_of_tests: 0,
          incorrect_answers_of_tests: 0,
        }
      );

      progress.count_lessons = countLessons.length;

      return res.status(200).json({ progress });
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }
}

module.exports = new ProgressController();
