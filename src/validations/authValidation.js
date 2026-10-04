// src/validations/authValidation.js

import { Joi, Segments } from 'celebrate';

export const registerUserSchema = {
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  }),
};

export const loginUserSchema = {
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

// схема для валідації тіла запиту при скиданні пароля
// Перевіряємо, що в тілі є коректний email.
// Це мінімізує зайві звернення до бази й дає користувачу чітке повідомлення
// про помилку ще до виконання бізнес - логіки.
export const requestResetEmailSchema = {
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().required(),
  }),
};

export const resetPasswordSchema = {
  [Segments.BODY]: Joi.object({
    password: Joi.string().min(8).required(),
    token: Joi.string().required(),
  }),
};
// token — підписаний JWT, який ми надіслали в листі (дійсний упродовж 15 хв).
// password — новий пароль, який користувач хоче встановити.
