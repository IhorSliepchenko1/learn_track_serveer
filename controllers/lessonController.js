const ApiError = require(`../error/ApiError`);
const { prisma } = require(`../prisma/prisma-clients`);

class LessonController {
  async add(req, res, next) {
    try {
      const { course_id, title, content } = req.body;

      const checkCourseId = await prisma.course.findFirst({
        where: { id: Number(course_id) },
      });

      if (!checkCourseId) {
        return next(ApiError.notFound(`Этого курса не существует`));
      }

      if (!title && !content && !course_id) {
        return next(ApiError.notFound(`Все поля обязательны`));
      }

      const checkAvailability = await prisma.lesson.findFirst({
        where: { title, course_id: Number(course_id) },
      });

      if (checkAvailability) {
        return next(ApiError.badRequest(`Вы уже добавили этот урок`));
      }

      const lesson = await prisma.lesson.create({
        data: {
          course_id: Number(course_id),
          title,
          content,
        },
      });

      return res.status(200).json({ lesson });
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { course_id, title, content } = req.body;

      console.log(title);

      if (course_id) {
        const checkCourseId = await prisma.course.findFirst({
          where: { id: Number(course_id) },
        });

        if (!checkCourseId) {
          return next(ApiError.notFound(`Этого курса не существует`));
        }
      }

      const checkId = await prisma.lesson.findFirst({
        where: { id: Number(id) },
      });

      if (!checkId) {
        return next(ApiError.notFound(`Урок не найден`));
      }

      if (title) {
        const checkTitle = await prisma.lesson.findFirst({ where: { title } });

        if (checkTitle) {
          return next(
            ApiError.badRequest(`урок с таким названием уже существует`)
          );
        }
      }

      const lesson = await prisma.lesson.update({
        where: { id: Number(id) },
        data: {
          course_id: Number(course_id) || undefined,
          title: title || undefined,
          content: content || undefined,
        },
      });

      return res.status(200).json({ lesson });
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }
  async delete(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return next(ApiError.notFound(`id не обнаружен`));
      }

      const checkId = await prisma.lesson.findFirst({
        where: { id: Number(id) },
      });

      if (!checkId) {
        return next(ApiError.notFound(`курс не найден`));
      }

      await prisma.$transaction(async (prisma) => {
        await prisma.test.deleteMany({
          where: {
            lesson_id: Number(id),
          },
        });

        await prisma.lesson.delete({
          where: { id: Number(id) },
        });
      });

      return res.status(200).json(`Урок ${checkId.title} удалён`);
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const { course_id } = req.body;

      if (!course_id) {
        return next(ApiError.notFound("course_id отсутствует"));
      }

      const [lessons, totalCount] = await Promise.all([
        prisma.lesson.findMany({
          where: { course_id: Number(course_id) },
          skip: Number(skip),
          take: Number(limit),
          orderBy: { createdAt: "desc" },
        }),
        prisma.lesson.count({
          where: { course_id: Number(course_id) },
        }),
      ]);

      return res.status(200).json({
        data: lessons,
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
      const { id } = req.params;

      if (!id) {
        return next(ApiError.notFound(`id обязателен!`));
      }

      const lesson = await prisma.lesson.findFirst({
        where: { id: Number(id) },
      });

      if (!lesson) {
        return next(ApiError.notFound(`Урок не обнаружен!`));
      }

      return res.status(200).json(lesson);
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }
}

module.exports = new LessonController();
