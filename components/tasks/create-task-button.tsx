"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Member } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";

export function CreateTaskButton({ members }: { members: Member[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        新建任务
      </Button>
      <TaskFormDialog open={open} onOpenChange={setOpen} members={members} />
    </>
  );
}
