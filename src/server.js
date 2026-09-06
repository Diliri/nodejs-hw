import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pinoHttp from 'pino-http';
import helmet from 'helmet';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Стандартні Middleware
app.use(helmet());
app.use(cors()); // кросдоменні http-запити
app.use(express.json());

// 2. Логер HTTP-запитів
app.use(
  pinoHttp({
    transport: {
      target: 'pino-pretty',
    },
  }),
);

// 3. Маршрути нотаток
app.get('/notes', (req, res) => {
  res.status(200).json({
    message: 'Retrieved all notes',
  });
});

app.get('/notes/:noteId', (req, res) => {
  const { noteId } = req.params;
  res.status(200).json({
    message: `Retrieved note with ID: ${noteId}`,
  });
});

// 4. Тестовий маршрут для імітації помилки
app.get('/test-error', (req, res) => {
  throw new Error('Simulated server error');
});

// 5. Middleware для обробки неіснуючих маршрутів (404)
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
  });
});

// 6. Middleware для обробки помилок (500)
app.use((err, req, res, next) => {
  res.status(500).json({
    message: err.message || 'Internal Server Error',
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
