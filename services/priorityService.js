function daysUntil(dateStr) {
  if (!dateStr) return null;
  const due = new Date(`${dateStr}T23:59:59`);
  const now = new Date();
  return (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
}

export function suggestForTask(task) {
  if (task.completed) {
    return {
      suggestedPriority: 'low',
      insight: 'Completada — ya no requiere foco inmediato.',
    };
  }

  let score = 0;
  const reasons = [];

  const days = daysUntil(task.dueDate);
  if (days !== null) {
    if (days < 0) {
      score += 100;
      reasons.push('fecha de vencimiento ya pasó');
    } else if (days <= 2) {
      score += 85;
      reasons.push('vence en ≤ 2 días');
    } else if (days <= 7) {
      score += 45;
      reasons.push('vence en la próxima semana');
    }
  } else {
    reasons.push('sin fecha límite definida');
  }

  if (task.priority === 'high') {
    score += 15;
    reasons.push('prioridad manual alta');
  } else if (task.priority === 'low') {
    score -= 10;
  }

  let suggestedPriority = 'low';
  if (score >= 70) suggestedPriority = 'high';
  else if (score >= 35) suggestedPriority = 'medium';

  const insight =
    reasons.length > 0
      ? `OptimaTask sugiere esta urgencia por: ${reasons.join('; ')}.`
      : 'Sin señales fuertes de urgencia.';

  return { suggestedPriority, insight };
}

export function aggregateRecommendation(tasksWithSuggestions) {
  const pending = tasksWithSuggestions.filter((t) => !t.completed);
  const highSuggested = pending.filter((t) => t.suggestedPriority === 'high');

  if (pending.length > 10) {
    return {
      level: 'notice',
      message:
        'Tienes muchas tareas pendientes. Te recomendamos ordenar por prioridad sugerida alta y fechas cercanas.',
    };
  }
  if (highSuggested.length >= 3) {
    return {
      level: 'warning',
      message:
        'Hay varias tareas con prioridad sugerida alta. Enfoca el día en cerrar o reprogramar las más críticas.',
    };
  }
  if (pending.length === 0) {
    return {
      level: 'success',
      message: '¡Sin pendientes! Buen momento para planificar lo próximo.',
    };
  }
  return {
    level: 'info',
    message: 'Balance saludable de carga. Revisa las sugerencias por tarea para afinar tu día.',
  };
}
