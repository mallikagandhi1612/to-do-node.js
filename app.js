// This line must come before importing any instrumented module.
const tracer = require('dd-trace').init({
    env:"none",
    service:"to-do",
    logInjection:true,
    profiling: true,
    runtimeMetrics: true 
})


const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// In-memory "database"
const todos = [];

// Custom Error Classes
class AppError extends Error {
  constructor(name, statusCode, message) {
    super(message);
    this.name = name;
    this.statusCode = statusCode;
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super("NotFoundError", 404, message);
  }
}

class ValidationError extends AppError {
  constructor(message = "Invalid input") {
    super("ValidationError", 400, message);
  }
}

class InternalServerError extends AppError {
  constructor(message = "Something went wrong") {
    super("InternalServerError", 500, message);
  }
}

// Routes

// Get all to-dos
app.get("/todos", (req, res) => {
  res.json(todos);
});

// Get a single to-do by ID
app.get("/todos/:id", (req, res, next) => {
  try {
    const todo = todos.find((t) => t.id === parseInt(req.params.id));
    if (!todo) throw new NotFoundError("To-Do not found");
    res.json(todo);
  } catch (error) {
    next(error);
  }
});

// Create a new to-do
app.post("/todos", (req, res, next) => {
  try {
    const { title, description } = req.body;

    if (!title || title.trim() === "") {
      throw new ValidationError("Title is required");
    }

    const newTodo = {
      id: todos.length + 1,
      title,
      description: description || "",
      completed: false,
    };

    todos.push(newTodo);
    res.status(201).json(newTodo);
  } catch (error) {
    next(error);
  }
});

// Update a to-do
app.put("/todos/:id", (req, res, next) => {
  try {
    const { title, description, completed } = req.body;
    const todo = todos.find((t) => t.id === parseInt(req.params.id));

    if (!todo) throw new NotFoundError("To-Do not found");

    if (title && title.trim() === "") {
      throw new ValidationError("Title cannot be empty");
    }

    todo.title = title || todo.title;
    todo.description = description || todo.description;
    todo.completed = typeof completed === "boolean" ? completed : todo.completed;

    res.json(todo);
  } catch (error) {
    next(error);
  }
});

// Delete a to-do
app.delete("/todos/:id", (req, res, next) => {
  try {
    const index = todos.findIndex((t) => t.id === parseInt(req.params.id));

    if (index === -1) throw new NotFoundError("To-Do not found");

    todos.splice(index, 1);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        name: err.name,
        message: err.message,
      },
    });
  } else {
    // Fallback for unexpected errors
    const internalError = new InternalServerError();
    res.status(internalError.statusCode).json({
      error: {
        name: internalError.name,
        message: internalError.message,
      },
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
