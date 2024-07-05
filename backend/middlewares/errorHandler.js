const Joi = require("joi"); // Import Joi

const errorHandler = (error, req, res, next) => {
  // Default error
  let status = 500;
  let data = { message: "Internal server error" };

  // Check if the error is a Joi validation error
  if (error instanceof Joi.ValidationError) {
    status = 400; // Usually, validation errors are client errors (400)
    data.message = error.message;
    return res.status(status).json(data);
  }

  // Check if the error has a status property
  if (error.status) {
    status = error.status;
  }

  // Check if the error has a message property
  if (error.message) {
    data.message = error.message;
  }

  // Send the error response
  return res.status(status).json(data);
};

module.exports = errorHandler;
