// src/controllers/authController.js

import bcrypt from 'bcrypt';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.js';
import { createSession, setSessionCookies } from '../services/auth.js';
import { Session } from '../models/session.js';
import { sendEmail } from '../utils/sendMail.js';

import handlebars from 'handlebars';
import path from 'node:path';
import fs from 'node:fs/promises';

export const registerUser = async (req, res) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw createHttpError(400, 'Email in use');
  }
  // Хешуємо пароль
  const hashedPassword = await bcrypt.hash(password, 10);

  // Створюємо користувача
  const newUser = await User.create({
    email,
    password: hashedPassword,
  });

  // Створюємо нову сесію
  const newSession = await createSession(newUser._id);
  // Викликаємо функцію setSessionCookies, передаємо об'єкт відповіді та сесію
  setSessionCookies(res, newSession);
  // Відправляємо дані користувача (без пароля) у відповіді
  res.status(201).json(newUser);
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Перевіряємо чи користувач з такою поштою існує
  const user = await User.findOne({ email });
  if (!user) {
    throw createHttpError(401, 'Invalid credentials');
  }

  // Порівнюємо хеші паролів
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw createHttpError(401, 'Invalid credentials');
  }
  // Видаляємо стару сесію користувача
  await Session.deleteOne({ userId: user._id });

  // Створюємо нову сесію
  const newSession = await createSession(user._id);
  // Викликаємо функцію setSessionCookies, передаємо об'єкт відповіді та сесію
  setSessionCookies(res, newSession);
  res.status(200).json(user);
};

export const logoutUser = async (req, res) => {
  const { sessionId } = req.cookies;

  if (sessionId) {
    await Session.deleteOne({ _id: sessionId });
  }

  res.clearCookie('sessionId');
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  // Відповідь клієнту:Повертаємо статус 204 No Content.
  // Це стандартний код для успішного виконання запиту без тіла відповіді.
  res.status(204).send();
};

export const refreshUserSession = async (req, res) => {
  const { sessionId, refreshToken } = req.cookies;

  if (!sessionId || !refreshToken) {
    throw createHttpError(401, 'Missing session credentials');
  }

  // 1. Знаходимо поточну сесію за id сесії та рефреш токеном
  const session = await Session.findOne({
    _id: sessionId,
    refreshToken,
  });

  // 2. Якщо такої сесії нема, повертаємо помилку
  if (!session) {
    throw createHttpError(401, 'Session not found');
  }

  // 3. Якщо сесія існує, перевіряємо валідність рефреш токена
  const isSessionTokenExpired = session.refreshTokenValidUntil < new Date();

  // Якщо термін дії рефреш токена вийшов,
  // видаляємо сесію і повертаємо помилку
  if (isSessionTokenExpired) {
    await session.deleteOne();
    res.clearCookie('sessionId');
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    throw createHttpError(401, 'Session token expired');
  }

  // 4. Якщо всі перевірки пройшли добре, видаляємо поточну сесію
  await session.deleteOne();

  // 5. Створюємо нову сесію та додаємо кукі
  const newSession = await createSession(session.userId);
  setSessionCookies(res, newSession);

  res.status(200).json({
    message: 'Session refreshed',
  });
};

// Створимо контролер, який оброблятиме запит на зміну пароля:
export const requestResetEmail = async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  // Якщо користувача нема — навмисно повертаємо ту саму "успішну"
  // відповідь без відправлення листа (anti user enumeration).
  if (!user) {
    return res.status(200).json({
      message: 'If this email exists, a reset link has been sent',
    });
  }

  // Користувач є — генеруємо короткоживучий JWT і відправляємо лист
  const resetToken = jwt.sign(
    { sub: user._id, email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' },
  );
  // 1. Формуємо шлях до шаблона
  const templatePath = path.resolve('src/templates/reset-password-email.html');
  // 2. Читаємо шаблон
  const templateSource = await fs.readFile(templatePath, 'utf-8');
  // 3. Готуємо шаблон до заповнення
  const template = handlebars.compile(templateSource);
  // 4. Формуємо із шаблона HTML документ з динамічними даними
  const html = template({
    name: user.username,
    link: `${process.env.FRONTEND_DOMAIN}/reset-password?token=${resetToken}`,
  });
  try {
    await sendEmail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Reset your password',
      // 5. Передаємо HTML у функцію надписання пошти
      html,
    });
    // } catch {
    //   throw createHttpError(
    //     500,
    //     'Failed to send the email, please try again later.',
    //   );
  } catch (error) {
    console.error('ПОМИЛКА ВІДПРАВКИ ЛИСТА:', error);
    throw error;
    // throw createHttpError(
    //   500,
    //   'Failed to send the email, please try again later.',
    // );
  }

  // Та сама "нейтральна" відповідь
  res.status(200).json({
    message: 'If this email exists, a reset link has been sent',
  });
};
// Термін дії токена — 15 хвилин. Цього достатньо, щоб перейти за лінком, і це знижує ризики компрометації.
// Що класти в payload — мінімум потрібної інформації (sub, email).
// Пам’ятай: payload не шифрується, а лише підписується.
// Обгортання sendEmail у try/catch дає коректну відповідь 500 у випадку збою поштового сервісу.

// Однакові відповіді із статусом 200 це техніка щоб унеможливити «вичитування» наявності облікового запису.
// Тобто ми повертаємо однакову відповідь і для існуючої, і для неіснуючої пошти.

// Контролер виконує чотири ключові кроки: перевіряє токен, знаходить користувача, хешує новий пароль і оновлює запис.
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  // 1. Перевіряємо/декодуємо токен
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // Повертаємо помилку якщо проблема при декодуванні
    throw createHttpError(401, 'Invalid or expired token');
  }

  // 2. Шукаємо користувача
  const user = await User.findOne({ _id: payload.sub, email: payload.email });
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  // 3. Якщо користувач існує
  // створюємо новий пароль і оновлюємо користувача
  const hashedPassword = await bcrypt.hash(password, 10);
  await User.updateOne({ _id: user._id }, { password: hashedPassword });

  // 4. Інвалідовуємо всі можливі попередні сесії користувача
  await Session.deleteMany({ userId: user._id });

  // 5. Повертаємо успішну відповідь
  res.status(200).json({
    message: 'Password reset successfully. Please log in again.',
  });
};

// Що тут відбувається:

// Перевірка токена. jwt.verify() гарантує дійсність і непідробність токена, а також перевіряє строк дії (expiresIn).
// Пошук користувача. Для надійності використовуємо і sub (id), і email із payload.
// Оновлення пароля. Пароль ніколи не зберігаємо у відкритому вигляді — тільки у вигляді хешу (bcrypt.hash).
// Видаляємо всі сесії які можуть існувати для цього користувача.
// Відповідь клієнту. Повертаємо 200 та повідомлення про успіх.
