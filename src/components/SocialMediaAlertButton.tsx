import { prisma } from '@/lib/prisma';
import { requireAgencyContext } from '@/lib/tenant';
import Link from 'next/link';
import { Bell } from 'lucide-react';

export default async function SocialMediaAlertButton() {
  const {
    agencyId,
  } =
    await requireAgencyContext();

  const count = await prisma.comment.count({
    where: {
      content: {
        client: {
          agencyId,
        },
      },

      OR: [
        {
          message: {
            contains: 'DÚVIDA',
          },
        },
        {
          message: {
            contains: 'DUVIDA',
          },
        },
        {
          message: {
            contains: 'ALTERAÇÃO',
          },
        },
        {
          message: {
            contains: 'ALTERACAO',
          },
        },
        {
          message: {
            contains: 'REAGENDAMENTO',
          },
        },
        {
          message: {
            contains: 'AJUSTE',
          },
        },
      ],
    },
  });

  if (count === 0) {
    return (
      <Link
        href="/social-media/avisos"
        className="fixed right-6 top-6 z-[9999] flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-lg transition hover:bg-slate-50"
        title="Central de avisos"
      >
        <Bell size={20} />
      </Link>
    );
  }

  return (
    <Link
      href="/social-media/avisos"
      className="fixed right-6 top-6 z-[9999] flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg transition hover:bg-red-700"
      title="Central de avisos"
    >
      <Bell size={20} />

      <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-950 px-2 text-xs font-bold text-white">
        {count}
      </span>
    </Link>
  );
}
