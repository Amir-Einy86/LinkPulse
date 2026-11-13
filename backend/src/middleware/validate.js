const AppError = require('../utils/AppError');

function formatIssues(error) {
  const details = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!details[key]) details[key] = issue.message;
  }
  return details;
}

const validate = (schemas) => (req, res, next) => {
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const input = part === 'body' && req.body == null ? {} : req[part];
    const result = schemas[part].safeParse(input);
    if (!result.success) {
      const details = formatIssues(result.error);
      const first = Object.values(details)[0];
      return next(new AppError(first || 'ورودی معتبر نیست.', 400, 'VALIDATION_ERROR', details));
    }
    req.valid = req.valid || {};
    req.valid[part] = result.data;
  }
  next();
};

module.exports = validate;
