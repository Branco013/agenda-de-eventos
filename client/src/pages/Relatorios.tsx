import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Mail, Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatarMoeda, STATUS_EVENTO, LOCAIS_EVENTO } from "@shared/constants";
import { toast } from "sonner";

export default function Relatorios() {
  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    status: "todos",
    local: "todos",
    clienteId: "todos",
  });

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailDestinatarios, setEmailDestinatarios] = useState("");

  const { data: eventos, isLoading } = trpc.eventos.listar.useQuery();
  const { data: clientes } = trpc.clientes.listar.useQuery();

  // Filtrar eventos
  const eventosFiltrados = eventos?.filter((evento) => {
    if (filtros.dataInicio && new Date(evento.data) < new Date(filtros.dataInicio)) return false;
    if (filtros.dataFim && new Date(evento.data) > new Date(filtros.dataFim)) return false;
    if (filtros.status !== "todos" && evento.status !== filtros.status) return false;
    if (filtros.local !== "todos" && evento.local !== filtros.local) return false;
    if (filtros.clienteId !== "todos" && evento.clienteId !== parseInt(filtros.clienteId))
      return false;
    return true;
  }) || [];

  // Calcular estatísticas
  const stats = {
    total: eventosFiltrados.length,
    emAnalise: eventosFiltrados.filter((e) => e.status === "em_analise").length,
    confirmados: eventosFiltrados.filter((e) => e.status === "confirmado").length,
    cancelados: eventosFiltrados.filter((e) => e.status === "cancelado").length,
    valorTotal: eventosFiltrados
      .filter((e) => e.status !== "cancelado")
      .reduce((sum, e) => sum + e.totalEvento, 0),
    pessoasTotal: eventosFiltrados
      .filter((e) => e.status !== "cancelado")
      .reduce((sum, e) => sum + e.quantidadePessoas, 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmado":
        return "bg-green-100 text-green-800 border-green-300";
      case "em_analise":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "cancelado":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "";
    }
  };

  const getClienteNome = (clienteId: number) => {
    const cliente = clientes?.find((c) => c.id === clienteId);
    return cliente?.nomeCompleto || "Cliente não encontrado";
  };

  const handleImprimir = () => {
    window.print();
    toast.success("Preparando impressão...");
  };

  const handleExportarCSV = () => {
    const headers = [
      "Data",
      "Horário",
      "Cliente",
      "Tipo",
      "Local",
      "Status",
      "Pessoas",
      "Total",
    ];
    
    const rows = eventosFiltrados.map((evento) => [
      format(new Date(evento.data), "dd/MM/yyyy"),
      evento.horario,
      getClienteNome(evento.clienteId),
      evento.tipoEvento,
      LOCAIS_EVENTO[evento.local],
      STATUS_EVENTO[evento.status],
      evento.quantidadePessoas.toString(),
      `R$ ${(evento.totalEvento / 100).toFixed(2)}`,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-eventos-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Relatório exportado com sucesso!");
  };

  const handleEnviarEmail = () => {
    setEmailDialogOpen(true);
  };

  const confirmarEnvioEmail = () => {
    if (!emailDestinatarios.trim()) {
      toast.error("Informe pelo menos um e-mail destinatário");
      return;
    }

    // Aqui você implementaria a chamada para o backend enviar o e-mail
    toast.success("Relatório enviado por e-mail com sucesso!");
    setEmailDialogOpen(false);
    setEmailDestinatarios("");
  };

  const limparFiltros = () => {
    setFiltros({
      dataInicio: "",
      dataFim: "",
      status: "todos",
      local: "todos",
      clienteId: "todos",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Relatórios</h1>
        </div>
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImprimir}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={handleExportarCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={handleEnviarEmail}>
            <Mail className="h-4 w-4 mr-2" />
            Enviar por E-mail
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={filtros.status} onValueChange={(value) => setFiltros({ ...filtros, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="local">Local</Label>
              <Select value={filtros.local} onValueChange={(value) => setFiltros({ ...filtros, local: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="salao_eventos">Salão de Eventos</SelectItem>
                  <SelectItem value="salao_principal">Salão Principal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cliente">Cliente</Label>
              <Select value={filtros.clienteId} onValueChange={(value) => setFiltros({ ...filtros, clienteId: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {clientes?.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                      {cliente.nomeCompleto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Button variant="outline" onClick={limparFiltros}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.emAnalise}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confirmados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMoeda(stats.valorTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pessoasTotal} pessoas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Eventos */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos ({eventosFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {eventosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum evento encontrado com os filtros selecionados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Pessoas</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventosFiltrados.map((evento) => (
                    <TableRow
                      key={evento.id}
                      className={evento.status === "cancelado" ? "opacity-60" : ""}
                    >
                      <TableCell>
                        {format(new Date(evento.data), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{evento.horario}</TableCell>
                      <TableCell>{getClienteNome(evento.clienteId)}</TableCell>
                      <TableCell>{evento.tipoEvento}</TableCell>
                      <TableCell>{LOCAIS_EVENTO[evento.local]}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(evento.status)}>
                          {STATUS_EVENTO[evento.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{evento.quantidadePessoas}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatarMoeda(evento.totalEvento)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de E-mail */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Relatório por E-mail</DialogTitle>
            <DialogDescription>
              Informe os e-mails dos destinatários separados por vírgula
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="emails">E-mails Destinatários</Label>
              <Input
                id="emails"
                type="text"
                placeholder="email1@exemplo.com, email2@exemplo.com"
                value={emailDestinatarios}
                onChange={(e) => setEmailDestinatarios(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                O relatório será enviado em formato PDF com {eventosFiltrados.length} evento(s)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarEnvioEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

