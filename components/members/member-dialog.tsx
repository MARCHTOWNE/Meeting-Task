"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createMember, updateMember } from "@/app/members/actions";
import type { Member } from "@/lib/types";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 传入 member 时为编辑模式，否则为新建 */
  member?: Member;
};

export function MemberDialog({ open, onOpenChange, member }: Props) {
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(member);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = member
        ? await updateMember(member.id, formData)
        : await createMember(formData);
      if (result.ok) {
        toast.success(isEdit ? "成员信息已更新" : "成员已添加");
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑成员" : "添加成员"}</DialogTitle>
          <DialogDescription>
            成员可以被指派为任务负责人，AI 提取任务时也会根据姓名自动匹配。
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              name="name"
              placeholder="例如：Alice"
              defaultValue={member?.name}
              required
              maxLength={50}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">邮箱（可选）</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="alice@example.com"
              defaultValue={member?.email ?? ""}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                取消
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {isEdit ? "保存" : "添加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
