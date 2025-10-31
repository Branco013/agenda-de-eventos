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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  reaisParaCentavos,
  centavosParaReais,
  formatarMoeda,
  LOCAIS_EVENTO,
  STATUS_EVENTO,
} from "@shared/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";

interface EventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId?: number;
}

interface Vinho {
  tipoVinho: string;
  quantidade: number;
  valorGarrafa: number;
}

export function EventoDialog({ open, onOpenChange, eventoId }: EventoDialogProps) {
  const utils = trpc.useUtils();
  const isEdit = !!eventoId;

  const [formData, setFormData] = useState({
    clienteId: "",
    menuId: "",
    tipoEvento: "",
    data: "",
    horario: "",
    local: "salao_eventos" as keyof typeof LOCAIS_EVENTO,
    status: "em_analise" as "em_analise" | "confirmado" | "cancelado",
    quantidadePessoas: "",
    valorPorPessoa: "",
    pacoteBebidasAtivo: false,
    valorPacoteBebidas: "50.00",
    observacoes: "",
    lembreteAtivo: true,
  });

  const [vinhos, setVinhos] = useState<Vinho[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [menuSelecionado, setMenuSelecionado] = useState<any>(null);
  const [pratosDosMenu, setPratosDosMenu] = useState<any[]>([]);

  const { data: clientes } = trpc.clientes.listar.useQuery();
  const { data: menus } = trpc.menus.listar.useQuery({ apenasAtivos: true });
  const { data: evento } = trpc.eventos.obter.useQuery(
    { id: eventoId! },
    { enabled: isEdit }
  );

  // Preencher formulário quando carregar dados do evento
  useEffect(() => {
    if (evento && isEdit) {
      setFormData({
        clienteId: evento.clienteId.toString(),
        menuId: evento.menuId.toString(),
        tipoEvento: evento.tipoEvento,
        data: (evento.data as any).split ? (evento.data as unknown as string).split('T')[0] : format(new Date(evento.data), "yyyy-MM-dd"),
        horario: evento.horario,
        local: evento.local as keyof typeof LOCAIS_EVENTO,
        status: evento.status as "em_analise" | "confirmado" | "cancelado",
        quantidadePessoas: evento.quantidadePessoas.toString(),
        valorPorPessoa: centavosParaReais(evento.valorPorPessoaEvento).toFixed(2),
        pacoteBebidasAtivo: evento.pacoteBebidasAtivo,
        valorPacoteBebidas: evento.valorPacoteBebidas
          ? centavosParaReais(evento.valorPacoteBebidas).toFixed(2)
          : "50.00",
        observacoes: evento.observacoes || "",
        lembreteAtivo: evento.lembreteAtivo,
      });
      
      // Carregar dados do cliente
      if (clientes) {
        const cliente = clientes.find(c => c.id === evento.clienteId);
        setClienteSelecionado(cliente);
      }
      
      // Carregar vinhos
      if (evento.vinhos && Array.isArray(evento.vinhos)) {
        setVinhos(evento.vinhos.map((v: any) => ({
          tipoVinho: v.tipoVinho,
          quantidade: v.quantidade,
          valorGarrafa: centavosParaReais(v.valorGarrafa),
        })));
      } else {
        setVinhos([]);
      }
    } else if (!isEdit && open) {
      // Limpar formulário ao abrir para criar novo evento
      resetForm();
    }
  }, [evento, clientes, isEdit, open]);

  // Atualizar valor por pessoa quando selecionar menu
  useEffect(() => {
    if (formData.menuId && menus && !isEdit) {
      const menu = menus.find((m) => m.id === parseInt(formData.menuId));
      if (menu) {
        setFormData((prev) => ({
          ...prev,
          valorPorPessoa: centavosParaReais(menu.valorPadraoPorPessoa).toFixed(2),
        }));
      }
    }
  }, [formData.menuId, menus, isEdit]);

  // Atualizar cliente selecionado
  useEffect(() => {
    if (formData.clienteId && clientes) {
      const cliente = clientes.find(c => c.id === parseInt(formData.clienteId));
      setClienteSelecionado(cliente);
    }
  }, [formData.clienteId, clientes]);

  // Atualizar menu selecionado e carregar pratos
  useEffect(() => {
    if (formData.menuId && menus) {
      const menu = menus.find(m => m.id === parseInt(formData.menuId));
      setMenuSelecionado(menu);
      if (menu && menu.pratos) {
        setPratosDosMenu(menu.pratos);
      }
    }
  }, [formData.menuId, menus]);


  const criarMutation = trpc.eventos.criar.useMutation({
    onSuccess: () => {
      toast.success("Evento criado com sucesso!");
      utils.eventos.listar.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const atualizarMutation = trpc.eventos.atualizar.useMutation({
    onSuccess: () => {
      toast.success("Evento atualizado com sucesso!");
      utils.eventos.listar.invalidate();
      utils.eventos.obter.invalidate({ id: eventoId! });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      clienteId: "",
      menuId: "",
      tipoEvento: "",
      data: "",
      horario: "",
      local: "salao_eventos",
      status: "em_analise",
      quantidadePessoas: "",
      valorPorPessoa: "",
      pacoteBebidasAtivo: false,
      valorPacoteBebidas: "50.00",
      observacoes: "",
      lembreteAtivo: true,
    });
    setVinhos([]);
    setClienteSelecionado(null);
  };

  // Calcular valores com taxa de serviço
  const calcularValores = () => {
    const qtd = parseInt(formData.quantidadePessoas) || 0;
    const valorPorPessoa = parseFloat(formData.valorPorPessoa) || 0;
    const valorBebidas = parseFloat(formData.valorPacoteBebidas) || 0;

    const subtotalMenu = qtd * valorPorPessoa;
    const subtotalBebidas = formData.pacoteBebidasAtivo ? qtd * valorBebidas : 0;
    const subtotalVinhos = vinhos.reduce((total, vinho) => 
      total + (vinho.quantidade * vinho.valorGarrafa), 0
    );
    
    const subtotalSemTaxa = subtotalMenu + subtotalBebidas + subtotalVinhos;
    const taxaServico = subtotalSemTaxa * 0.10; // 10%
    const total = subtotalSemTaxa + taxaServico;

    return {
      subtotalMenu,
      subtotalBebidas,
      subtotalVinhos,
      subtotalSemTaxa,
      taxaServico,
      total,
    };
  };

  const valores = calcularValores();

  const adicionarVinho = () => {
    setVinhos([...vinhos, { tipoVinho: "", quantidade: 1, valorGarrafa: 0 }]);
  };

  const removerVinho = (index: number) => {
    setVinhos(vinhos.filter((_, i) => i !== index));
  };

  const atualizarVinho = (index: number, campo: keyof Vinho, valor: any) => {
    const novosVinhos = [...vinhos];
    novosVinhos[index] = { ...novosVinhos[index], [campo]: valor };
    setVinhos(novosVinhos);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clienteId) {
      toast.error("Selecione um cliente");
      return;
    }

    if (!formData.menuId) {
      toast.error("Selecione um menu");
      return;
    }

    if (!formData.tipoEvento.trim()) {
      toast.error("Tipo de evento é obrigatório");
      return;
    }

    if (!formData.data) {
      toast.error("Data é obrigatória");
      return;
    }

    if (!formData.horario) {
      toast.error("Horário é obrigatório");
      return;
    }

    const qtd = parseInt(formData.quantidadePessoas);
    if (isNaN(qtd) || qtd <= 0) {
      toast.error("Quantidade de pessoas deve ser maior que zero");
      return;
    }

    const valorPorPessoa = parseFloat(formData.valorPorPessoa);
    if (isNaN(valorPorPessoa) || valorPorPessoa <= 0) {
      toast.error("Valor por pessoa deve ser maior que zero");
      return;
    }

    let valorBebidas = 0;
    if (formData.pacoteBebidasAtivo) {
      valorBebidas = parseFloat(formData.valorPacoteBebidas);
      if (isNaN(valorBebidas) || valorBebidas <= 0) {
        toast.error("Valor do pacote de bebidas deve ser maior que zero");
        return;
      }
    }

    // Validar vinhos
    for (const vinho of vinhos) {
      if (!vinho.tipoVinho.trim()) {
        toast.error("Tipo de vinho é obrigatório");
        return;
      }
      if (vinho.quantidade <= 0) {
        toast.error("Quantidade de garrafas deve ser maior que zero");
        return;
      }
      if (vinho.valorGarrafa <= 0) {
        toast.error("Valor da garrafa deve ser maior que zero");
        return;
      }
    }

    const eventoData = {
      clienteId: parseInt(formData.clienteId),
      menuId: parseInt(formData.menuId),
      tipoEvento: formData.tipoEvento,
      data: formData.data,
      horario: formData.horario,
      local: formData.local,
      status: formData.status,
      quantidadePessoas: qtd,
      valorPorPessoaEvento: reaisParaCentavos(valorPorPessoa),
      pacoteBebidasAtivo: formData.pacoteBebidasAtivo,
      valorPacoteBebidas: formData.pacoteBebidasAtivo
        ? reaisParaCentavos(valorBebidas)
        : 5000,
      observacoes: formData.observacoes || undefined,
      lembreteAtivo: formData.lembreteAtivo,
      vinhos: vinhos.map(v => ({
        tipoVinho: v.tipoVinho,
        quantidade: v.quantidade,
        valorGarrafa: reaisParaCentavos(v.valorGarrafa),
      })),
    };

    if (isEdit) {
      atualizarMutation.mutate({
        id: eventoId,
        ...eventoData,
      });
    } else {
      criarMutation.mutate(eventoData);
    }
  };

  const isLoading = criarMutation.isPending || atualizarMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar Evento" : "Novo Evento"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Atualize as informações do evento"
                : "Preencha os dados do novo evento"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Dados do Cliente */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cliente">
                  Cliente <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.clienteId} onValueChange={(value) => setFormData({ ...formData, clienteId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes?.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id.toString()}>
                        {cliente.nomeCompleto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {clienteSelecionado && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Dados do Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-muted-foreground">Telefone:</span>{" "}
                        <span className="font-medium">{clienteSelecionado.telefone}</span>
                      </div>
                      {clienteSelecionado.email && (
                        <div>
                          <span className="text-muted-foreground">E-mail:</span>{" "}
                          <span className="font-medium">{clienteSelecionado.email}</span>
                        </div>
                      )}
                    </div>
                    {clienteSelecionado.endereco && (
                      <div>
                        <span className="text-muted-foreground">Endereço:</span>{" "}
                        <span className="font-medium">{clienteSelecionado.endereco}</span>
                      </div>
                    )}
                    {clienteSelecionado.empresa && (
                      <div>
                        <span className="text-muted-foreground">Empresa:</span>{" "}
                        <span className="font-medium">{clienteSelecionado.empresa}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Dados do Evento */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="menu">
                  Menu <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.menuId} onValueChange={(value) => setFormData({ ...formData, menuId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um menu" />
                  </SelectTrigger>
                  <SelectContent>
                    {menus?.map((menu) => (
                      <SelectItem key={menu.id} value={menu.id.toString()}>
                        {menu.nome} - {formatarMoeda(menu.valorPadraoPorPessoa)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {menuSelecionado && pratosDosMenu.length > 0 && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Pratos do Menu</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm">
                    {pratosDosMenu.map((prato: any) => (
                      <div key={prato.id} className="border-b pb-2 last:border-0">
                        <div className="font-medium text-xs text-muted-foreground uppercase">{prato.etapa}</div>
                        <div className="font-medium mt-1">{prato.nome}</div>
                        {prato.descricao && <div className="text-xs text-muted-foreground mt-1">{prato.descricao}</div>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="tipoEvento">
                    Tipo de Evento <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tipoEvento"
                    value={formData.tipoEvento}
                    onChange={(e) => setFormData({ ...formData, tipoEvento: e.target.value })}
                    placeholder="Jantar Corporativo, Casamento, etc."
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">
                    Status <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_analise">{STATUS_EVENTO.em_analise}</SelectItem>
                      <SelectItem value="confirmado">{STATUS_EVENTO.confirmado}</SelectItem>
                      <SelectItem value="cancelado">{STATUS_EVENTO.cancelado}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="data">
                    Data <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="horario">
                    Horário <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="horario"
                    type="time"
                    value={formData.horario}
                    onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="local">
                    Local <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.local} onValueChange={(value: any) => setFormData({ ...formData, local: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salao_eventos">{LOCAIS_EVENTO.salao_eventos}</SelectItem>
                      <SelectItem value="salao_principal">{LOCAIS_EVENTO.salao_principal}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantidadePessoas">
                    Quantidade de Pessoas <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="quantidadePessoas"
                    type="number"
                    min="1"
                    value={formData.quantidadePessoas}
                    onChange={(e) => setFormData({ ...formData, quantidadePessoas: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="valorPorPessoa">
                    Valor por Pessoa (R$) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="valorPorPessoa"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valorPorPessoa}
                    onChange={(e) => setFormData({ ...formData, valorPorPessoa: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Pacote de Bebidas</Label>
                    <p className="text-sm text-muted-foreground">
                      Incluir pacote de bebidas no evento
                    </p>
                  </div>
                  <Switch
                    checked={formData.pacoteBebidasAtivo}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, pacoteBebidasAtivo: checked })
                    }
                  />
                </div>

                {formData.pacoteBebidasAtivo && (
                  <div className="grid gap-2">
                    <Label htmlFor="valorPacoteBebidas">
                      Valor do Pacote por Pessoa (R$)
                    </Label>
                    <Input
                      id="valorPacoteBebidas"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valorPacoteBebidas}
                      onChange={(e) =>
                        setFormData({ ...formData, valorPacoteBebidas: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Vinhos */}
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <Label>Vinhos do Evento</Label>
                <Button type="button" variant="outline" size="sm" onClick={adicionarVinho}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Vinho
                </Button>
              </div>

              {vinhos.length > 0 && (
                <div className="grid gap-3">
                  {vinhos.map((vinho, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
                          <div className="grid gap-2">
                            <Label htmlFor={`vinho-tipo-${index}`}>Tipo de Vinho</Label>
                            <Input
                              id={`vinho-tipo-${index}`}
                              value={vinho.tipoVinho}
                              onChange={(e) => atualizarVinho(index, "tipoVinho", e.target.value)}
                              placeholder="Ex: Cabernet Sauvignon"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`vinho-qtd-${index}`}>Quantidade</Label>
                            <Input
                              id={`vinho-qtd-${index}`}
                              type="number"
                              min="1"
                              value={vinho.quantidade}
                              onChange={(e) => atualizarVinho(index, "quantidade", parseInt(e.target.value) || 0)}
                              className="w-24"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`vinho-valor-${index}`}>Valor (R$)</Label>
                            <Input
                              id={`vinho-valor-${index}`}
                              type="number"
                              step="0.01"
                              min="0"
                              value={vinho.valorGarrafa}
                              onChange={(e) => atualizarVinho(index, "valorGarrafa", parseFloat(e.target.value) || 0)}
                              className="w-32"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removerVinho(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Estimativa de Valores */}
            <Card className="bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">Estimativa de Valores</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal Menu:</span>
                  <span className="font-medium">{formatarMoeda(reaisParaCentavos(valores.subtotalMenu))}</span>
                </div>
                {formData.pacoteBebidasAtivo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal Bebidas:</span>
                    <span className="font-medium">{formatarMoeda(reaisParaCentavos(valores.subtotalBebidas))}</span>
                  </div>
                )}
                {vinhos.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal Vinhos:</span>
                    <span className="font-medium">{formatarMoeda(reaisParaCentavos(valores.subtotalVinhos))}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Taxa de Serviço (10%):</span>
                  <span className="font-medium">{formatarMoeda(reaisParaCentavos(valores.taxaServico))}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base">
                  <span className="font-semibold">Total Estimado:</span>
                  <span className="font-bold text-primary">{formatarMoeda(reaisParaCentavos(valores.total))}</span>
                </div>
              </CardContent>
            </Card>

            {/* Observações */}
            <div className="grid gap-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações adicionais sobre o evento"
                rows={3}
              />
            </div>

            {/* Lembrete */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Lembrete Automático (D-7)</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar lembrete automático 7 dias antes do evento
                </p>
              </div>
              <Switch
                checked={formData.lembreteAtivo}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, lembreteAtivo: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : isEdit ? "Atualizar" : "Criar Evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

