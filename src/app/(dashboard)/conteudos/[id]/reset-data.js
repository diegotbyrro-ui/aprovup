async function main() {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
        console.log('Limpando banco de dados...');

        await prisma.historyLog.deleteMany();
        await prisma.approval.deleteMany();
        await prisma.monthlyApproval.deleteMany();
        await prisma.comment.deleteMany();
        await prisma.task.deleteMany();
        await prisma.content.deleteMany();

        await prisma.clientProfileDiagnosis.deleteMany();
        await prisma.clientPersona.deleteMany();
        await prisma.client.deleteMany();

        await prisma.promptTemplate.deleteMany();
        await prisma.user.deleteMany();

        console.log('Banco zerado com sucesso.');
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error('Erro ao limpar banco:', error);
    process.exit(1);
});