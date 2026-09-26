// server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errors } from 'celebrate';
import { connectMongoDB } from './db/connectMongoDB.js';
import authRoutes from './routes/authRoutes.js';
import notesRoutes from './routes/notesRoutes.js';
import { logger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Стандартні Middleware
app.use(helmet());
app.use(cors()); // кросдоменні http-запити
app.use(express.json());
app.use(cookieParser());

// 2. Логер HTTP-запитів
app.use(logger);
// маршрут аутентифікації
app.use(authRoutes);
// 3. Маршрути нотаток
app.use(notesRoutes); // Express тепер знає про всі роути, які ми описали в notesRoutes.js!

// 5. Middleware для обробки неіснуючих маршрутів (404)
app.use(notFoundHandler);

// Додали мідлвару валідації
app.use(errors());

// 6. Middleware для обробки помилок (500)
app.use(errorHandler);

// підключення до MongoDB
await connectMongoDB();

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
