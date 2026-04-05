#!/usr/bin/env node
import { input, number, select } from '@inquirer/prompts';
import { computeFantasyScore, type OfficialMatchSource } from '../src/lib/tournaments/conference-league-sudamericana';

const COMPETITIONS = [
  { name: 'Liga local', value: 'local-league' as const },
  { name: 'Copa nacional', value: 'local-cup' as const },
  { name: 'CONMEBOL', value: 'conmebol' as const },
];

async function main() {
  const clubId = await input({ message: 'clubId:' });
  const roundId = await input({ message: 'roundId (ej: GS-R2):', default: 'GS-R2' });
  const windowStart = await input({ message: 'windowStart (YYYY-MM-DD):' });
  const windowEnd = await input({ message: 'windowEnd (YYYY-MM-DD):' });

  const sourceDate = await input({ message: 'sourceDate (YYYY-MM-DD):' });
  const sourceCompetitionType = await select({
    message: 'Tipo de competencia:',
    choices: COMPETITIONS,
  });

  const sourceCompetition = await input({ message: 'Nombre competencia real:' });
  const homeClub = await input({ message: 'Nombre club local:' });
  const awayClub = await input({ message: 'Nombre club visitante:' });
  const goalsFor = (await number({ message: 'Goles del club evaluado:', default: 0 })) as number;
  const goalsAgainst = (await number({ message: 'Goles del rival:', default: 0 })) as number;
  const isHomeOption = await select({
    message: '¿El club evaluado fue local?',
    choices: [
      { name: 'Sí', value: true },
      { name: 'No', value: false },
    ],
  });

  const source: OfficialMatchSource = {
    id: `${roundId}-${clubId}-${sourceDate}`,
    clubId,
    roundId,
    windowStart,
    windowEnd,
    sourceCompetitionType,
    sourceCompetition,
    sourceDate,
    homeClub,
    awayClub,
    goalsFor,
    goalsAgainst,
    isHome: isHomeOption,
    counted: true,
  };

  const score = computeFantasyScore(source);
  const fantasyScore = {
    clubId,
    roundId,
    sourceMatchId: source.id,
    basePoints: score.basePoints,
    bonusPoints: score.bonusPoints,
    penaltyPoints: score.penaltyPoints,
    total: score.total,
    explanation: score.explanation,
  };

  process.stdout.write(
    `// Pegá estos bloques en src/content/conference-league-sudamericana/2026-groups.json\n` +
      JSON.stringify({ source, fantasyScore }, null, 2) +
      '\n'
  );
}

main().catch((error) => {
  process.stderr.write(`Error: ${String(error)}\n`);
  process.exit(1);
});
