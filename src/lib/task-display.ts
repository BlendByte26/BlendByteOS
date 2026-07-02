import type { Task } from "./types";
import { cleanPrefixedTitle } from "./title-display";

export function getTaskDisplayTitle(task: Pick<Task, "title" | "clients">) {
  return cleanPrefixedTitle(task.title, task.clients);
}
