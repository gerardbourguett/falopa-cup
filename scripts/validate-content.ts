#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateConferenceIntegrity,
  validateTournamentIntegrity,
  validateQuarterfinalIntegrity,
  type QuarterfinalWindowDocument,
  type KnockoutDocument,
  type ConferenceClubsDocument,
  type ConferenceGroupsDocument,
  type ConferenceStageDocument,
  type ConferenceWindowCutDocument,
  type TournamentFileInput,
} from '../src/lib/validation/content-integrity';

const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), '../..');

type JsonObject = Record<string, unknown>;

async function readJson(fullPath: string): Promise<JsonObject> {
  const raw = await readFile(fullPath, 'utf-8');
  return JSON.parse(raw) as JsonObject;
}

async function loadClubIds(): Promise<Set<string>> {
  const clubsDir = join(PROJECT_ROOT, 'src', 'content', 'clubs');
  const clubFiles = (await readdir(clubsDir)).filter((file) => file.endsWith('.json'));
  const ids = new Set<string>();

  for (const file of clubFiles) {
    const json = await readJson(join(clubsDir, file));
    if (typeof json.id === 'string') ids.add(json.id);
  }

  return ids;
}

async function loadTournamentFiles(tournament: 'falopa-cup' | 'copa-pablo-milad'): Promise<TournamentFileInput[]> {
  const dir = join(PROJECT_ROOT, 'src', 'content', tournament);
  const files = (await readdir(dir)).filter((file) => file.endsWith('.json'));

  const result: TournamentFileInput[] = [];

  for (const file of files) {
    const json = await readJson(join(dir, file));
    if (Array.isArray(json.matches)) {
      result.push({
        path: `${tournament}/${file}`,
        matches: json.matches as Array<Record<string, unknown>>,
      });
    }
  }

  return result;
}

async function loadConferenceDocuments() {
  const conferenceDir = join(PROJECT_ROOT, 'src', 'content', 'conference-league-sudamericana');
  const files = (await readdir(conferenceDir)).filter((file) => file.endsWith('.json'));

  let clubsDoc: ConferenceClubsDocument | null = null;
  let stageDoc: ConferenceStageDocument | null = null;
  let groupsDoc: ConferenceGroupsDocument | null = null;
  let windowCutDoc: ConferenceWindowCutDocument | null = null;
  let qfWindowDoc: QuarterfinalWindowDocument | null = null;
  let knockoutDoc: KnockoutDocument | null = null;
  let r16Sources: Array<{ sourceUrl?: string }> | null = null;

  for (const file of files) {
    const json = await readJson(join(conferenceDir, file));
    if (json.kind === 'clubs') clubsDoc = json as unknown as ConferenceClubsDocument;
    if (json.kind === 'stage') stageDoc = json as unknown as ConferenceStageDocument;
    if (json.kind === 'groups') groupsDoc = json as unknown as ConferenceGroupsDocument;
    if (json.kind === 'window-cut') windowCutDoc = json as unknown as ConferenceWindowCutDocument;
    if (json.kind === 'qf-window') qfWindowDoc = json as unknown as QuarterfinalWindowDocument;
    if (json.kind === 'knockout') knockoutDoc = json as unknown as KnockoutDocument;
    if (json.kind === 'r16-window') r16Sources = json.matchSources as Array<{ sourceUrl?: string }>;
  }

  return { clubsDoc, stageDoc, groupsDoc, windowCutDoc, qfWindowDoc, knockoutDoc, r16Sources };
}

async function main() {
  const clubIds = await loadClubIds();

  const tournamentFiles = [
    ...(await loadTournamentFiles('falopa-cup')),
    ...(await loadTournamentFiles('copa-pablo-milad')),
  ];

  const issues = validateTournamentIntegrity(tournamentFiles, clubIds);

  const conference = await loadConferenceDocuments();
  if (conference.qfWindowDoc) {
    if (!conference.knockoutDoc || !conference.r16Sources) {
      issues.push('conference/qf-window: Missing knockout or R16 sources.');
    } else {
      issues.push(...validateQuarterfinalIntegrity(conference.qfWindowDoc, conference.knockoutDoc, conference.r16Sources));
    }
  }
  if (!conference.clubsDoc || !conference.stageDoc || !conference.groupsDoc) {
    issues.push('conference: faltan documentos mínimos (clubs/stage/groups) en src/content/conference-league-sudamericana');
  } else {
    issues.push(...validateConferenceIntegrity(conference.clubsDoc, conference.stageDoc, conference.groupsDoc, conference.windowCutDoc));
  }

  if (issues.length > 0) {
    process.stderr.write('❌ Content integrity check failed:\n');
    for (const issue of issues) {
      process.stderr.write(`  - ${issue}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('✅ Content integrity check passed.\n');
}

main().catch((err) => {
  process.stderr.write(`Unexpected error in validate-content: ${String(err)}\n`);
  process.exit(1);
});
