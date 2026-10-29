"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberDialog } from "@/components/members/member-dialog";

export function AddMemberButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus />
        添加成员
      </Button>
      <MemberDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
