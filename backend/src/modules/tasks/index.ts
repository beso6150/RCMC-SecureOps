import { Router } from 'express';
import tasksRoutes from './presentation/tasks.routes.js';

export const tasksRouter = Router();
tasksRouter.use('/tasks', tasksRoutes);

export { taskService } from './application/TaskService.js';
export { taskRepository } from './infrastructure/TaskRepository.js';
