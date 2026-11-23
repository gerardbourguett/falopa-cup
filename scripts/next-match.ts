#!/usr/bin/env node
/**
 * next-match — Interactive CLI helper for Falopa Cup / Copa Pablo Milad
 *
 * Usage:
 *   pnpm script:next -- --tournament falopa-cup
 *   pnpm script:next -- -t copa-pablo-milad
 *
 * Reads the current title holder from the active or explicitly selected season JSON,
 * guides you through entering the match result,
 * and prints a ready-to-paste JSON entry to stdout.
 */

import { input, select, confirm, number } from '@inquirer/prompts';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { computeNewHolder, getCurrentHolder, getSeasonHolderChain, type ClubData, type MatchEntry } from '../src/lib/tournament.js';
import { seasonChoices, type SeasonFile } from './season-choice.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_TOURNAMENTS = ['falopa-cup', 'copa-pablo-milad'] as const;
type Tournament = (typeof VALID_TOURNAMENTS)[number];

const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), '../..');

// ─── CLI arg parsing ──────────────────────────────────────────────────────────

function parseArgs(): { tournament: Tournament | null } {
  const args = process.argv.slice(2);
  const tIdx = args.findIndex((a) => a === '--tournament' || a === '-t');
  if (tIdx === -1 || !args[tIdx + 1]) return { tournament: null };
  const value = args[tIdx + 1];
  if (!VALID_TOURNAMENTS.includes(value as Tournament)) {
    printUsageAndExit(`Torneo inválido: "${value}". Opciones: ${VALID_TOURNAMENTS.join(', ')}`);
  }
  return { tournament: value as Tournament };
}

function printUsageAndExit(msg?: string): never {
  if (msg) process.stderr.write(`Error: ${msg}\n\n`);
  process.stderr.write(
    `Uso: pnpm script:next -- --tournament <torneo>\n` +
    `Torneos válidos: ${VALID_TOURNAMENTS.join(', ')}\n`
  );
  process.exit(1);
}

// ─── File helpers ─────────────────────────────────────────────────────────────

async function loadSeasons(tournament: Tournament): Promise<SeasonFile[]> {
  const dir = join(PROJECT_ROOT, 'src', 'content', tournament);
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  } catch {
    process.stderr.write(`Error: No se encontró el directorio ${dir}\n`);
    process.exit(1);
  }

  if (files.length === 0) {
    process.stderr.write(`Error: No hay archivos de temporada en ${dir}\n`);
    process.exit(1);
  }

  const seasons: SeasonFile[] = [];
  for (const file of files) {
    const raw = await readFile(join(dir, file), 'utf-8');
    const data = JSON.parse(raw) as { year: number; matches: MatchEntry[]; initialHolderId?: string };
    seasons.push({ ...data, file });
  }

  return seasons;
}

async function loadClubs(): Promise<ClubData[]> {
  const dir = join(PROJECT_ROOT, 'src', 'content', 'clubs');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  const clubs: ClubData[] = [];
  for (const file of files) {
    const raw = await readFile(join(dir, file), 'utf-8');
    clubs.push(JSON.parse(raw) as ClubData);
  }
  return clubs.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function main() {
  let { tournament } = parseArgs();

  // If tournament not provided via flag, prompt for it
  if (!tournament) {
    tournament = await select({
      message: '¿Qué torneo?',
      choices: [
        { name: 'Falopa Cup', value: 'falopa-cup' as Tournament },
        { name: 'Copa Pablo Milad', value: 'copa-pablo-milad' as Tournament },
      ],
    });
  }

  // Load season + holder
  process.stderr.write('Leyendo datos de la temporada...\n');
  const { active, choices } = seasonChoices(await loadSeasons(tournament));
  const season = choices.length === 1 ? active : await select({
    message: '¿Qué temporada deseas registrar?',
    choices: choices.map((entry) => ({
      name: `${entry.year}${entry === active ? ' (actual)' : ' (aún no iniciada)'}`,
      value: entry,
    })),
    default: active,
  });
  const holderResult = getCurrentHolder(season.matches) ?? (season.initialHolderId ? { holderId: season.initialHolderId, match: undefined } : null);

  if (!holderResult) {
    process.stderr.write('Error: No se pudo determinar el poseedor actual.\n');
    process.exit(1);
  }

  // Load clubs
  const clubs = await loadClubs();
  const holderClub = clubs.find((c) => c.id === holderResult.holderId);
  const holderName = holderClub?.name ?? holderResult.holderId;

  const reign = getSeasonHolderChain(season).at(-1);
  const holderMatchDate = reign?.since
    ? new Date(reign.since).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
    : undefined;

  process.stderr.write(`\nPoseedor actual: ${holderName}${holderMatchDate ? ` (desde ${holderMatchDate})` : ' (poseedor inicial)'}\n\n`);

  // ── Prompt for match details ──────────────────────────────────────────────

  const competition = await input({
    message: 'Nombre de la competición:',
    default: 'Liga de Primera · Fecha',
    validate: (v) => v.trim().length > 0 || 'Requerido',
  });

  const dateStr = await input({
    message: 'Fecha del partido (YYYY-MM-DD):',
    validate: (v) => {
      const d = new Date(v);
      return (!isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(v)) || 'Formato inválido (YYYY-MM-DD)';
    },
  });

  const challengerChoices = clubs
    .filter((c) => c.id !== holderResult.holderId)
    .map((c) => ({ name: c.name, value: c.id }));

  const challengerId = await select({
    message: `Rival de ${holderName}:`,
    choices: challengerChoices,
    pageSize: 15,
  });

  const challengerClub = clubs.find((c) => c.id === challengerId);
  const challengerName = challengerClub?.name ?? challengerId;

  const scoreHolder = await number({
    message: `Goles de ${holderName} (local o visitante):`,
    validate: (v) => (v !== undefined && v >= 0) || 'Debe ser 0 o más',
    default: 0,
  }) as number;

  const scoreChallenger = await number({
    message: `Goles de ${challengerName}:`,
    validate: (v) => (v !== undefined && v >= 0) || 'Debe ser 0 o más',
    default: 0,
  }) as number;

  let penaltiesHolder: number | undefined;
  let penaltiesChallenger: number | undefined;
  let hasPenalties = false;

  if (scoreHolder === scoreChallenger) {
    hasPenalties = await confirm({
      message: '¿Hubo penales?',
      default: false,
    });

    if (hasPenalties) {
      penaltiesHolder = await number({
        message: `Penales de ${holderName}:`,
        validate: (v) => (v !== undefined && v >= 0) || 'Debe ser 0 o más',
        default: 0,
      }) as number;

      penaltiesChallenger = await number({
        message: `Penales de ${challengerName}:`,
        validate: (v) => (v !== undefined && v >= 0) || 'Debe ser 0 o más',
        default: 0,
      }) as number;
    }
  }

  // ── Compute result ────────────────────────────────────────────────────────

  const newHolderId = computeNewHolder(
    tournament,
    holderResult.holderId,
    challengerId,
    scoreHolder,
    scoreChallenger,
    penaltiesHolder,
    penaltiesChallenger
  );

  // ── Build JSON entry ──────────────────────────────────────────────────────

  const entry: Record<string, unknown> = {
    type: 'match',
    date: dateStr,
    competition: competition.trim(),
    holderId: holderResult.holderId,
    challengerId,
    scoreHolder,
    scoreChallenger,
    ...(hasPenalties && penaltiesHolder !== undefined && penaltiesChallenger !== undefined
      ? { penalties: { holder: penaltiesHolder, challenger: penaltiesChallenger } }
      : {}),
    newHolderId,
  };

  // ── Output ────────────────────────────────────────────────────────────────

  const titleChanged = newHolderId !== holderResult.holderId;
  const newHolderClub = clubs.find((c) => c.id === newHolderId);
  const newHolderName = newHolderClub?.name ?? newHolderId;

  const resultLine = titleChanged
    ? `⚡ Título cambia de manos → ${newHolderName}`
    : `🛡️  ${holderName} retiene el título`;

  // Print the comment + JSON to stdout (pipeable)
  const seasonFile = `src/content/${tournament}/${season.file}`;
  process.stdout.write(
    `// Agregar a ${seasonFile} → matches[]\n` +
    JSON.stringify(entry, null, 2) +
    '\n'
  );

  // Print summary to stderr
  process.stderr.write(`\n${resultLine}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((err: unknown) => {
  // Handle Ctrl+C gracefully
  if (err instanceof Error && err.message.includes('User force closed')) {
    process.stderr.write('\nCancelado.\n');
    process.exit(0);
  }
  process.stderr.write(`\nError inesperado: ${String(err)}\n`);
  process.exit(1);
});
