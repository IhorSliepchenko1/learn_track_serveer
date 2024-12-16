const ApiError = require(`../error/ApiError`);
const { prisma } = require(`../prisma/prisma-clients`);
const uuid = require(`uuid`);
const path = require(`path`);

class CourseController {
  async add(req, res, next) {
    try {
      const { title, description } = req.body;

      if (!title && !description) {
        return next(ApiError.notFound(`Все поля обязательны`));
      }

      const checkAvailability = await prisma.course.findFirst({
        where: { title },
      });
      if (checkAvailability) {
        return next(
          ApiError.badRequest(`Курс с таким названием уже существует`)
        );
      }

      let fileName;

      if (req.files && req.files.img) {
        const { img } = req.files;
        fileName = uuid.v4() + ".jpg";
        img.mv(path.resolve(__dirname, "..", "static", fileName));
        console.log(fileName);
      } else {
        fileName = null;
      }

      const course = await prisma.course.create({
        data: {
          title,
          description,
          image_url: fileName || null,
        },
      });

      return res.status(200).json({ course });
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { title, description } = req.body;

      const checkId = await prisma.course.findFirst({
        where: { id: Number(id) },
      });

      if (!checkId) {
        return next(ApiError.notFound(`курс не найден`));
      }

      const checkTitle = await prisma.course.findFirst({ where: { title } });

      if (checkTitle.title === title) {
        return next(
          ApiError.badRequest(`курс с таким названием уже существует`)
        );
      }

      let fileName;

      if (req.files && req.files.img) {
        const { img } = req.files;
        fileName = uuid.v4() + ".jpg";
        img.mv(path.resolve(__dirname, "..", "static", fileName));
        console.log(fileName);
      } else {
        fileName = null;
      }

      const course = await prisma.course.update({
        where: { id: Number(id) },
        data: {
          title: title || undefined,
          description: description || undefined,
          image_url: fileName || undefined,
        },
      });

      return res.status(200).json({ course });
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

      const checkId = await prisma.course.findFirst({
        where: { id: Number(id) },
      });

      if (!checkId) {
        return next(ApiError.notFound(`курс не найден`));
      }

      await prisma.$transaction(async (prisma) => {
        await prisma.user_response.deleteMany({
          where: {
            lesson: {
              course_id: Number(id),
            },
          },
        });

        await prisma.test.deleteMany({
          where: {
            lesson: {
              course_id: Number(id),
            },
          },
        });

        await prisma.lesson.deleteMany({
          where: { course_id: Number(id) },
        });

        await prisma.course.delete({
          where: { id: Number(id) },
        });
      });

      return res.status(200).json(`Курс ${checkId.title} удалён`);
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const [courses, totalCount] = await Promise.all([
        prisma.course.findMany({
          skip: Number(skip),
          take: Number(limit),
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.course.count(),
      ]);

      return res.status(200).json({
        data: courses,
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

      const course = await prisma.course.findFirst({
        where: { id: Number(id) },
      });

      if (!course) {
        return next(ApiError.notFound(`Курс не обнаружен!`));
      }

      return res.status(200).json(user);
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }
}

module.exports = new CourseController();
