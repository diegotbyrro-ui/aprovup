import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/userAccess';
import Link from 'next/link';

export default async function EquipePage() {
  const currentUser =
    await requirePermission(
      'users.manage'
    );

  const users =
    await prisma.user.findMany({
      where: {
        agencyId:
          currentUser.agencyId,
      },

      orderBy: {
        name:
          'asc',
      },
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Equipe</h1>
          <p className="text-slate-500">Gerencie os acessos da agência</p>
        </div>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors font-medium">
          Convidar Membro
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
              <th className="p-4 font-medium">Nome</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Cargo/Papel</th>
              <th className="p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-900">{user.name}</td>
                <td className="p-4 text-slate-600">{user.email}</td>
                <td className="p-4">
                  <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold border border-slate-200">
                    {user.role}
                  </span>
                </td>
                <td className="p-4">
                  <button className="text-blue-600 text-sm font-medium hover:underline">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


