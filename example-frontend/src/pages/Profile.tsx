import { Link } from "react-router-dom";
import { User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Profile() {
  return (
    <div className="container mx-auto flex flex-col items-center px-4 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <User className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="font-heading text-2xl text-foreground">Профиль</h1>
      <p className="mt-1 text-muted-foreground">Войдите, чтобы увидеть свой профиль</p>
      <Link to="/login" className="mt-6">
        <Button className="gap-2">
          <LogIn className="h-4 w-4" />
          Войти
        </Button>
      </Link>
    </div>
  );
}
