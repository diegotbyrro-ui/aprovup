'use server';

import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/userAccess';
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from '@/lib/googleCalendar';

type Decision = 'confirm' | 'cancel';

export async function executeSecretaryPendingAction({
  agencyId, userId, actionId, decision, channel, authorName,
}: {
  agencyId: string;
  userId: string;
  actionId: string;
  decision: Decision;
  channel: 'WEB' | 'WHATSAPP';
  authorName?: string | null;
}) {
  const user = await prisma.user.findFirst({ where: { id: userId, agencyId, status: 'APROVADO' } });
  if (!user || !hasPermission(user, 'secretary.act')) {
    throw new Error('Você não tem permissão para executar ações pela Secretária IA.');
  }

  const pending = await prisma.secretaryPendingAction.findFirst({
    where: { id: actionId, agencyId, userId, status: 'PENDING' },
  });
  if (!pending) throw new Error('Essa ação não está mais disponível.');

  if (decision === 'cancel') {
    await prisma.secretaryPendingAction.update({ where: { id: pending.id }, data: { status: 'CANCELED' } });
    await prisma.historyLog.create({
      data: {
        entityType: 'SECRETARY_ACTION', entityId: pending.id,
        action: 'SECRETARY_ACTION_CANCELED',
        description: 'Ação da Secretária cancelada pelo canal ' + channel + '.',
        authorName: authorName || user.name || user.email || 'Usuário',
      },
    }).catch(() => null);
    return { content: 'Ação cancelada. Nenhum lançamento financeiro ou compromisso foi criado.', htmlLink: null as string | null };
  }

  if (pending.expiresAt && pending.expiresAt < new Date()) {
    await prisma.secretaryPendingAction.update({ where: { id: pending.id }, data: { status: 'EXPIRED' } });
    throw new Error('Essa confirmação expirou. Faça o pedido novamente.');
  }

  // V4.1.105: movimento financeiro da LIV, atomico e idempotente por acao.
  if (pending.type === 'LIV_FINANCE_CREATE') {
    if (user.role !== 'DIRECTOR') {
      throw new Error('Somente a diretoria pode registrar movimentacoes financeiras pela LIV.');
    }
    const data = pending.payload as Record<string, unknown>;
    const type = String(data.kind || '');
    const amountCents = Number(data.amountCents);
    const description = String(data.description || '').trim().slice(0, 240);
    const dueDate = new Date(String(data.dateISO || ''));
    if (!['RECEITA', 'DESPESA'].includes(type) ||
        !Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > 100000000 ||
        description.length < 3 || Number.isNaN(dueDate.getTime())) {
      throw new Error('Lancamento financeiro incompleto. Faca o pedido novamente.');
    }
    const requestedClientId = String(data.clientId || '').trim();
    if (requestedClientId) {
      const client = await prisma.client.findFirst({
        where: { id: requestedClientId, agencyId }, select: { id: true },
      });
      if (!client) throw new Error('Cliente nao localizado nesta agencia.');
    }
    const paid = data.wasPaid === true;
    const entry = await prisma.$transaction(async (tx) => {
      const claimed = await tx.secretaryPendingAction.updateMany({
        where: { id: pending.id, agencyId, userId, status: 'PENDING' },
        data: { status: 'EXECUTED' },
      });
      if (claimed.count !== 1) throw new Error('Esta confirmacao ja foi utilizada. Nenhum novo lancamento criado.');
      const saved = await tx.financeEntry.create({
        data: {
          agencyId, createdByUserId: user.id,
          type, description, amountCents, dueDate,
          clientId: requestedClientId || null,
          category: String(data.category || '').slice(0, 100) || null,
          paymentMethod: String(data.paymentMethod || '').slice(0, 50) || null,
          notes: String(data.notes || '').slice(0, 500) || null,
          status: paid ? 'PAGO' : 'PENDENTE',
          paidAt: paid ? dueDate : null,
          isRecurring: false,
          source: channel === 'WHATSAPP' ? 'LIV_WHATSAPP' : 'LIV_WEB',
        },
      });
      await tx.historyLog.create({
        data: {
          entityType: 'FINANCE_ENTRY', entityId: saved.id,
          action: 'LIV_FINANCE_CREATED',
          description: `LIV registrou ${type} avulsa: ${description}, R$ ${(amountCents / 100).toFixed(2)}. Origem ${channel}. Agencia ${agencyId}.`,
          authorName: authorName || user.name || user.email || 'Diretoria',
        },
      });
      await tx.secretaryPendingAction.update({
        where: { id: pending.id },
        data: { result: { financeEntryId: saved.id, executedChannel: channel } },
      });
      return saved;
    });
    const label = type === 'DESPESA' ? 'Despesa' : 'Receita pontual';
    return {
      content: `✅ ${label} de R$ ${(amountCents / 100).toFixed(2).replace('.', ',')} registrada no Financeiro: ${entry.description}. ${paid ? 'Pagamento confirmado.' : 'Lancamento pendente.'}`,
      htmlLink: 'https://aprovup.com.br/financas?aba=' + (type === 'DESPESA' ? 'despesas' : 'receber'),
    };
  }

  if (!['GOOGLE_CALENDAR_CREATE', 'GOOGLE_CALENDAR_UPDATE'].includes(pending.type)) {
    throw new Error('Tipo de ação não suportado.');
  }

  const payload = pending.payload as unknown as Record<string, unknown>;
  const startDate = new Date(String(payload.startDate || ''));
  const endDate = new Date(String(payload.endDate || ''));
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    throw new Error('As datas do compromisso são inválidas.');
  }

  const title = String(payload.title || 'Compromisso');
  const description = String(payload.description || '');
  const location = String(payload.location || '');
  const isUpdate = pending.type === 'GOOGLE_CALENDAR_UPDATE';

  const event = isUpdate
    ? await updateGoogleCalendarEvent({
        agencyId,
        eventId: String(payload.eventId || ''),
        title, description, location, startDate, endDate,
      })
    : await createGoogleCalendarEvent({ agencyId, title, description, location, startDate, endDate });

  if (!event) throw new Error('O Google Agenda da agência não está conectado.');

  await prisma.$transaction([
    prisma.secretaryPendingAction.update({
      where: { id: pending.id },
      data: {
        status: 'EXECUTED',
        result: { googleEventId: event.id || null, htmlLink: event.htmlLink || null, executedChannel: channel },
      },
    }),
    prisma.historyLog.create({
      data: {
        entityType: 'SECRETARY_ACTION', entityId: pending.id,
        action: isUpdate ? 'SECRETARY_GOOGLE_CALENDAR_UPDATED' : 'SECRETARY_GOOGLE_CALENDAR_CREATED',
        description: (isUpdate ? 'Compromisso alterado' : 'Compromisso criado') +
          ' no Google Agenda pela Secretária IA via ' + channel + ': ' + title + '.',
        authorName: authorName || user.name || user.email || 'Usuário',
      },
    }),
  ]);

  return {
    content: isUpdate ? '✅ Compromisso alterado no Google Agenda.' : '✅ Compromisso criado no Google Agenda.',
    htmlLink: event.htmlLink || null,
  };
}
