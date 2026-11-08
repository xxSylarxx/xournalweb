import { Stroke } from '../types/document';

export interface Command {
  name: string;
  execute: () => void;
  undo: () => void;
}

export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistory: number = 50;
  private onChange?: () => void;

  constructor(onChange?: () => void) {
    this.onChange = onChange;
  }

  public execute(command: Command) {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack on new action

    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    this.onChange?.();
  }

  public undo(): boolean {
    const command = this.undoStack.pop();
    if (!command) return false;

    command.undo();
    this.redoStack.push(command);
    this.onChange?.();
    return true;
  }

  public redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) return false;

    command.execute();
    this.undoStack.push(command);
    this.onChange?.();
    return true;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.onChange?.();
  }
}

/**
 * Creates a command for adding a new stroke.
 */
export function createAddStrokeCommand(
  strokesList: Stroke[],
  newStroke: Stroke,
  onUpdate: () => void
): Command {
  return {
    name: 'Add Stroke',
    execute: () => {
      strokesList.push(newStroke);
      onUpdate();
    },
    undo: () => {
      const idx = strokesList.findIndex((s) => s.id === newStroke.id);
      if (idx !== -1) {
        strokesList.splice(idx, 1);
      }
      onUpdate();
    },
  };
}

/**
 * Creates a command for deleting multiple strokes (e.g. from eraser or selection).
 */
export function createDeleteStrokesCommand(
  strokesList: Stroke[],
  deletedStrokes: { stroke: Stroke; index: number }[],
  onUpdate: () => void
): Command {
  return {
    name: 'Delete Strokes',
    execute: () => {
      const idsToDelete = new Set(deletedStrokes.map((d) => d.stroke.id));
      for (let i = strokesList.length - 1; i >= 0; i--) {
        if (idsToDelete.has(strokesList[i].id)) {
          strokesList.splice(i, 1);
        }
      }
      onUpdate();
    },
    undo: () => {
      const sorted = [...deletedStrokes].sort((a, b) => a.index - b.index);
      for (const item of sorted) {
        if (item.index <= strokesList.length) {
          strokesList.splice(item.index, 0, item.stroke);
        } else {
          strokesList.push(item.stroke);
        }
      }
      onUpdate();
    },
  };
}

/**
 * Creates a command for updating strokes (e.g. move, resize, change color/width).
 */
export function createUpdateStrokesCommand(
  strokesList: Stroke[],
  beforeStrokes: Stroke[],
  afterStrokes: Stroke[],
  onUpdate: () => void
): Command {
  return {
    name: 'Update Strokes',
    execute: () => {
      const afterMap = new Map(afterStrokes.map((s) => [s.id, s]));
      for (let i = 0; i < strokesList.length; i++) {
        if (afterMap.has(strokesList[i].id)) {
          strokesList[i] = afterMap.get(strokesList[i].id)!;
        }
      }
      onUpdate();
    },
    undo: () => {
      const beforeMap = new Map(beforeStrokes.map((s) => [s.id, s]));
      for (let i = 0; i < strokesList.length; i++) {
        if (beforeMap.has(strokesList[i].id)) {
          strokesList[i] = beforeMap.get(strokesList[i].id)!;
        }
      }
      onUpdate();
    },
  };
}

/**
 * Creates a command for replacing strokes (e.g. splitting or partially erasing strokes).
 * Removes old strokes and inserts new sub-strokes in their place.
 */
export function createReplaceStrokesCommand(
  strokesList: Stroke[],
  removedStrokes: { stroke: Stroke; index: number }[],
  insertedStrokes: Stroke[],
  onUpdate: () => void
): Command {
  return {
    name: 'Erase / Split Strokes',
    execute: () => {
      const removedIds = new Set(removedStrokes.map((r) => r.stroke.id));
      const remaining = strokesList.filter((s) => !removedIds.has(s.id));
      strokesList.length = 0;
      strokesList.push(...remaining, ...insertedStrokes);
      onUpdate();
    },
    undo: () => {
      const insertedIds = new Set(insertedStrokes.map((s) => s.id));
      const remaining = strokesList.filter((s) => !insertedIds.has(s.id));
      strokesList.length = 0;
      strokesList.push(...remaining);
      // Reinsert removed strokes sorted by original index
      const sorted = [...removedStrokes].sort((a, b) => a.index - b.index);
      for (const item of sorted) {
        if (item.index <= strokesList.length) {
          strokesList.splice(item.index, 0, item.stroke);
        } else {
          strokesList.push(item.stroke);
        }
      }
      onUpdate();
    },
  };
}

