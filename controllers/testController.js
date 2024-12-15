const ApiError = require(`../error/ApiError`)
const { prisma } = require(`../prisma/prisma-clients`);


class TestController {
     async add(req, res, next) {
          try {
               const { lesson_id, question, correct_answer } = req.body

               const checkLessonId = await prisma.lesson.findFirst({ where: { id: Number(lesson_id) } })

               if (!checkLessonId) {
                    return next(ApiError.notFound(`Такого урока не существует`))
               }

               if (!lesson_id && !question && !correct_answer) {
                    return next(ApiError.notFound(`Все поля обязательны`))
               }


               const test = await prisma.test.create({
                    data: {
                         lesson_id: Number(lesson_id),
                         question,
                         correct_answer
                    }
               })

               return res.status(200).json({ test });

          } catch (error) {
               return next(ApiError.internal(error.message))
          }
     }
     async update(req, res, next) {
          try {
               const { id } = req.params;
               const { lesson_id, question, correct_answer } = req.body

               if (lesson_id) {
                    const checkLessonId = await prisma.lesson.findFirst({ where: { id: Number(lesson_id) } })

                    if (!checkLessonId) {
                         return next(ApiError.notFound(`Этого урока не существует`))
                    }
               }

               const checkId = await prisma.test.findFirst({ where: { id: Number(id) } })

               if (!checkId) {
                    return next(ApiError.notFound(`Тест не найден`))
               }

               const test = await prisma.test.update(
                    {
                         where: { id: Number(id) },
                         data: {
                              lesson_id: Number(lesson_id) || undefined,
                              question: question || undefined,
                              correct_answer: correct_answer || undefined
                         },

                    }
               )

               return res.status(200).json({ test });

          } catch (error) {
               return next(ApiError.internal(error.message))
          }
     }
     async delete(req, res, next) {
          try {
               const { id } = req.params;

               if (!id) {
                    return next(ApiError.notFound(`id не обнаружен`))
               }

               const checkId = await prisma.test.findFirst({ where: { id: Number(id) } })

               if (!checkId) {
                    return next(ApiError.notFound(`курс не найден`))
               }

               await prisma.test.delete({
                    where: { id: Number(id) }
               })

               return res.status(200).json(`Тест ${id} удалён`);

          } catch (error) {
               return next(ApiError.internal(error.message))
          }
     }
     async getAll(req, res, next) {
          try {
               const { page = 1, limit = 10 } = req.query;
               const skip = (page - 1) * limit;

               const { lesson_id } = req.body;


               if (!lesson_id) {
                    return next(ApiError.notFound('lesson_id отсутствует'));
               }

               const [tests, totalCount] = await Promise.all([
                    prisma.test.findMany({
                         where: { lesson_id: Number(lesson_id) },
                         skip: Number(skip),
                         take: Number(limit),
                         orderBy: { createdAt: 'desc' },
                    }),
                    prisma.test.count({
                         where: { lesson_id: Number(lesson_id) },
                    }),
               ]);

               return res.status(200).json({
                    data: tests,
                    total: totalCount,
                    page: Number(page),
                    totalPages: Math.ceil(totalCount / limit),
               });
          } catch (error) {
               return next(ApiError.internal(error.message));
          }
     }
     async getById(req, res, next) {
          try {
               const { id } = req.params

               if (!id) {
                    return next(ApiError.notFound(`id обязателен!`));
               }

               const test = await prisma.test.findFirst({ where: { id: Number(id) } })

               if (!test) {
                    return next(ApiError.notFound(`test не обнаружен!`));
               }

               return res.status(200).json(test);

          } catch (error) {
               return next(ApiError.internal(error.message));
          }
     }

}

module.exports = new TestController()