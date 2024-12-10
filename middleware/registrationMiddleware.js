const { RateLimiterMemory } = require('rate-limiter-flexible');
const ApiError = require(`../error/ApiError`);

const rateLimiter = new RateLimiterMemory({
     points: 5,
     duration: 300,
});

const registrationLimiter = async (req, res, next) => {
     try {
          await rateLimiter.consume(req.ip);

          next();
     } catch (rejRes) {
          return next(ApiError.badRequest('Слишком много запросов, попробуйте позже.'));
     }
};

module.exports = registrationLimiter;
