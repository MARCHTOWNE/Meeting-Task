"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createTask, updateTask } from "@/app/tasks/actions";
import { STATUSES, STATUS_META } from "@/lib/task-meta";
import type { Member, Task } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  /** 传入 task 时为编辑模式，否则为新建 */
  task?: Task;
};

export function TaskFormDialog({ open, onOpenChange, members, task }: Props) {
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(task);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = task ? await updateTask(task.id, formData) : await createTask(formData);
      if (result.ok) {
        toast.success(isEdit ? "任务已更新" : "任务已创建");
        onOpenChange(false);
      } else {
        toast.error(`${isEdit ? "保存" : "创建"}失败：${result.error}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑任务" : "新建任务"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "修改任务内容、负责人、截止日期、优先级或状态。"
              : "手动添加一条任务。也可以在会议页让 AI 从会议记录里自动提取。"}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              name="title"
              placeholder="例如：整理用户访谈结论"
              defaultValue={task?.title}
              maxLength={100}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="可选，补充任务细节"
              defaultValue={task?.description ?? ""}
              maxLength={1000}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>负责人</Label>
              <Select name="assignee_id" defaultValue={task?.assignee_id ?? "none"}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未分配</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="due_date">截止日期</Label>
              <Input id="due_date" name="due_date" type="date" defaultValue={task?.due_date ?? ""} />
            </div>

            <div className="grid gap-2">
              <Label>优先级</Label>
              <Select name="priority" defaultValue={task?.priority ?? "medium"}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isEdit && (
              <div className="grid gap-2">
                <Label>状态</Label>
                <Select name="status" defaultValue={task?.status}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                取消
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {isEdit ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
