const ApiError = require(`../error/ApiError`);
const bcrypt = require(`bcryptjs`);
const jwt = require(`jsonwebtoken`);
const { prisma } = require(`../prisma/prisma-clients`);
const nodemailer = require("nodemailer");
const uuid = require(`uuid`);
const path = require(`path`);
const fs = require(`fs`);
const Jdenticon = require(`jdenticon`);

const generateJwt = (user) => {
     return jwt.sign(
          {
               id: user.id,
               role: user.role,
               name: user.name,
               email: user.email,
               verification_status: user.verification_status,
               avatar_url: user.avatar_url
          }
          , process.env.SECRET_KEY, {
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

const sendCode = async (verification_code, email) => {
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

     transporter.sendMail(mailOptions, (error, info) => {
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

               if (!candidate) {
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
               } else {
                    return next(ApiError.badRequest(`Пользователь авторизован!`));
               }

          } catch (error) {
               return next(ApiError.internal(error.message));
          }
     }

     async registration(req, res, next) {
          try {
               const { name, email, password, role, code } = req.body;

               if (!email || !password || !name) {
                    return next(ApiError.notFound(`email и пароль обязательны!`));
               }


               if (password.length < 6) {
                    return next(ApiError.badRequest(`Пароль должен быть не менее 6 символов`));
               }

               const checkCode = await prisma.check_mails.findFirst({
                    where: { email },
                    orderBy: {
                         createdAt: 'desc',
                    },
               });

               if (!checkCode) {
                    return next(ApiError.notFound(`Сначала получите код`));
               }

               const expiration = new Date(checkCode.expiration_at)
               const now = new Date(timeFn(0))

               if (expiration < now) {
                    return next(ApiError.badRequest(`срок действия кода истёк`));
               }

               if (checkCode.verification_code !== code) {
                    return next(ApiError.badRequest(`некорректный код верификации`));
               }

               const candidate = await prisma.user.findUnique({ where: { email } });

               if (candidate) {
                    return next(ApiError.badRequest(`${email} уже существует`));
               }

               const png = Jdenticon.toPng(name, 200)
               const avatarName = `${name}_${Date.now()}.png`
               const avatarPath = path.join(__dirname, `..`, `static`, avatarName)
               fs.writeFileSync(avatarPath, png)

               const hashPassword = await bcrypt.hash(password, 12);

               const user = await prisma.user.create({
                    data: { email, password: hashPassword, role: role ? role.toUpperCase() : "USER", name, verification_status: true, avatar_url: avatarName }
               });

               return res.status(200).json(user);
          } catch (error) {
               return next(ApiError.internal(error.message));
          }
     }

     async login(req, res, next) {
          try {
               const { email, password } = req.body;

               if (!email || !password) {
                    return next(ApiError.notFound(`Логин и пароль обязательны!`));
               }

               const user = await prisma.user.findUnique({ where: { email } });

               if (!user) {
                    return next(ApiError.badRequest(`${email} не найден`));
               }

               const comparePassword = bcrypt.compareSync(password, user.password);

               if (!comparePassword) {
                    return next(ApiError.unauthorized(`Указан неверный логин или пароль`));
               }

               const token = generateJwt(user.id, user.login, user.role);

               return res.status(200).json({ token });
          } catch (error) {
               return next(ApiError.internal(error.message));
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
               return next(ApiError.internal(error.message));
          }
     }

     async getById(req, res, next) {
          try {
               const { id } = req.params

               if (!id) {
                    return next(ApiError.notFound(`id обязателен!`));
               }

               const user = await prisma.user.findFirst({ where: { id } })

               if (!user) {
                    return next(ApiError.notFound(`Пользователь не обнаружен!`));
               }

               return res.status(200).json(user);

          } catch (error) {
               return next(ApiError.internal(error.message));
          }
     }

     async updateUser(req, res, next) {
          try {
               const { id } = req.params;
               const { name, email, oldPassword, newPassword, role, code } = req.body;

               let fileName

               if (req.files && req.files.img) {
                    const { img } = req.files
                    fileName = uuid.v4() + ".jpg"
                    img.mv(path.resolve(__dirname, '..', 'static', fileName))
                    console.log(fileName);
               } else {
                    console.error('Файл не передан');
                    fileName = null;
               }

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
                         return next(ApiError.badRequest(`срок действия кода истёк`));
                    }

                    if (checkCode.verification_code !== code) {
                         return next(ApiError.badRequest(`некорректный код верификации`));
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
                              verification_status: true,
                              avatar_url: fileName || undefined,
                         }
                    }
               )

               return res.status(200).json({ user: updateUser });
          }
          catch (error) {
               return next(ApiError.internal(error.message));
          }
     }

     async delete(req, res, next) {
          try {
               const { id } = req.params

               if (!id) {
                    return next(ApiError.notFound(`Укажите id для удаления`));
               }

               const user = await prisma.user.findUnique({ where: { id: Number(id) } })

               if (!user) {
                    return next(ApiError.notFound(`Пользователь не найден!`));
               }

               await prisma.user.delete({ where: { id: Number(id) } })

               return res.status(200).json(`пользователь ${user.name.toUpperCase()} был удалён`)
          } catch (error) {
               return next(ApiError.internal(error.message));
          }
     }

     async check(req, res, next) {
          try {
               const { id } = req.user
               const user = await prisma.user.findFirst({ where: { id } })
               const token = generateJwt(user);

               return res.status(200).json({ token });
          } catch (error) {
               return next(ApiError.internal(error.message));
          }
     }
}

module.exports = new UserController();