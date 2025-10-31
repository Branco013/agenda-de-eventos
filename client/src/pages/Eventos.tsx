import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Calendar as CalendarIcon,
  MapPin,
  Users as UsersIcon,
  DollarSign,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatarMoeda, STATUS_EVENTO, LOCAIS_EVENTO } from "@shared/constants";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EventoDialog } from "@/components/EventoDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function Eventos() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [deletingId, setDeletingId] = useState<number | undefined>();

  const { data: eventos, isLoading } = trpc.eventos.listar.useQuery();
  const { data: clientes } = trpc.clientes.listar.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.eventos.excluir.useMutation({
    onSuccess: () => {
      toast.success("Evento excluído com sucesso!");
      utils.eventos.listar.invalidate();
      setDeletingId(undefined);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (id: number) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingId(undefined);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteMutation.mutate({ id: deletingId });
    }
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
    const cliente = clientes?.find(c => c.id === clienteId);
    return cliente?.nomeCompleto || "Cliente não encontrado";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Eventos</h1>
        </div>
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Eventos</h1>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      {!eventos || eventos.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum evento cadastrado</p>
              <p className="text-sm mt-2">Clique em "Novo Evento" para começar</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {eventos.map((evento) => (
            <Card
              key={evento.id}
              className={`hover:shadow-md transition-shadow ${
                evento.status === "cancelado" ? "opacity-60" : ""
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">
                      {format(new Date(evento.data), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </CardTitle>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      {getClienteNome(evento.clienteId)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{evento.horario}</span>
                      <span className="mx-2">•</span>
                      <MapPin className="h-4 w-4" />
                      <span>{LOCAIS_EVENTO[evento.local]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(evento.status)}>
                      {STATUS_EVENTO[evento.status]}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(evento.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingId(evento.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {evento.quantidadePessoas} pessoa{evento.quantidadePessoas !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {formatarMoeda(evento.totalEvento)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">{evento.tipoEvento}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EventoDialog open={dialogOpen} onOpenChange={setDialogOpen} eventoId={editingId} />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

