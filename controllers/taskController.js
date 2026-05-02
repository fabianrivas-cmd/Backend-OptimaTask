import { Task, User } from '../models/index.js';
import { aggregateRecommendation, suggestForTask } from '../services/priorityService.js';

const userInclude = {
  model: User,
  as: 'user',
  attributes: ['id', 'email', 'name'],
};

function serializeTask(task) {
  const plain = task.toJSON ? task.toJSON() : { ...task };
  const userRow = plain.user;
  delete plain.user;
  const { suggestedPriority, insight } = suggestForTask(plain);
  const owner = userRow
    ? { id: userRow.id, email: userRow.email, name: userRow.name }
    : plain.userId != null
      ? { id: plain.userId }
      : null;
  return {
    ...plain,
    suggestedPriority,
    insight,
    owner,
  };
}

export async function listTasks(req, res) {
  try {
    const tasks = await Task.findAll({
      include: [userInclude],
      order: [
        ['completed', 'ASC'],
        ['dueDate', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });

    const enriched = tasks.map(serializeTask);
    const mine = enriched.filter((t) => t.userId === req.userId);
    const recommendation = aggregateRecommendation(mine);

    return res.json({ tasks: enriched, recommendation });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'No se pudieron obtener las tareas' });
  }
}

export async function createTask(req, res) {
  try {
    const { title, description, dueDate, priority, completed } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }

    const prio = normalizePriority(priority);
    const task = await Task.create({
      userId: req.userId,
      title: title.trim().slice(0, 255),
      description: typeof description === 'string' ? description : null,
      dueDate: dueDate ? String(dueDate).slice(0, 10) : null,
      priority: prio,
      completed: Boolean(completed),
    });

    await task.reload({ include: [userInclude] });
    return res.status(201).json(serializeTask(task));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'No se pudo crear la tarea' });
  }
}

export async function updateTask(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const task = await Task.findOne({ where: { id, userId: req.userId } });
    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const { title, description, dueDate, priority, completed } = req.body || {};

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'El título no puede estar vacío' });
      }
      task.title = title.trim().slice(0, 255);
    }
    if (description !== undefined) {
      task.description = typeof description === 'string' ? description : null;
    }
    if (dueDate !== undefined) {
      task.dueDate = dueDate ? String(dueDate).slice(0, 10) : null;
    }
    if (priority !== undefined) {
      task.priority = normalizePriority(priority);
    }
    if (completed !== undefined) {
      task.completed = Boolean(completed);
    }

    await task.save();
    await task.reload({ include: [userInclude] });
    return res.json(serializeTask(task));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'No se pudo actualizar la tarea' });
  }
}

export async function deleteTask(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const deleted = await Task.destroy({ where: { id, userId: req.userId } });
    if (!deleted) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'No se pudo eliminar la tarea' });
  }
}

function normalizePriority(priority) {
  const p = String(priority || 'medium').toLowerCase();
  if (p === 'low' || p === 'high') return p;
  return 'medium';
}
