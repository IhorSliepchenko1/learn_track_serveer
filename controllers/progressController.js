const ApiError = require(`../error/ApiError`)
const { prisma } = require(`../prisma/prisma-clients`);

class ProgressController {
     async add(req, res, next) {
          try {
               const { id } = req.user
               const { course_id } = req.body

               if (!id || !course_id) {
                    return next(ApiError.notFound(`Все данные обязательны`))
               }

               const check = await prisma.progress.findFirst({
                    where: {
                         course_id: Number(course_id),
                         user_id: Number(id)
                    }
               })

               if (check) {
                    return next(ApiError.badRequest(`Прогресс под этот курс у вас уже существует`))
               }

               const count_lessons = await prisma.lesson.findMany({
                    where: { course_id: Number(course_id) }
               })

               const count_tests = await prisma.test.findMany({
                    where: { lesson_id: Number(count_lessons[0].id) }
               })

               const progress = await prisma.progress.create({
                    data: {
                         user_id: Number(id),
                         course_id: Number(course_id),
                         count_lessons: Number(count_lessons.length),
                         completed_lessons: 0,
                         count_tests: Number(count_tests.length),
                         correct_answers_of_tests: 0,
                         incorrect_answers_of_tests: 0
                    }
               })

               return res.status(200).json({ progress })
          }


          catch (error) {
               return next(ApiError.internal(error.message))
          }
     }
}

module.exports = new ProgressController()