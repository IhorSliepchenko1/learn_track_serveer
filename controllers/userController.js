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
          service: "gmail",
          auth: {
               user: process.env.MAIL_SEND,
               pass: process.env.PASS_SEND,
          },
     });

     const mailOptions = {
          from: `Administrator <${process.env.MAIL_SEND}>`,
          to: email,
          subject: `Verification code`,
          html: `<p>Ваш код для подтверждения почты: ${verification_code}</p>`,
     };

     transporter.sendMail(mailOptions, async (error, info) => {
          if (error) {
               return next(ApiError.internal(error.message));
          }

          console.log(info)
     })
}

const timeFn = (minute) => {
     const currentTime = new Date();
     currentTime.setMinutes(currentTime.getMinutes() + minute);

     // const year = currentTime.getFullYear();
     // const month = String(currentTime.getMonth() + 1).padStart(2, '0');
     // const day = String(currentTime.getDate()).padStart(2, '0');
     // const hours = String(currentTime.getHours()).padStart(2, '0');
     // const minutes = String(currentTime.getMinutes()).padStart(2, '0');
     // const seconds = String(currentTime.getSeconds()).padStart(2, '0');

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

               const verification_code = codeGenerator();
               const expiration_at = timeFn(5);

               const code = await prisma.check_mails.create({
                    data: {
                         email,
                         verification_code,
                         expiration_at,
                    },
               });

               sendCode(verification_code, email);
               return res.status(200).json({ code });
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
               const data = await User.findAll({

                    order: [['createdAt', 'DESC']],
               });

               return res.status(200).json(data);
          } catch (error) {
               next(ApiError.internal(error.message));
          }
     }

     //   async updateUser(req, res, next) {
     //     const { id } = req.params;
     //     const { login, newPassword, oldPassword, role } = req.body;

     //     try {

     //       const user = await User.findOne({ where: { id } });

     //       if (!user) {
     //         return next(ApiError.badRequest(`${id} не найден`));
     //       }

     //       let isMatch

     //       if (oldPassword) {
     //         isMatch = bcrypt.compareSync(oldPassword, user.password);

     //         if (!isMatch) {
     //           return next(ApiError.badRequest(`Старый пароль не совпадает`));
     //         }
     //       }



     //       if (newPassword) {
     //         if (newPassword.length < 6) {
     //           return next(ApiError.badRequest(`Пароль должен быть не менее 6 символов`));
     //         }
     //       }

     //       const hashPassword = newPassword ? await bcrypt.hash(newPassword, 12) : undefined

     //       await User.update(
     //         {
     //           login: login || undefined,
     //           password: hashPassword,
     //           role: role || undefined
     //         },
     //         { where: { id } }
     //       )

     //       return res.status(200).json(user);

     //     }
     //     catch (error) {
     //       next(ApiError.internal(error.message));
     //     }
     //   }

     //   async delete(req, res, next) {
     //     const { id } = req.params;

     //     try {

     //       const delId = await User.findOne({ where: { id } })

     //       if (!delId) {
     //         return next(ApiError.notFound(`id в базе отсутствует или ранее был удалён!`));
     //       }

     //       await User.destroy({ where: { id } });

     //       return res.status(200).json(`id: ${id} удалён `);
     //     } catch (error) {
     //       next(ApiError.internal(error.message));
     //     }
     //   }

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
