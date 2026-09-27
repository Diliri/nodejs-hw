import { Schema, model } from 'mongoose';
import { TAGS } from '../constants/tags.js';

const noteSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: '',
      trim: true,
    },
    tag: {
      type: String,
      enum: TAGS,
      default: 'Todo',
    },
    //Розширимо схему нотатки, додавши поле userId. Це дозволить зрозуміти, кому саме належить конкретна нотатка:
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // ref: "User" означає, що поле userId посилається на інший документ у колекції users.
    // Таким чином ми встановлюємо зв’язок між колекціями: кожна нотатка належить певному користувачу.
    // Це дозволяє виконувати запити з використанням методу populate
    // (наприклад, отримати нотатку разом з інформацією про користувача,
    // якій вона належить).
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Додаємо індекс окремо для поля tag та
// Оновлюємо індекс полем userId
// Тому що будемо використовувати його при пошуку
noteSchema.index({ tag: 1, userId: 1 });

export const Note = model('Note', noteSchema);
