import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, Save, Mail, Info } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const CONFIG_KEYS = {
  DESTINATARIOS_AGENDA: "destinatarios_agenda_diaria",
  HORARIO_AGENDA: "horario_agenda_diaria",
  ASSUNTO_AGENDA: "assunto_agenda_diaria",
  MENSAGEM_AGENDA: "mensagem_agenda_diaria",
  TEXTO_PROPOSTA: "texto_padrao_proposta",
  TEXTO_ATUALIZACAO: "texto_padrao_atualizacao",
  TEXTO_LEMBRETE: "texto_padrao_lembrete",
};

export default function Configuracoes() {
  const { data: configs, isLoading } = trpc.configuracoes.obterTodas.useQuery();
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    [CONFIG_KEYS.DESTINATARIOS_AGENDA]: "",
    [CONFIG_KEYS.HORARIO_AGENDA]: "08:00",
    [CONFIG_KEYS.ASSUNTO_AGENDA]: "Agenda do Dia - Enoteca Decanter Santos",
    [CONFIG_KEYS.MENSAGEM_AGENDA]: "Segue a agenda de eventos do dia:",
    [CONFIG_KEYS.TEXTO_PROPOSTA]:
      "Prezado(a) cliente,\\n\\nSegue em anexo a proposta para o seu evento.\\n\\nFicamos à disposição para quaisquer esclarecimentos.\\n\\nAtenciosamente,\\nEnoteca Decanter Santos",
    [CONFIG_KEYS.TEXTO_ATUALIZACAO]:
      "Prezado(a) cliente,\\n\\nInformamos que houve uma atualização nos dados do seu evento.\\n\\nSegue em anexo a proposta atualizada.\\n\\nAtenciosamente,\\nEnoteca Decanter Santos",
    [CONFIG_KEYS.TEXTO_LEMBRETE]:
      "Prezado(a) cliente,\\n\\nEste é um lembrete sobre o seu evento que acontecerá em breve.\\n\\nSegue em anexo os detalhes.\\n\\nAtenciosamente,\\nEnoteca Decanter Santos",
  });

  useEffect(() => {
    if (configs) {
      setFormData((prev) => ({
        ...prev,
        ...configs,
      }));
    }
  }, [configs]);

  const salvarMutation = trpc.configuracoes.salvarVarias.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      utils.configuracoes.obterTodas.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    salvarMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Configurações</h1>
        </div>
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <Button onClick={handleSave} disabled={salvarMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {salvarMutation.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Agenda Diária Automática
            </CardTitle>
            <CardDescription>
              Configure o envio automático da agenda diária por e-mail
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="destinatarios">
                Destinatários <span className="text-destructive">*</span>
              </Label>
              <Input
                id="destinatarios"
                type="text"
                value={formData[CONFIG_KEYS.DESTINATARIOS_AGENDA]}
                onChange={(e) =>
                  setFormData({ ...formData, [CONFIG_KEYS.DESTINATARIOS_AGENDA]: e.target.value })
                }
                placeholder="email1@exemplo.com, email2@exemplo.com"
              />
              <p className="text-xs text-muted-foreground">
                Digite os e-mails separados por vírgula
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="horario">Horário de Envio</Label>
              <Input
                id="horario"
                type="time"
                value={formData[CONFIG_KEYS.HORARIO_AGENDA]}
                onChange={(e) =>
                  setFormData({ ...formData, [CONFIG_KEYS.HORARIO_AGENDA]: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assunto">Assunto do E-mail</Label>
              <Input
                id="assunto"
                type="text"
                value={formData[CONFIG_KEYS.ASSUNTO_AGENDA]}
                onChange={(e) =>
                  setFormData({ ...formData, [CONFIG_KEYS.ASSUNTO_AGENDA]: e.target.value })
                }
                placeholder="Agenda do Dia"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mensagem">Mensagem Inicial</Label>
              <Textarea
                id="mensagem"
                value={formData[CONFIG_KEYS.MENSAGEM_AGENDA]}
                onChange={(e) =>
                  setFormData({ ...formData, [CONFIG_KEYS.MENSAGEM_AGENDA]: e.target.value })
                }
                placeholder="Mensagem que aparecerá no início do e-mail"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Textos Padrão de E-mails</CardTitle>
            <CardDescription>
              Personalize os textos dos e-mails enviados aos clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="textoProposta">Texto da Proposta</Label>
              <Textarea
                id="textoProposta"
                value={formData[CONFIG_KEYS.TEXTO_PROPOSTA].replace(/\\n/g, "\n")}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    [CONFIG_KEYS.TEXTO_PROPOSTA]: e.target.value.replace(/\n/g, "\\n"),
                  })
                }
                placeholder="Texto que acompanha o envio da proposta"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Enviado ao criar um novo evento
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="textoAtualizacao">Texto de Atualização</Label>
              <Textarea
                id="textoAtualizacao"
                value={formData[CONFIG_KEYS.TEXTO_ATUALIZACAO].replace(/\\n/g, "\n")}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    [CONFIG_KEYS.TEXTO_ATUALIZACAO]: e.target.value.replace(/\n/g, "\\n"),
                  })
                }
                placeholder="Texto que acompanha o envio de atualização"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Enviado ao editar um evento existente
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="textoLembrete">Texto do Lembrete (D-7)</Label>
              <Textarea
                id="textoLembrete"
                value={formData[CONFIG_KEYS.TEXTO_LEMBRETE].replace(/\\n/g, "\n")}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    [CONFIG_KEYS.TEXTO_LEMBRETE]: e.target.value.replace(/\n/g, "\\n"),
                  })
                }
                placeholder="Texto que acompanha o lembrete automático"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Enviado automaticamente 7 dias antes do evento
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Status do Sistema
            </CardTitle>
            <CardDescription>Informações e status das funcionalidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2">
                <span className="text-sm text-muted-foreground">Versão:</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between items-center p-2">
                <span className="text-sm text-muted-foreground">Banco de Dados:</span>
                <Badge variant="default">Conectado</Badge>
              </div>
              <div className="flex justify-between items-center p-2">
                <span className="text-sm text-muted-foreground">Servidor de E-mail:</span>
                <Badge variant="default">Configurado</Badge>
              </div>
              <div className="flex justify-between items-center p-2">
                <span className="text-sm text-muted-foreground">Geração de PDF:</span>
                <Badge variant="default">Disponível</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

