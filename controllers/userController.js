const ApiError = require(`../error/ApiError`);
const bcrypt = require(`bcryptjs`);
const jwt = require(`jsonwebtoken`);
const { prisma } = require(`../prisma/prisma-clients`);
const nodemailer = require("nodemailer");

const generateJwt = (id, email, role) => {
     return jwt.sign({ id, email, role }, process.env.SECRET_KEY, {
          expiresIn: `24h`,
     });
};

const codeGenerator = () => {
     const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

     let code = ''
     for (let i = 0; i < 6; i++) {
          const letterIndex = Math.floor(Math.random() * 26)
          code += i % 2 == 0 ? letters[letterIndex] : Math.floor(Math.random() * 10)
     }
     return code
}

const sendCode = (verification_code, email) => {
     const transporter = nodemailer.createTransport({
          service: `gmail`,
          auth: {
               user: process.env.MAIL_SEND,
               pass: process.env.PASS_SEND,
          },
     });

     const now = new Date()
     const mailOptions = {
          from: `Administrator <${process.env.MAIL_SEND}>`,
          to: email,
          subject: `Verification code ${now.toLocaleString()}`,
          html: `<p>Ваш код для подтверждения почты: ${verification_code}</p>`,
     };

     transporter.sendMail(mailOptions, async (error, info) => {
          if (error) {
               return next(ApiError.internal(error.message));
          }
     })
}

const timeFn = (minute) => {
     const currentTime = new Date();
     currentTime.setMinutes(currentTime.getMinutes() + minute);
     return currentTime.toISOString();
}

class UserController {
     async sendVerificationCode(req, res, next) {
          try {
               const { email } = req.body;

               if (!email) {
                    return next(ApiError.notFound(`email обязателен!`));
               }

               const candidate = await prisma.user.findUnique({ where: { email } });

               if (candidate && candidate.verification_status) {
                    return next(ApiError.badRequest(`Пользователь авторизован!`));
               }

               const checkCode = await prisma.check_mails.findFirst({
                    where: { email },
                    orderBy: {
                         createdAt: 'desc',
                    },
               });

               if (checkCode) {
                    const expiration = new Date(checkCode.expiration_at)
                    const now = new Date(timeFn(0))

                    if (expiration > now) {
                         return next(ApiError.badRequest(`вам уже был выслан код!`));
                    }
               }

               const verification_code = codeGenerator();
               const expiration_at = timeFn(5);

               await prisma.check_mails.create({
                    data: {
                         email,
                         verification_code,
                         expiration_at,
                    },
               });


               sendCode(verification_code, email);

               const startTimer = new Date(expiration_at);
               startTimer.setMinutes(startTimer.getMinutes() - 5);

               return res.status(200).json({ expiration_at });
          } catch (error) {
               next(ApiError.internal(error.message));
          }
     }


     async registration(req, res, next) {
          try {
               const { name, email, password, role, code } = req.body;

               if (!email || !password || !name) {
                    next(ApiError.notFound(`email и пароль обязательны!`));
               }


               if (password.length < 6) {
                    next(ApiError.badRequest(`Пароль должен быть не менее 6 символов`));
               }

               const checkCode = await prisma.check_mails.findFirst({
                    where: { email },
                    orderBy: {
                         createdAt: 'desc',
                    },
               });


               const expiration = new Date(checkCode.expiration_at)
               const now = new Date(timeFn(0))

               if (expiration < now) {
                    next(ApiError.badRequest(`срок действия кода истёк`));
               }

               if (checkCode.verification_code !== code) {
                    next(ApiError.badRequest(`некорректный код верификации`));
               }

               const candidate = await prisma.user.findUnique({ where: { email } });

               if (candidate) {
                    next(ApiError.badRequest(`${email} уже существует`));
               }

               const hashPassword = await bcrypt.hash(password, 12);
               const user = await prisma.user.create({
                    data: { email, password: hashPassword, role: role ? role.toUpperCase() : "USER", name, verification_status: checkCode.verification_code === code }
               });

               return res.json(user);
          } catch (error) {
               next(ApiError.internal(error.message));
          }
     }

     async login(req, res, next) {
          try {
               const { email, password } = req.body;

               if (!email || !password) {
                    next(ApiError.notFound(`Логин и пароль обязательны!`));
               }

               const user = await prisma.user.findUnique({ where: { email } });

               if (!user) {
                    next(ApiError.badRequest(`${email} не найден`));
               }

               const comparePassword = bcrypt.compareSync(password, user.password);

               if (!comparePassword) {
                    next(ApiError.unauthorized(`Указан неверный логин или пароль`));
               }

               const token = generateJwt(user.id, user.login, user.role);

               return res.json({ token });
          } catch (error) {
               next(ApiError.internal(error.message));
          }
     }

     async getAll(req, res, next) {
          try {
               const { page = 1, limit = 10 } = req.query;
               const skip = (page - 1) * limit;

               const [users, totalCount] = await Promise.all([
                    prisma.user.findMany({
                         skip: Number(skip),
                         take: Number(limit),
                         orderBy: {
                              createdAt: 'desc',
                         },
                    }),
                    prisma.user.count(),
               ]);

               return res.status(200).json({
                    data: users,
                    total: totalCount,
                    page: Number(page),
                    totalPages: Math.ceil(totalCount / limit),
               });
          } catch (error) {
               next(ApiError.internal(error.message));
          }
     }


     async updateUser(req, res, next) {
          const { id } = req.params;
          const { name, email, oldPassword, newPassword, role, code } = req.body;

          try {

               if (email) {
                    const checkEmail = await prisma.user.findUnique({ where: { email } })
                    if (checkEmail) {
                         return next(ApiError.badRequest(`Указанный вами email уже существует`));
                    }

                    const checkCode = await prisma.check_mails.findFirst({
                         where: { email },
                         orderBy: {
                              createdAt: 'desc',
                         },
                    });

                    const expiration = new Date(checkCode.expiration_at)
                    const now = new Date(timeFn(0))

                    if (expiration < now) {
                         next(ApiError.badRequest(`срок действия кода истёк`));
                    }

                    if (checkCode.verification_code !== code) {
                         next(ApiError.badRequest(`некорректный код верификации`));
                    }
               }

               const user = await prisma.user.findUnique({ where: { id: Number(id) } });

               if (!user) {
                    return next(ApiError.badRequest(`${id} не найден`));
               }

               let isMatch

               if (oldPassword) {
                    isMatch = bcrypt.compareSync(oldPassword, user.password);

                    if (!isMatch) {
                         return next(ApiError.badRequest(`Старый пароль не совпадает`));
                    }
               }

               if (newPassword) {
                    if (newPassword.length < 6) {
                         return next(ApiError.badRequest(`Пароль должен быть не менее 6 символов`));
                    }
               }

               const hashPassword = newPassword ? await bcrypt.hash(newPassword, 12) : undefined

               const updateUser = await prisma.user.update(
                    {
                         where: { id: Number(id) },
                         data: {
                              email: email || undefined,
                              password: hashPassword,
                              role: role || undefined,
                              name: name || undefined,
                              verification_status: true
                         }
                    }
               )

               return res.status(200).json({ user: updateUser });
          }
          catch (error) {
               next(ApiError.internal(error.message));
          }
     }

     async delete(req, res, next) {
          const { id } = req.params;

          try {

               const delId = await User.findOne({ where: { id } })

               if (!delId) {
                    return next(ApiError.notFound(`id в базе отсутствует или ранее был удалён!`));
               }

               await User.destroy({ where: { id } });

               return res.status(200).json(`id: ${id} удалён `);
          } catch (error) {
               next(ApiError.internal(error.message));
          }
     }

     async delete(req, res, next) {
          try {
               const { id } = req.params

               if (!id) {
                    next(ApiError.notFound(`Укажите id для удаления`));
               }

               const user = await prisma.user.findUnique({ where: { id: Number(id) } })

               if (!user) {
                    next(ApiError.notFound(`Пользователь не найден!`));
               }

               await prisma.user.delete({ where: { id: Number(id) } })

               return res.json(`пользователь ${user.name.toUpperCase()} был удалён`)
          } catch (error) {
               next(ApiError.internal(error.message));
          }
     }

     async check(req, res, next) {
          try {
               const token = generateJwt(req.user.id, req.user.email, req.user.role);

               return res.json({ token });
          } catch (error) {
               next(ApiError.internal(error.message));
          }
     }
}

module.exports = new UserController();
