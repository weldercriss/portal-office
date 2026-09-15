import { ReservaDestinatarios } from '@prisma/client';
import { textoGrupoReserva } from './reserva-telegram.util';

describe('destinatários no texto de grupo da reserva', () => {
  it.each([
    [ReservaDestinatarios.SOLICITANTE, true, false],
    [ReservaDestinatarios.RESPONSAVEL, false, true],
    [ReservaDestinatarios.AMBOS, true, true],
  ])('menciona apenas os escolhidos em %s', (destinatariosNotificacao, mencionaSolicitante, mencionaResponsavel) => {
    const texto = textoGrupoReserva({
      data: new Date('2026-09-10'), horaInicio: '10:00', horaFim: '11:00', titulo: null,
      sala: { nome: 'Sala Azul' }, solicitante: { nome: 'Ana', telegramUsername: 'ana' },
      responsavel: { nome: 'Bia', telegramUsername: 'bia' }, destinatariosNotificacao,
    }, 'RESERVA_SALA_CRIADA', 'Sala reservada');
    expect(texto.includes('@ana')).toBe(mencionaSolicitante);
    expect(texto.includes('@bia')).toBe(mencionaResponsavel);
    expect(texto).toContain('Responsável:');
  });
});
