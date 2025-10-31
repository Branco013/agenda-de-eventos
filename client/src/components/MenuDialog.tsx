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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { reaisParaCentavos, centavosParaReais, ETAPAS_PRATOS } from "@shared/constants";
import { Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuId?: number;
}

interface Prato {
  id?: number;
  nome: string;
  descricao: string;
  etapa: keyof typeof ETAPAS_PRATOS;
  ordem: number;
}

export function MenuDialog({ open, onOpenChange, menuId }: MenuDialogProps) {
  const utils = trpc.useUtils();
  const isEdit = !!menuId;

  const [formData, setFormData] = useState({
    nome: "",
    valorPadraoPorPessoa: "",
    descricao: "",
    ativo: true,
  });

  const [pratos, setPratos] = useState<Prato[]>([]);

  // Buscar dados do menu se for edição
  const { data: menu } = trpc.menus.obter.useQuery({ id: menuId! }, { enabled: isEdit });
  const { data: pratosExistentes } = trpc.pratos.listarPorMenu.useQuery(
    { menuId: menuId! },
    { enabled: isEdit }
  );

  useEffect(() => {
    if (menu && isEdit) {
      setFormData({
        nome: menu.nome,
        valorPadraoPorPessoa: centavosParaReais(menu.valorPadraoPorPessoa).toFixed(2),
        descricao: menu.descricao || "",
        ativo: menu.ativo,
      });
    } else if (!isEdit && open) {
      resetForm();
    }
  }, [menu, isEdit, open]);

  useEffect(() => {
    if (pratosExistentes && isEdit) {
      setPratos(
        pratosExistentes.map((p) => ({
          id: p.id,
          nome: p.nome,
          descricao: p.descricao || "",
          etapa: p.etapa as keyof typeof ETAPAS_PRATOS,
          ordem: p.ordem,
        }))
      );
    } else if (!isEdit && open) {
      setPratos([]);
    }
  }, [pratosExistentes, isEdit, open]);

  const criarMutation = trpc.menus.criar.useMutation({
    onSuccess: () => {
      toast.success("Menu criado com sucesso!");
      utils.menus.listar.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const atualizarMutation = trpc.menus.atualizar.useMutation({
    onSuccess: () => {
      toast.success("Menu atualizado com sucesso!");
      utils.menus.listar.invalidate();
      utils.menus.obter.invalidate({ id: menuId! });
      utils.pratos.listarPorMenu.invalidate({ menuId: menuId! });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      valorPadraoPorPessoa: "",
      descricao: "",
      ativo: true,
    });
    setPratos([]);
  };

  const handleAddPrato = () => {
    setPratos([
      ...pratos,
      {
        nome: "",
        descricao: "",
        etapa: "entrada",
        ordem: pratos.length + 1,
      },
    ]);
  };

  const handleRemovePrato = (index: number) => {
    setPratos(pratos.filter((_, i) => i !== index));
  };

  const handlePratoChange = (index: number, field: keyof Prato, value: any) => {
    const newPratos = [...pratos];
    newPratos[index] = { ...newPratos[index], [field]: value };
    setPratos(newPratos);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error("Nome do menu é obrigatório");
      return;
    }

    const valor = parseFloat(formData.valorPadraoPorPessoa);
    if (isNaN(valor) || valor <= 0) {
      toast.error("Valor por pessoa deve ser maior que zero");
      return;
    }

    const menuData = {
      nome: formData.nome,
      valorPadraoPorPessoa: reaisParaCentavos(valor),
      descricao: formData.descricao || undefined,
      ativo: formData.ativo,
    };

    if (isEdit) {
      atualizarMutation.mutate({
        id: menuId,
        ...menuData,
      });
    } else {
      criarMutation.mutate(menuData);
    }

    // TODO: Implementar criação/atualização de pratos
  };

  const isLoading = criarMutation.isPending || atualizarMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar Menu" : "Novo Menu"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Atualize as informações do menu" : "Preencha os dados do novo menu"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">
                Nome do Menu <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Menu Executivo"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="valor">
                Valor por Pessoa (R$) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={formData.valorPadraoPorPessoa}
                onChange={(e) =>
                  setFormData({ ...formData, valorPadraoPorPessoa: e.target.value })
                }
                placeholder="85.00"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do menu"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label htmlFor="ativo">Menu ativo</Label>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base">Pratos do Menu</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddPrato}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Prato
                </Button>
              </div>

              <div className="space-y-4">
                {pratos.map((prato, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium">Prato {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePrato(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label>Nome do Prato</Label>
                        <Input
                          value={prato.nome}
                          onChange={(e) => handlePratoChange(index, "nome", e.target.value)}
                          placeholder="Nome do prato"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Etapa</Label>
                        <Select
                          value={prato.etapa}
                          onValueChange={(value) => handlePratoChange(index, "etapa", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ETAPAS_PRATOS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Descrição</Label>
                        <Textarea
                          value={prato.descricao}
                          onChange={(e) =>
                            handlePratoChange(index, "descricao", e.target.value)
                          }
                          placeholder="Descrição do prato"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {pratos.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum prato adicionado. Clique em "Adicionar Prato" para começar.
                  </p>
                )}
              </div>
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

