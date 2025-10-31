import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { APP_LOGO, APP_TITLE } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "O nome de usuário é obrigatório"),
  password: z.string().min(1, "A senha é obrigatória"),
});

type LoginForm = z.infer<typeof loginSchema>;

const LoginCard = () => {
  const { refresh } = useAuth();
  const loginMutation = trpc.authLocal.login.useMutation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      await loginMutation.mutateAsync(data);
      // Força o re-fetch do usuário logado
      refresh();
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login. Verifique suas credenciais.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
      <div className="flex flex-col items-center gap-6">
        <div className="relative group">
          <div className="relative">
            <img
              src={APP_LOGO}
              alt={APP_TITLE}
              className="h-20 w-20 rounded-xl object-cover shadow"
            />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{APP_TITLE}</h1>
          <p className="text-sm text-muted-foreground">
            Acesse sua conta para continuar
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Usuário</Label>
          <Input
            id="username"
            type="text"
            placeholder="Seu nome de usuário"
            {...register("username")}
            disabled={isSubmitting}
          />
          {errors.username && (
            <p className="text-sm text-destructive">{errors.username.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="Sua senha"
            {...register("password")}
            disabled={isSubmitting}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>
        {error && (
          <div className="text-sm text-center text-destructive p-2 border border-destructive/50 bg-destructive/10 rounded-md">
            {error}
          </div>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full shadow-lg hover:shadow-xl transition-all"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Entrar
        </Button>
      </form>
    </div>
  );
};

export default function AuthPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <LoginCard />
    </div>
  );
}
