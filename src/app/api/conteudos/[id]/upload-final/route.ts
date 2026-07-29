import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeFileName(name: string) {
  return String(name || 'arquivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

async function saveFile(file: File, prefix: string) {
  if (!file || file.size === 0) return '';

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'final-content');

  await fs.mkdir(uploadsDir, {
    recursive: true,
  });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const originalName = safeFileName(file.name || 'arquivo');
  const extension = path.extname(originalName) || '.bin';
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;

  const filePath = path.join(uploadsDir, fileName);

  await fs.writeFile(filePath, buffer);

  return `/uploads/final-content/${fileName}`;
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const currentUser = await requireCurrentUser();
    const { id } = await context.params;

    const content = await prisma.content.findUnique({
      where: {
        id,
      },
    });

    if (!content) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Conteúdo não encontrado.',
        },
        {
          status: 404,
        }
      );
    }

    const formData = await request.formData();

    const finalFile = formData.get('finalFile') as File | null;
    const coverFile = formData.get('coverFile') as File | null;

    const hasFinalFile = finalFile && finalFile.size > 0;
    const hasCoverFile = coverFile && coverFile.size > 0;

    if (!hasFinalFile && !hasCoverFile) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Envie pelo menos um arquivo.',
        },
        {
          status: 400,
        }
      );
    }

    const finalMediaUrl = hasFinalFile
      ? await saveFile(finalFile, 'material-final')
      : '';

    const coverUrl = hasCoverFile
      ? await saveFile(coverFile, 'capa')
      : '';

    const updateData: any = {
      status: 'ENVIADO_AO_CLIENTE',
      finalUploadedAt: new Date(),
    };

    if (finalMediaUrl) {
      updateData.finalMediaUrl = finalMediaUrl;
      updateData.finalMediaType = finalFile?.type || '';

      if (String(finalFile?.type || '').startsWith('image/') && !coverUrl) {
        updateData.finalCoverUrl = finalMediaUrl;
      }
    }

    if (coverUrl) {
      updateData.finalCoverUrl = coverUrl;
    }

    await prisma.content.update({
      where: {
        id,
      },
      data: updateData,
    });

    await prisma.comment.create({
      data: {
        contentId: id,
        authorName: currentUser.name || currentUser.email || 'Equipe Level UP',
        authorRole: currentUser.role || 'EQUIPE',
        message: 'Material final enviado para aprovação do cliente na Etapa 2.',
      },
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      finalMediaUrl,
      coverUrl,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        message: 'Erro ao enviar arquivo.',
      },
      {
        status: 500,
      }
    );
  }
}
