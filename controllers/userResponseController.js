const ApiError = require(`../error/ApiError`)
const { prisma } = require(`../prisma/prisma-clients`);

class UserResponseController {
     async userResponse(req, res, next) {
          try {
               const { id } = req.user
               const { lesson_id, test_id, user_answer } = req.body

               if (!lesson_id || !test_id || !user_answer || !id) {
                    return next(ApiError.badRequest('Все данные обязательны'));
               }

               const lesson = await prisma.lesson.findFirst({ where: { id: Number(lesson_id) } })

               if (!lesson) {
                    return next(ApiError.notFound('Урок не найден'));
               }
               const test = await prisma.test.findFirst({ where: { id: Number(test_id) } })

               if (!test) {
                    return next(ApiError.notFound('Тест не найден'));
               }

               const is_correct = user_answer === test.correct_answer

               const userResponse = await prisma.user_response.create({
                    data: {
                         lesson_id: Number(lesson_id),
                         user_id: Number(id),
                         test_id: Number(test_id),
                         user_answer,
                         is_correct
                    }
               })


               const count_lessons = await prisma.lesson.findMany({ where: { course_id: Number(lesson.course_id) } })
               const completed_lessons = await prisma.user_response.findMany({
                    where: {
                         user_id: Number(id),
                         lesson_id: Number(lesson_id),
                         test_id: Number(test_id)
                    }
               })

               const correct_answers_of_tests = completed_lessons.filter((item) => {
                    return item.is_correct
               }).length

               const progress = await prisma.progress.findFirst({
                    where: {
                         user_id: Number(id),
                         course_id: Number(lesson.course_id)
                    }
               })

               const count_tests = await prisma.test.findMany({
                    where: { lesson_id: Number(count_lessons[0].id) }
               })

               await prisma.progress.update({
                    where: { id: Number(progress.id) },

                    data: {
                         count_lessons: Number(count_lessons.length) || undefined,
                         count_tests: Number(count_tests.length) || undefined,
                         completed_lessons: Number(completed_lessons.length) || undefined,
                         correct_answers_of_tests: Number(correct_answers_of_tests) || undefined,
                         incorrect_answers_of_tests: Number(completed_lessons.length - correct_answers_of_tests) || undefined
                    }
               })


               res.status(200).json({ userResponse })

          } catch (error) {
               return next(ApiError.internal(error.message))
          }
     }
     async getAll(req, res, next) {
          try {
               const { id } = req.body

               const userResponse = await prisma.user_response.findMany({
                    where: { user_id: id }
               })

               res.status(200).json({ userResponse })

          } catch (error) {
               return next(ApiError.internal(error.message))
          }
     }
     async getById(req, res, next) {
          try {
               const { id } = req.body

               const userResponse = await prisma.user_response.findMany({
                    where: { id }
               })

               res.status(200).json({ userResponse })

          } catch (error) {
               return next(ApiError.internal(error.message))
          }
     }
}

module.exports = new UserResponseController()