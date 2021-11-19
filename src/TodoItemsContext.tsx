import { createContext, ReactNode, Reducer, useContext, useEffect, useReducer } from 'react';
import { DraggableLocation, DropResult } from 'react-beautiful-dnd';

export interface TodoItem {
  id: string;
  title: string;
  details?: string;
  done: boolean;
}
export interface TodoItemNew {
  title: string;
  details?: string;
}


interface TodoItemsState {
  todoItems: TodoItem[];
}

interface IData {
  sortedItems?: TodoItem[];
  id?: string;
  dragResult?: DropResult;
  todoItem?: TodoItem;
  todoItems?: TodoItem[];
  todoItemNew?: TodoItemNew
}
interface TodoItemsAction {
  type: 'loadState' | 'add' | 'delete' | 'toggleDone' | 'saveDrop';
  data: IData;
}

const TodoItemsContext = createContext<(TodoItemsState & { dispatch: (action: TodoItemsAction) => void }) | null>(null);

const defaultState: TodoItemsState = { todoItems: [] };
const localStorageKey = 'todoListState';

export const TodoItemsContextProvider = ({ children }: { children?: ReactNode }) => {
  const [state, dispatch] = useReducer<Reducer<TodoItemsState, TodoItemsAction>>(todoItemsReducer, defaultState);

  useEffect(() => {
    const savedState = localStorage.getItem(localStorageKey);
    if (savedState) {
      try {
        dispatch({ type: 'loadState', data: JSON.parse(savedState) });
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(localStorageKey, JSON.stringify(state));
  }, [state]);

  return (
    <TodoItemsContext.Provider value={{ ...(state as TodoItemsState), dispatch }}>{children}</TodoItemsContext.Provider>
  );
};

export const useTodoItems = () => {
  const todoItemsContext = useContext(TodoItemsContext);

  if (!todoItemsContext) {
    throw new Error('useTodoItems hook should only be used inside TodoItemsContextProvider');
  }

  return todoItemsContext;
};

function todoItemsReducer(state: TodoItemsState, action: TodoItemsAction): TodoItemsState {
  switch (action.type) {
    case 'saveDrop': {
      if (
        action.data &&
        action.data.dragResult &&
        (action.data.dragResult as DropResult).destination &&
        action.data.sortedItems
      ) {
        const reorder = (list: TodoItem[], startIndex: number, endIndex: number) => {
          const result = Array.from(list);
          const [removed] = result.splice(startIndex, 1);
          result.splice(endIndex, 0, removed);
          return result;
        };
        action.data.sortedItems = reorder(
          action.data.sortedItems as TodoItem[],
          (action.data.dragResult as DropResult).source.index,
          ((action.data.dragResult as DropResult).destination as DraggableLocation).index
        );
        return { todoItems: [...action.data.sortedItems] };
      }
      return { ...state };
    }
    case 'loadState': {
      return (action.data as TodoItemsState);
    }
    case 'add':
      return {
        ...state,
        todoItems: [{ id: generateId(), done: false, ...action.data.todoItem as TodoItemNew}, ...state.todoItems],
      };
    case 'delete':
      return {
        ...state,
        todoItems: state.todoItems.filter(({ id }) => id !== action.data.id),
      };
    case 'toggleDone':
      const itemIndex = state.todoItems.findIndex(({ id }) => id === action.data.id);
      const item = state.todoItems[itemIndex];
      return {
        ...state,
        todoItems: [
          ...state.todoItems.slice(0, itemIndex),
          { ...item, done: !item.done },
          ...state.todoItems.slice(itemIndex + 1),
        ],
      };
    default:
      throw new Error();
  }
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e16).toString(36)}`;
}
