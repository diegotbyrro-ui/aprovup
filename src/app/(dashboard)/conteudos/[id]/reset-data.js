/**
 * RESET DE BANCO DESATIVADO
 *
 * Este arquivo existia durante o desenvolvimento inicial do AprovUp
 * e continha uma rotina capaz de apagar dados de producao.
 *
 * A rotina foi permanentemente bloqueada para evitar exclusoes
 * acidentais de dados reais.
 *
 * Este arquivo nao deve:
 * - conectar ao Prisma;
 * - executar operacoes de exclusao;
 * - limpar tabelas;
 * - apagar clientes ou conteudos;
 * - apagar usuarios;
 * - remover arquivos do Storage.
 */

console.error(
  'RESET DE BANCO BLOQUEADO: esta rotina foi desativada para proteger os dados do AprovUp.'
);

process.exitCode = 1;