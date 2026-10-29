"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ListTodo, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/tasks", label: "任务", icon: ListTodo },
  { href: "/meetings", label: "会议", icon: CalendarDays },
  { href: "/members", label: "成员", icon: Users },
];

/** 纯展示的导航，activePath 为空时不高亮任何一项（用作加载时的占位） */
export function NavLinks({ activePath = "" }: { activePath?: string }) {
  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = activePath.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** 根据当前网址高亮对应的导航项 */
export function ActiveNavLinks() {
  const pathname = usePathname();
  return <NavLinks activePath={pathname} />;
}
