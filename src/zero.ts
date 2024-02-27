import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteUserWithEmails(emails: string[]) {
  try {
    for (const email of emails) {
      // Obter o ID do usuário com base no e-mail
      const user = await prisma.user.findUnique({
        where: {
          email: email,
        },
      });

      if (user) {
        // Excluir registros relacionados nas tabelas dependentes
        await prisma.bet.deleteMany({ where: { userId: user.userId } });
        await prisma.balanceTrack.deleteMany({
          where: { userId: user.userId },
        });
        await prisma.config.deleteMany({ where: { userId: user.userId } });
        await prisma.credential.deleteMany({ where: { userId: user.userId } });

        // Excluir o usuário
        await prisma.user.delete({
          where: {
            userId: user.userId,
          },
        });
      }
    }
    console.log('Usuários excluídos com sucesso.');
  } catch (error) {
    console.error('Erro ao excluir usuários:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const emails = `wanderson.giga2018@gmail.com
pereiraalisson595@gmail.com
ThiagoMagno.magno22@gmail.com
jhonfellix324@gmail.com
Eduardo.iq@outlook.com
Willianeuclides786@gmail.com
leonardohonorioschimoor@gmail.com
Rogelioalves589@gmail.com
belgawarlen@gmail.com
maicomdouglasatx762@gmail.com
dijalminha21@icloud.com
Wallisonzinho10@gmail.com
eduardo123xxxu@gmail.com
emilia2jansen@gmail.com
ta8694394186@gmail.com
luisgtrabalho@gmail.com
matheus.freirecoelho@hotmail.com
wanderson.giga95@gmail.com
Pjlpesjonathan@gmail.com
Kinhoarp@gmail.com
izaiasds23@gmail.com
amaralbreno618@gmail.com
annapaulaiub13@gmail.com
Rogeliooruoski85@gmail.com
Rogelioalves589@gmail.com
Alvesrogelio871@gmail.com
sidineilimaamaral28@gmail.com
luanacardoso258063@icloud.com
alexpmoreira11@hotmail.com
Yanlucassouza1234@gmail.com
Andersonpa1357@gmail.com
Thiagosilvaopc@gmail.com
`.split('\n');

deleteUserWithEmails(emails);
