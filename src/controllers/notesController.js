// src/controllers/studentsController.js
import createHttpError from 'http-errors';
import { Note } from '../models/note.js';

export const getAllNotes = async (req, res, next) => {
  try {
    const { page = 1, perPage = 10, tag, search } = req.query;
    // Додаємо критерій пошуку нотаток тільки поточного користувача
    const myQuery = Note.find({ userId: req.user._id });
    // Додаємо фільтрацію за тегом (якщо є)
    if (tag) {
      myQuery.where('tag').equals(tag);
    }

    // Додаємо фільтрацію за пошуковим словом (якщо є)
    if (search) {
      myQuery.where({
        $or: [
          {
            title: { $regex: search, $options: 'i' },
          },
          {
            content: { $regex: search, $options: 'i' },
          },
        ],
      });
    }

    // Рахуємо загальну кількість нотаток ПОТОЧНОГО користувача (із урахуванням фільтрів)
    const totalNotes = await Note.countDocuments(myQuery.getFilter());
    const totalPages = Math.ceil(totalNotes / perPage);
    const skip = (page - 1) * perPage;

    // Отримуємо нотатки з пагінацією
    const notes = await myQuery.skip(skip).limit(perPage).exec();

    res.status(200).json({
      page: Number(page),
      perPage: Number(perPage),
      totalNotes,
      totalPages,
      notes,
    });
  } catch (error) {
    next(error);
  }
};

export const getNoteById = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    // const note = await Note.findById(noteId);
    const note = await Note.findOne({ _id: noteId, userId: req.user._id });
    // Чому саме findOne: Нам потрібно знайти конкретний документ за двома умовами:
    // _id студента і userId власника. Якщо хоча б одна з умов не виконується
    // (нема такого студента або він належить іншому користувачу)
    // — отримаємо null і повернемо 404. Це захищає приватні дані.
    //

    if (!note) {
      throw createHttpError(404, 'Note not found');
    }

    res.status(200).json(note);
  } catch (error) {
    next(error);
  }
};

export const createNote = async (req, res, next) => {
  try {
    const newNote = await Note.create({ ...req.body, userId: req.user._id });
    res.status(201).json(newNote);
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    //const deletedNote = await Note.findByIdAndDelete(noteId);
    const deletedNote = await Note.findOneAndDelete({
      _id: noteId,
      // Критерій пошуку по userId
      userId: req.user._id,
    });
    if (!deletedNote) {
      throw createHttpError(404, 'Note not found');
    }

    res.status(200).json(deletedNote);
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    // const updatedNote = await Note.findByIdAndUpdate(noteId, req.body, {
    //   returnDocument: 'after',
    // });
    const updatedNote = await Note.findOneAndUpdate(
      // Критерій пошуку по userId
      { _id: noteId, userId: req.user._id },
      req.body,
      { returnDocument: 'after' },
    );

    if (!updatedNote) {
      throw createHttpError(404, 'Note not found');
    }

    res.status(200).json(updatedNote);
  } catch (error) {
    next(error);
  }
};
