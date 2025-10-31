import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { IMaskInput } from "react-imask";

interface ClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId?: number;
}

export function ClienteDialog({ open, onOpenChange, clienteId }: ClienteDialogProps) {
  const utils = trpc.useUtils();
  const isEdit = !!clienteId;

  const [formData, setFormData] = useState({
    nomeCompleto: "",
    telefone: "",
    email: "",
    endereco: "",
    empresa: "",
  });

  // Buscar dados do cliente se for edição
  const { data: cliente } = trpc.clientes.obter.useQuery(
    { id: clienteId! },
    { enabled: isEdit }
  );

  // Preencher formulário quando carregar dados
  useEffect(() => {
    if (cliente) {
      setFormData({
        nomeCompleto: cliente.nomeCompleto,
        telefone: cliente.telefone,
        email: cliente.email || "",
        endereco: cliente.endereco || "",
        empresa: cliente.empresa || "",
      });
    } else if (!isEdit && open) {
      resetForm();
    }
  }, [cliente, isEdit, open]);

  const criarMutation = trpc.clientes.criar.useMutation({
    onSuccess: () => {
      toast.success("Cliente criado com sucesso!");
      utils.clientes.listar.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const editarMutation = trpc.clientes.atualizar.useMutation({
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      utils.clientes.listar.invalidate();
      utils.clientes.obter.invalidate({ id: clienteId! });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      nomeCompleto: "",
      telefone: "",
      email: "",
      endereco: "",
      empresa: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nomeCompleto.trim()) {
      toast.error("Nome completo é obrigatório");
      return;
    }

    if (!formData.telefone.trim()) {
      toast.error("Telefone é obrigatório");
      return;
    }

    if (isEdit) {
      editarMutation.mutate({
        id: clienteId,
        ...formData,
        email: formData.email || undefined,
        endereco: formData.endereco || undefined,
        empresa: formData.empresa || undefined,
      });
    } else {
      criarMutation.mutate({
        ...formData,
        email: formData.email || undefined,
        endereco: formData.endereco || undefined,
        empresa: formData.empresa || undefined,
      });
    }
  };

  const isLoading = criarMutation.isPending || editarMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Atualize as informações do cliente"
                : "Preencha os dados do novo cliente"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nomeCompleto">
                Nome Completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nomeCompleto"
                value={formData.nomeCompleto}
                onChange={(e) =>
                  setFormData({ ...formData, nomeCompleto: e.target.value })
                }
                placeholder="João da Silva"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="telefone">
                Telefone <span className="text-destructive">*</span>
              </Label>
              <IMaskInput
                mask="(00) 00000-0000"
                value={formData.telefone}
                onAccept={(value) => setFormData({ ...formData, telefone: value })}
                placeholder="(13) 99999-9999"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="joao@exemplo.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Rua Exemplo, 123"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="empresa">Empresa</Label>
              <Input
                id="empresa"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                placeholder="Empresa LTDA"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : isEdit ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

