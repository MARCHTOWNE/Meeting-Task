import { Suspense } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { ActiveNavLinks, NavLinks } from "@/components/nav-links";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 sm:px-6">
        <Link href="/tasks" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="hidden sm:inline">Meeting Tasks</span>
        </Link>

        {/* usePathname 在动态路由里需要放在 Suspense 中 */}
        <Suspense fallback={<NavLinks />}>
          <ActiveNavLinks />
        </Suspense>

        <div className="ml-auto flex items-center gap-1">
          {/* 读取登录状态，放在 Suspense 里，不阻塞页面其他部分 */}
          <Suspense>
            <UserMenu />
          </Suspense>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
