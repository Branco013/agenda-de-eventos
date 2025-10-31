import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, UtensilsCrossed, Pencil, Trash2 } from "lucide-react";
import { formatarMoeda } from "@shared/constants";
import { MenuDialog } from "@/components/MenuDialog";
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

export default function Menus() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [deletingId, setDeletingId] = useState<number | undefined>();
  
  const { data: menus, isLoading } = trpc.menus.listar.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.menus.excluir.useMutation({
    onSuccess: () => {
      toast.success("Menu excluído com sucesso!");
      utils.menus.listar.invalidate();
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Menus</h1>
        </div>
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Menus</h1>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Menu
        </Button>
      </div>

      {!menus || menus.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum menu cadastrado</p>
              <p className="text-sm mt-2">Clique em "Novo Menu" para começar</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => (
            <Card key={menu.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{menu.nome}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={menu.ativo ? "default" : "secondary"}>
                      {menu.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(menu.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingId(menu.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-primary">
                    {formatarMoeda(menu.valorPadraoPorPessoa)}
                  </div>
                  <p className="text-sm text-muted-foreground">por pessoa</p>
                  {menu.descricao && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {menu.descricao}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MenuDialog open={dialogOpen} onOpenChange={setDialogOpen} menuId={editingId} />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este menu? Esta ação não pode ser desfeita.
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

