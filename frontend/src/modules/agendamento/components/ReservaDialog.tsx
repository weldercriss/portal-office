import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StatusToggle } from '../../../components/ui/StatusToggle';
import { useUpdateUsuario, useUsuarios } from '../../usuarios/hooks/useUsuarios';
import { useCreateReserva, useHorarios, useUpdateReserva } from '../hooks/useAgendamento';
import type { Reserva, ReservaDestinatarios, ReservaStatus, Sala } from '../types/agendamento.types';
import { STATUS_RESERVA } from '../types/agendamento.types';
import { duracaoEmMinutos, formatarDuracao, janelasDoDia, motivoInvalido } from '../utils/horarios';
import { GradeHorarios, type IntervaloSelecionado } from './GradeHorarios';

interface ReservaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salas: Sala[];
  /** Presente edita a reserva; ausente registra uma nova. */
  reserva?: Reserva | null;
  dataPadrao: string;
  salaPadrao?: string;
}

/** O backend guarda o dia em UTC; o input só quer os dez primeiros caracteres. */
function diaDe(iso: string): string {
  return iso.slice(0, 10);
}

export function ReservaDialog({ open, onOpenChange, salas, reserva, dataPadrao, salaPadrao }: ReservaDialogProps) {
  const usuariosQuery = useUsuarios();
  const createMutation = useCreateReserva();
  const updateMutation = useUpdateReserva();
  const updateUsuarioMutation = useUpdateUsuario();

  const [salaId, setSalaId] = useState('');
  const [solicitanteId, setSolicitanteId] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [destinatariosNotificacao, setDestinatariosNotificacao] = useState<ReservaDestinatarios>('SOLICITANTE');
  const [data, setData] = useState(dataPadrao);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [titulo, setTitulo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState<ReservaStatus>('CONFIRMADA');
  const [notificarTelegram, setNotificarTelegram] = useState(true);
  const [telegramUsernames, setTelegramUsernames] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);

  // Reabrir o diálogo recomeça do estado da reserva em edição (ou em branco).
  useEffect(() => {
    if (!open) return;
    setSalaId(reserva?.salaId ?? salaPadrao ?? '');
    setSolicitanteId(reserva?.solicitanteId ?? '');
    setResponsavelId(reserva?.responsavelId ?? '');
    setDestinatariosNotificacao(reserva?.responsavelId ? reserva.destinatariosNotificacao : 'SOLICITANTE');
    setData(reserva ? diaDe(reserva.data) : dataPadrao);
    setHoraInicio(reserva?.horaInicio ?? '');
    setHoraFim(reserva?.horaFim ?? '');
    setTitulo(reserva?.titulo ?? '');
    setObservacoes(reserva?.observacoes ?? '');
    setStatus(reserva?.status ?? 'CONFIRMADA');
    setNotificarTelegram(reserva?.notificarTelegram ?? true);
    setTelegramUsernames({});
    setErro(null);
  }, [open, reserva, dataPadrao, salaPadrao]);

  const horariosQuery = useHorarios(salaId || undefined, data || undefined, reserva?.id);
  const horarios = horariosQuery.data ?? [];
  const salaSelecionada = salas.find((sala) => sala.id === salaId);
  const disponibilidades = salaSelecionada?.disponibilidades ?? [];

  const intervalo: IntervaloSelecionado | null = horaInicio && horaFim ? { horaInicio, horaFim } : null;
  const duracao = intervalo && duracaoEmMinutos(intervalo);
  const problema = intervalo && salaId && data ? motivoInvalido(intervalo, data, disponibilidades, horarios) : null;
  const janelas = salaId && data ? janelasDoDia(disponibilidades, data) : [];

  const usuarios = (usuariosQuery.data ?? []).filter((usuario) => usuario.ativo || usuario.id === solicitanteId);
  const solicitante = usuarios.find((usuario) => usuario.id === solicitanteId);
  const responsaveis = (usuariosQuery.data ?? []).filter((usuario) => usuario.ativo || usuario.id === reserva?.responsavelId);
  const responsavel = responsaveis.find((usuario) => usuario.id === responsavelId);
  const destinatarios = [
    ...(destinatariosNotificacao !== 'RESPONSAVEL' && solicitante ? [{ usuario: solicitante, papel: 'solicitante' }] : []),
    ...(destinatariosNotificacao !== 'SOLICITANTE' && responsavel ? [{ usuario: responsavel, papel: 'responsável' }] : []),
  ].filter((item, index, lista) => lista.findIndex((outro) => outro.usuario.id === item.usuario.id) === index);
  const semTelegram = notificarTelegram ? destinatarios.filter(({ usuario }) => !usuario.telegramUsername) : [];

  function selecionarBloco(bloco: IntervaloSelecionado) {
    setHoraInicio(bloco.horaInicio);
    setHoraFim(bloco.horaFim);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (!intervalo) {
      setErro('Informe o horário inicial e o final.');
      return;
    }
    if (problema) {
      setErro(problema);
      return;
    }

    const input = {
      salaId,
      solicitanteId,
      responsavelId: responsavelId || null,
      destinatariosNotificacao,
      data,
      horaInicio,
      horaFim,
      // Vazio limpa o campo; `undefined` deixaria o valor anterior no lugar.
      titulo: titulo.trim(),
      observacoes: observacoes.trim(),
      status,
      notificarTelegram,
    };

    try {
      // O @usuário digitado aqui vale para o cadastro da pessoa, não só para
      // esta reserva — é de lá que o bot sempre lê para linkar o chat.
      for (const { usuario } of semTelegram) {
        const usernameNovo = telegramUsernames[usuario.id]?.trim();
        if (usernameNovo) {
          await updateUsuarioMutation.mutateAsync({ id: usuario.id, input: { telegramUsername: usernameNovo } });
        }
      }

      if (reserva) {
        await updateMutation.mutateAsync({ id: reserva.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      onOpenChange(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar a reserva.');
    }
  }

  const salvando = createMutation.isPending || updateMutation.isPending || updateUsuarioMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={reserva ? 'Editar reserva' : 'Nova reserva'}
      className="max-w-4xl"
      fitViewport
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Sala" htmlFor="reserva-sala">
            <Select id="reserva-sala" value={salaId} onChange={(e) => setSalaId(e.target.value)} required>
              <option value="">Selecione a sala</option>
              {salas.map((sala) => (
                <option key={sala.id} value={sala.id}>
                  {sala.nome}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Data" htmlFor="reserva-data">
            <Input id="reserva-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </FormField>

          <FormField label="Solicitante" htmlFor="reserva-solicitante">
            <Select
              id="reserva-solicitante"
              value={solicitanteId}
              onChange={(e) => setSolicitanteId(e.target.value)}
              required
            >
              <option value="">Quem pediu a sala</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Responsável (opcional)" htmlFor="reserva-responsavel">
            <Select
              id="reserva-responsavel"
              value={responsavelId}
              onChange={(e) => {
                setResponsavelId(e.target.value);
                if (!e.target.value) setDestinatariosNotificacao('SOLICITANTE');
              }}
            >
              <option value="">Sem responsável</option>
              {reserva?.responsavel && !responsaveis.some((usuario) => usuario.id === reserva.responsavelId) && (
                <option value={reserva.responsavel.id}>{reserva.responsavel.nome} (atual)</option>
              )}
              {responsaveis.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="rounded-card border border-[var(--color-border)] p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex w-32 flex-col gap-1.5">
              <Label htmlFor="reserva-hora-inicio">Início</Label>
              <Input
                id="reserva-hora-inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                required
              />
            </div>
            <div className="flex w-32 flex-col gap-1.5">
              <Label htmlFor="reserva-hora-fim">Fim</Label>
              <Input
                id="reserva-hora-fim"
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                required
              />
            </div>

            <p className="flex-1 pb-2.5 text-xs text-[var(--color-text-muted)]">
              {duracao && duracao > 0 ? (
                <span className="font-bold text-[var(--color-text-secondary)]">Duração: {formatarDuracao(duracao)}. </span>
              ) : null}
              {janelas.length > 0
                ? `A sala abre das ${janelas
                    .map((janela) => `${janela.horaInicio} às ${janela.horaFim}`)
                    .join(' e das ')}. Reserve quantas horas precisar dentro dessa faixa.`
                : 'Escolha a sala e a data para ver o horário comercial.'}
            </p>
          </div>

          <div className="mt-4">
            {!salaId || !data ? null : horariosQuery.isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : horariosQuery.isError ? (
              <p className="text-sm text-[var(--color-danger)]">Não foi possível carregar os horários.</p>
            ) : horarios.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                {salaSelecionada?.nome ?? 'A sala'} não abre nesse dia da semana.
              </p>
            ) : (
              <>
                <p className="pb-2 text-xs text-[var(--color-text-muted)]">
                  Atalho: clique num bloco livre e depois num posterior para emendar. Riscado já está reservado.
                </p>
                <GradeHorarios data={data} horarios={horarios} selecionado={intervalo} onSelecionar={selecionarBloco} />
              </>
            )}
          </div>

          {problema && <p className="mt-3 text-xs text-[var(--color-danger)]">{problema}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Assunto" htmlFor="reserva-titulo">
            <Input
              id="reserva-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Reunião de planejamento"
              maxLength={120}
            />
          </FormField>

          <FormField label="Observações" htmlFor="reserva-observacoes">
            <Input
              id="reserva-observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              maxLength={500}
            />
          </FormField>

          <FormField label="Status" htmlFor="reserva-status">
            {/* Cancelar tem caminho próprio, que registra o motivo. */}
            <Select id="reserva-status" value={status} onChange={(e) => setStatus(e.target.value as ReservaStatus)}>
              {STATUS_RESERVA.filter((opcao) => opcao.value !== 'CANCELADA' || status === 'CANCELADA').map((opcao) => (
                <option key={opcao.value} value={opcao.value}>
                  {opcao.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label="Enviar notificações para" htmlFor="reserva-destinatarios">
          <Select
            id="reserva-destinatarios"
            value={destinatariosNotificacao}
            onChange={(e) => setDestinatariosNotificacao(e.target.value as ReservaDestinatarios)}
          >
            <option value="SOLICITANTE">Somente solicitante</option>
            <option value="RESPONSAVEL" disabled={!responsavelId}>Somente responsável</option>
            <option value="AMBOS" disabled={!responsavelId}>Solicitante e responsável</option>
          </Select>
        </FormField>

        <div className="flex flex-wrap items-center gap-3">
          <StatusToggle checked={notificarTelegram} onChange={setNotificarTelegram} label="Notificar por Telegram" />
          <p className="max-w-sm text-[13px] text-[var(--color-text-muted)]">
            Avisa {destinatarios.map(({ usuario }) => usuario.nome).join(' e ') || 'os destinatários selecionados'} pelo bot
            na criação, alteração, confirmação, cancelamento e 30 minutos antes do início e do fim.
          </p>
        </div>

        {semTelegram.length > 0 && (
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            {semTelegram.map(({ usuario, papel }) => (
              <FormField
                key={usuario.id}
                label={`@usuário do Telegram do ${papel}`}
                htmlFor={`reserva-telegram-${usuario.id}`}
                hint={
                  telegramUsernames[usuario.id]?.trim()
                    ? 'Salvo no cadastro dele ao confirmar.'
                    : 'Ele ainda não tem @usuário cadastrado — sem isso o bot não sabe pra quem escrever. Pode deixar em branco e seguir sem o aviso.'
                }
              >
                <Input
                  id={`reserva-telegram-${usuario.id}`}
                  value={telegramUsernames[usuario.id] ?? ''}
                  onChange={(e) => setTelegramUsernames((atual) => ({ ...atual, [usuario.id]: e.target.value }))}
                  placeholder="@usuario"
                  maxLength={80}
                />
              </FormField>
            ))}
          </div>
        )}

        {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}

        <FormActions>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando || !!problema}>
            {salvando ? 'Salvando...' : 'Salvar reserva'}
          </Button>
        </FormActions>
      </form>
    </Dialog>
  );
}
