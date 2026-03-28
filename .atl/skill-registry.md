# Skill Registry — NetAI Studio

Generated: 2026-03-24
Persistence mode: engram

## User Skills (`~/.claude/skills/`)

| Skill Name       | Path                                      | Context / When to use                              |
|------------------|-------------------------------------------|----------------------------------------------------|
| go-testing       | `~/.claude/skills/go-testing/SKILL.md`    | Go tests, Bubbletea TUI testing                    |
| skill-creator    | `~/.claude/skills/skill-creator/SKILL.md` | Creating new AI skills                             |
| sdd-init         | `~/.claude/skills/sdd-init/SKILL.md`      | SDD initialization for a project                  |
| sdd-explore      | `~/.claude/skills/sdd-explore/SKILL.md`   | SDD exploration phase                             |
| sdd-propose      | `~/.claude/skills/sdd-propose/SKILL.md`   | SDD proposal phase                                |
| sdd-spec         | `~/.claude/skills/sdd-spec/SKILL.md`      | SDD specification phase                           |
| sdd-design       | `~/.claude/skills/sdd-design/SKILL.md`    | SDD design phase                                  |
| sdd-tasks        | `~/.claude/skills/sdd-tasks/SKILL.md`     | SDD task breakdown phase                          |
| sdd-apply        | `~/.claude/skills/sdd-apply/SKILL.md`     | SDD apply / implementation phase                  |
| sdd-verify       | `~/.claude/skills/sdd-verify/SKILL.md`    | SDD verification phase                            |
| sdd-archive      | `~/.claude/skills/sdd-archive/SKILL.md`   | SDD archive phase                                 |

## Shared Conventions (`~/.claude/skills/_shared/`)

| File                        | Purpose                                          |
|-----------------------------|--------------------------------------------------|
| `engram-convention.md`      | Engram memory naming and upsert conventions       |
| `persistence-contract.md`   | Artifact persistence contract for SDD phases     |
| `openspec-convention.md`    | OpenSpec file-based artifact conventions         |
| `sdd-phase-common.md`       | Common patterns shared across all SDD phases     |

## Project Skills

None found at project root.

## Notes

- No `CLAUDE.md` found in project root (only global `~/.claude/CLAUDE.md` applies).
- No `agents.md` found in project root.
- SDD artifact store: `engram` (default).
