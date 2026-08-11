import { redirect } from 'next/navigation';

export default async function ClientPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  redirect(
    `/calendario-editorial?cliente=${id}`
  );
}