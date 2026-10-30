"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { updateTaskStatus } from "@/app/tasks/actions";
import { STATUSES, STATUS_META } from "@/lib/task-meta";
import type { Member, Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TaskCard } from "@/components/tasks/task-card";

type Props = { tasks: Task[]; members: Member[]; today: string };

export function TaskBoard({ tasks, members, today }: Props) {
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  // 乐观更新：拖动后卡片立刻移到新列，不等服务器返回；如果失败会自动恢复原状
  const [optimisticTasks, moveTask] = useOptimistic(
    tasks,
    (state, { id, status }: { id: string; status: TaskStatus }) =>
      state.map((t) => (t.id === id ? { ...t, status } : t))
  );

  const sensors = useSensors(
    // 移动超过 6px 才算拖拽，避免和点击冲突
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // 键盘拖拽：聚焦手柄后按空格拿起，方向键移动，再按空格放下
    useSensor(KeyboardSensor)
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const id = String(event.active.id);
    const to = event.over?.id as TaskStatus | undefined;
    const task = optimisticTasks.find((t) => t.id === id);
    if (!task || !to || task.status === to) return;

    startTransition(async () => {
      moveTask({ id, status: to });
      const result = await updateTaskStatus(id, to);
      if (result.ok) toast.success(`「${task.title}」→ ${STATUS_META[to].label}`);
      else toast.error(`移动失败：${result.error}`);
    });
  }

  const activeTask = optimisticTasks.find((t) => t.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable: "按空格键拿起任务，用方向键移动到其他列，再按空格键放下，按 Esc 取消。",
        },
        announcements: {
          onDragStart: () => "已拿起任务",
          onDragOver: ({ over }) => (over ? `移动到「${STATUS_META[over.id as TaskStatus].label}」` : "不在任何列上"),
          onDragEnd: ({ over }) => (over ? `已放入「${STATUS_META[over.id as TaskStatus].label}」` : "已放下，状态未改变"),
          onDragCancel: () => "已取消拖拽",
        },
      }}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={optimisticTasks.filter((t) => t.status === status)}
            members={members}
            today={today}
            activeId={activeId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 cursor-grabbing shadow-xl">
            <TaskCard
              task={activeTask}
              today={today}
              members={members}
              compact
              dragHandle={<GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  tasks,
  members,
  today,
  activeId,
}: {
  status: TaskStatus;
  tasks: Task[];
  members: Member[];
  today: string;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <section
      ref={setNodeRef}
      aria-label={`${meta.label}列`}
      className={cn(
        "flex min-h-48 flex-col gap-3 rounded-xl border border-dashed bg-muted/40 p-3 transition-colors",
        isOver && "border-primary/50 bg-primary/5"
      )}
    >
      <header className="flex items-center gap-2 px-1">
        <Icon className={cn("size-4", meta.className)} />
        <h2 className="text-sm font-medium">{meta.label}</h2>
        <span className="rounded-full bg-background px-2 text-xs text-muted-foreground tabular-nums">
          {tasks.length}
        </span>
      </header>

      {tasks.map((t) => (
        <DraggableTask key={t.id} task={t} members={members} today={today} hidden={t.id === activeId} />
      ))}

      {tasks.length === 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground">把任务拖到这里</p>
      )}
    </section>
  );
}

function DraggableTask({
  task,
  members,
  today,
  hidden,
}: {
  task: Task;
  members: Member[];
  today: string;
  hidden: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: task.id });

  return (
    <div ref={setNodeRef} className={cn(hidden && "opacity-30")}>
      <TaskCard
        task={task}
        today={today}
        members={members}
        compact
        dragHandle={
          <button
            type="button"
            className="-ml-1 mt-0.5 cursor-grab rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
            aria-label={`拖动任务「${task.title}」`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  );
}
