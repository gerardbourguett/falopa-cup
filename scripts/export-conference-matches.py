#!/usr/bin/env python3
"""Exporta la matriz editorial completa de partidos GS-F1/F2/F3 a CSV."""

import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR = ROOT / "src/content/conference-league-sudamericana"
GROUPS_PATH = CONTENT_DIR / "2026-groups.json"
CLUBS_PATH = CONTENT_DIR / "2026-clubs.json"
F3_TODO_PATH = ROOT / "docs/conference-f3-results-template.csv"
OUTPUT_PATH = ROOT / "docs/conference-all-group-matches.csv"

FIELDS = [
    "data_status", "round_id", "group", "club_id", "club_name", "counted",
    "source_match_id", "source_date", "source_competition_type", "source_competition",
    "home_club", "away_club", "goals_for", "goals_against", "is_home",
    "yellow_cards", "red_cards", "base_points", "bonus_points", "penalty_points",
    "fantasy_total", "fantasy_explanation", "source_url", "notes",
]


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def bool_text(value):
    if value is None or value == "":
        return ""
    return "true" if value is True or str(value).lower() == "true" else "false"


def main():
    groups_doc = load_json(GROUPS_PATH)
    clubs_doc = load_json(CLUBS_PATH)
    club_names = {seed["clubId"]: seed["name"] for seed in clubs_doc["seeds"]}
    group_by_club = {
        club_id: group["group"]
        for group in groups_doc["groups"]
        for club_id in group["clubIds"]
    }
    club_order = {
        club_id: (group_index, club_index)
        for group_index, group in enumerate(groups_doc["groups"])
        for club_index, club_id in enumerate(group["clubIds"])
    }

    f3_todos = defaultdict(list)
    with F3_TODO_PATH.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            f3_todos[row["club_id"]].append(row)

    rows = []
    round_order = {"GS-F1": 0, "GS-F2": 1, "GS-F3": 2}

    for round_window in groups_doc["roundWindows"]:
        round_id = round_window["roundId"]
        scores = {score["sourceMatchId"]: score for score in round_window["fantasyScores"]}
        loaded_by_club = defaultdict(list)
        for match in round_window["windowMatchSources"]:
            loaded_by_club[match["clubId"]].append(match)

        no_second = {
            item["clubId"]: item
            for item in round_window.get("clubsWithoutSecondMatch", [])
        }

        for group in groups_doc["groups"]:
            for club_id in group["clubIds"]:
                loaded = sorted(
                    loaded_by_club[club_id],
                    key=lambda match: (match.get("sourceDate", ""), match["id"]),
                )
                for match in loaded:
                    score = scores.get(match["id"], {})
                    rows.append({
                        "data_status": "loaded",
                        "round_id": round_id,
                        "group": group["group"],
                        "club_id": club_id,
                        "club_name": club_names.get(club_id, club_id),
                        "counted": bool_text(match.get("counted")),
                        "source_match_id": match["id"],
                        "source_date": match.get("sourceDate", ""),
                        "source_competition_type": match.get("sourceCompetitionType", ""),
                        "source_competition": match.get("sourceCompetition", ""),
                        "home_club": match.get("homeClub", ""),
                        "away_club": match.get("awayClub", ""),
                        "goals_for": match.get("goalsFor", ""),
                        "goals_against": match.get("goalsAgainst", ""),
                        "is_home": bool_text(match.get("isHome")),
                        "yellow_cards": match.get("yellowCards", ""),
                        "red_cards": match.get("redCards", ""),
                        "base_points": score.get("basePoints", ""),
                        "bonus_points": score.get("bonusPoints", ""),
                        "penalty_points": score.get("penaltyPoints", ""),
                        "fantasy_total": score.get("total", ""),
                        "fantasy_explanation": score.get("explanation", ""),
                        "source_url": match.get("sourceUrl", ""),
                        "notes": "",
                    })

                missing_count = max(0, 2 - len(loaded))
                if not missing_count:
                    continue

                if round_id == "GS-F2" and club_id in no_second:
                    item = no_second[club_id]
                    rows.append({
                        "data_status": "todo",
                        "round_id": round_id,
                        "group": group["group"],
                        "club_id": club_id,
                        "club_name": club_names.get(club_id, club_id),
                        "counted": "false",
                        "source_url": item.get("sourceUrl", ""),
                        "notes": f"Excepción Venezuela: {item['reason']}",
                    })
                elif round_id == "GS-F3":
                    for todo in f3_todos[club_id][:missing_count]:
                        rows.append({
                            "data_status": "todo",
                            "round_id": round_id,
                            "group": group["group"],
                            "club_id": club_id,
                            "club_name": club_names.get(club_id, club_id),
                            "counted": bool_text(todo["counted"]),
                            "source_url": todo["source_url"],
                            "notes": " · ".join(filter(None, [todo["matchup_reference"], todo["notes"]])),
                        })

    rows.sort(key=lambda row: (
        round_order[row["round_id"]],
        *club_order[row["club_id"]],
        0 if row["counted"] == "true" else 1,
        row.get("source_date", ""),
    ))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    per_round = {
        round_id: sum(row["round_id"] == round_id for row in rows)
        for round_id in round_order
    }
    todos = sum(row["data_status"] == "todo" for row in rows)
    print(f"Exported {len(rows)} rows to {OUTPUT_PATH.relative_to(ROOT)}")
    print(f"Per round: {per_round}; TODO rows: {todos}")


if __name__ == "__main__":
    main()
