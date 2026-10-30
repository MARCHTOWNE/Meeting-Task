import { LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

/** 右上角的当前用户和退出按钮。会读取登录状态，所以在布局里要放进 Suspense */
export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span
        className="hidden max-w-48 truncate text-sm text-muted-foreground md:inline"
        title={user.email ?? undefined}
      >
        {user.email}
      </span>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm" aria-label="退出登录">
          <LogOut />
          <span className="hidden sm:inline">退出</span>
        </Button>
      </form>
    </div>
  );
}
