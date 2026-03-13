#!/usr/bin/env bash
# =============================================================================
# RenderForge Studio — Task Runner
# Orchestrates Claude Code sessions per task, tracks progress in progress.json
#
# Usage:
#   ./scripts/task-runner.sh                  # Resume from next pending task
#   ./scripts/task-runner.sh --all            # Run ALL pending tasks sequentially
#   ./scripts/task-runner.sh --task 03        # Run specific task
#   ./scripts/task-runner.sh --status         # Show progress summary
#   ./scripts/task-runner.sh --reset 05       # Reset a task to pending
#   ./scripts/task-runner.sh --skip 02        # Skip a task
# =============================================================================

set -euo pipefail

# Allow launching Claude from within a Claude session
unset CLAUDECODE 2>/dev/null || true

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TASKS_DIR="$PROJECT_ROOT/docs/tasks"
PROGRESS_FILE="$TASKS_DIR/progress.json"
LOG_DIR="$PROJECT_ROOT/logs/tasks"
PROMPT_DIR="$PROJECT_ROOT/scripts/prompts"

# Ensure directories exist
mkdir -p "$LOG_DIR" "$PROMPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Helpers ─────────────────────────────────────────────────────────────────

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_task()  { echo -e "${CYAN}[TASK]${NC}  $*"; }

# Read a field from progress.json
progress_get() {
    python3 -c "
import json
with open('$PROGRESS_FILE') as f:
    data = json.load(f)
keys = '$1'.split('.')
obj = data
for k in keys:
    if isinstance(obj, dict):
        obj = obj.get(k, '')
    else:
        obj = ''
        break
print(obj if obj is not None else '')
" 2>/dev/null || echo ""
}

# Update progress.json
progress_set() {
    local key_path="$1"
    local value="$2"
    python3 -c "
import json, datetime
with open('$PROGRESS_FILE') as f:
    data = json.load(f)

keys = '$key_path'.split('.')
obj = data
for k in keys[:-1]:
    obj = obj[k]

val = '''$value'''
if val in ('null', 'None', ''):
    obj[keys[-1]] = None
elif val in ('true', 'false'):
    obj[keys[-1]] = val == 'true'
else:
    try:
        obj[keys[-1]] = json.loads(val)
    except:
        obj[keys[-1]] = val

data['last_updated'] = datetime.datetime.now(datetime.timezone.utc).isoformat()

with open('$PROGRESS_FILE', 'w') as f:
    json.dump(data, f, indent=2)
"
}

# Get ordered task IDs
get_task_ids() {
    python3 -c "
import json
with open('$PROGRESS_FILE') as f:
    data = json.load(f)
for tid in sorted(data['tasks'].keys()):
    print(tid)
"
}

get_task_status() {
    progress_get "tasks.$1.status"
}

# Find task file by number (e.g., "03" → "03-renderer-service.md")
find_task_file() {
    ls "$TASKS_DIR"/${1}-*.md 2>/dev/null | head -1
}

# Get task title from file
get_task_title() {
    local file
    file=$(find_task_file "$1")
    if [ -n "$file" ]; then
        head -1 "$file" | sed 's/^# Task [0-9]*: //'
    else
        echo "Task $1"
    fi
}

# ─── Status Display ──────────────────────────────────────────────────────────

show_status() {
    echo ""
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}   RenderForge Studio — Task Progress${NC}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    local total=0 pending=0 running=0 done=0 skipped=0 failed=0

    for tid in $(get_task_ids); do
        local status
        status=$(get_task_status "$tid")
        local title
        title=$(get_task_title "$tid")
        local subtasks_done
        subtasks_done=$(progress_get "tasks.$tid.subtasks_done")
        local subtasks_total
        subtasks_total=$(progress_get "tasks.$tid.subtasks_total")

        total=$((total + 1))

        case "$status" in
            pending)
                echo -e "  ${YELLOW}○${NC}  $tid — $title (${subtasks_done}/${subtasks_total})"
                pending=$((pending + 1))
                ;;
            in_progress)
                echo -e "  ${BLUE}◉${NC}  $tid — $title (${subtasks_done}/${subtasks_total}) ${BLUE}(in progress)${NC}"
                running=$((running + 1))
                ;;
            completed)
                echo -e "  ${GREEN}●${NC}  $tid — $title (${subtasks_done}/${subtasks_total})"
                done=$((done + 1))
                ;;
            skipped)
                echo -e "  ${YELLOW}⊘${NC}  $tid — $title ${YELLOW}(skipped)${NC}"
                skipped=$((skipped + 1))
                ;;
            failed)
                echo -e "  ${RED}✗${NC}  $tid — $title ${RED}(failed)${NC}"
                failed=$((failed + 1))
                ;;
        esac
    done

    echo ""
    echo "───────────────────────────────────────────────────────────────"
    echo -e "  Total: $total  ${GREEN}Done: $done${NC}  ${BLUE}Running: $running${NC}  ${YELLOW}Pending: $pending${NC}  ${RED}Failed: $failed${NC}  Skipped: $skipped"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Find next pending/in_progress task
find_next_task() {
    # First resume any in_progress task
    for tid in $(get_task_ids); do
        if [ "$(get_task_status "$tid")" = "in_progress" ]; then
            echo "$tid"
            return
        fi
    done
    # Then find first pending
    for tid in $(get_task_ids); do
        if [ "$(get_task_status "$tid")" = "pending" ]; then
            echo "$tid"
            return
        fi
    done
}

# ─── Prompt Builder ──────────────────────────────────────────────────────────

build_prompt() {
    local task_id="$1"
    local task_file
    task_file=$(find_task_file "$task_id")
    local task_content
    task_content=$(cat "$task_file")
    local task_title
    task_title=$(get_task_title "$task_id")

    # Load coding standards
    local coding_standards=""
    if [ -f "$TASKS_DIR/coding-standards.md" ]; then
        coding_standards=$(cat "$TASKS_DIR/coding-standards.md")
    fi

    # Get subtask progress
    local subtasks_done
    subtasks_done=$(progress_get "tasks.$task_id.subtasks_done")
    local subtasks_total
    subtasks_total=$(progress_get "tasks.$task_id.subtasks_total")

    cat <<PROMPT_EOF
You are implementing task "$task_title" for the RenderForge Studio platform.

## PROJECT CONTEXT

This is a monorepo TypeScript project for a content automation platform — programmatic video generation, job queuing, asset management, and an admin dashboard.

**Tech Stack:**
- API: Hono (lightweight, edge-ready HTTP framework)
- ORM: Drizzle + PostgreSQL
- Queue: BullMQ + Redis (render job orchestration)
- Renderer: Remotion 4.0.415 (React → Chromium frames → ffmpeg → MP4)
- Storage: MinIO S3-compatible object storage
- Frontend: React 19 + Vite + shadcn/ui + Tailwind CSS
- Validation: Zod
- Deploy: Docker Compose

**Project Root:** /home/redman/renderforge

**Key Directories:**
- apps/api/ — Hono API server (routes, middleware, services)
- apps/admin/ — React admin dashboard (Vite SPA)
- apps/renderer/ — Remotion render worker (BullMQ consumer)
- packages/db/ — Drizzle schema, migrations, seed
- packages/shared/ — Shared types, schemas, constants
- content/ — Content pipeline (audio-sync, scripts, batch render)

**Reference Projects (same developer, reuse patterns from):**
- /home/redman/amt-mobility — Admin layout, auth store, API client, CSS theme (REFERENCE for admin dashboard patterns)
- /home/redman/emiratesauction — Task runner pattern, project structure (REFERENCE for monorepo patterns)

## CODING STANDARDS (MANDATORY)

$coding_standards

## SUBTASK PROGRESS

Subtasks completed: $subtasks_done / $subtasks_total
(If some subtasks are already done, skip them and continue from where you left off)

## TASK SPECIFICATION

$task_content

## INSTRUCTIONS

1. Read the task specification carefully. Implement ALL subtasks listed.
2. For new files: follow the project structure in CLAUDE.md. Use kebab-case filenames.
3. For existing files: read the current code first, then modify.
4. Reference /home/redman/amt-mobility for admin layout, auth store, API client, and CSS theme patterns.
5. Reference /home/redman/emiratesauction for monorepo structure and task runner patterns.
6. Use TypeScript strict mode. No \`any\` types. Validate with Zod.
7. After completing implementation, verify:
   - TypeScript compiles: \`npx tsc --noEmit\` (0 errors)
   - If lint is configured, ensure it passes (0 errors)
   - If either fails, FIX the errors before proceeding
8. After ALL work is done, update docs/tasks/progress.json:
   - Set tasks.${task_id}.status to "completed"
   - Set tasks.${task_id}.subtasks_done to ${subtasks_total}
   - Set tasks.${task_id}.completed_at to current ISO timestamp
9. Create a git commit: "feat(task-${task_id}): ${task_title}"

## ERROR HANDLING POLICY

- NEVER use workarounds or hacks to bypass errors
- NEVER use \`// @ts-ignore\`, \`any\` type, or \`--force\` flags
- If something fails, read the FULL error and fix the root cause
- If blocked, update progress.json with notes and set status to "failed"
- Check docs/tasks/coding-standards.md for conventions before writing code

DO NOT skip any subtask. Implement everything in the spec.
PROMPT_EOF
}

# ─── Run Task ─────────────────────────────────────────────────────────────────

run_task() {
    local task_id="$1"
    local task_file
    task_file=$(find_task_file "$task_id")
    local log_file="$LOG_DIR/${task_id}-$(date +%Y%m%d-%H%M%S).log"
    local prompt_file="$PROMPT_DIR/${task_id}.md"

    if [ -z "$task_file" ]; then
        log_error "Task file not found for: $task_id"
        return 1
    fi

    local task_title
    task_title=$(get_task_title "$task_id")

    log_task "════════════════════════════════════════════════════════"
    log_task "Starting: $task_id — $task_title"
    log_task "════════════════════════════════════════════════════════"

    # Update progress
    progress_set "tasks.$task_id.status" "in_progress"
    progress_set "tasks.$task_id.started_at" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    progress_set "current_task" "$task_id"

    # Build and save prompt
    build_prompt "$task_id" > "$prompt_file"
    log_info "Prompt saved to: $prompt_file"
    log_info "Log file: $log_file"

    # Run claude with the prompt
    log_info "Launching Claude Code session..."
    echo ""

    local exit_code=0
    cat "$prompt_file" | claude -p \
        --dangerously-skip-permissions \
        --verbose \
        2>&1 | tee "$log_file" || exit_code=$?

    echo ""

    if [ $exit_code -ne 0 ]; then
        log_error "Claude session exited with code $exit_code"
        if grep -q "context window" "$log_file" 2>/dev/null || grep -q "too long" "$log_file" 2>/dev/null; then
            log_warn "Possible context window exhaustion. Task will resume on next run."
            progress_set "tasks.$task_id.notes" "Context window exhausted — needs continuation"
        else
            progress_set "tasks.$task_id.status" "failed"
            progress_set "tasks.$task_id.notes" "Exited with code $exit_code — check log: $log_file"
        fi
        return 1
    fi

    # Check if claude marked it as completed
    local final_status
    final_status=$(get_task_status "$task_id")

    if [ "$final_status" = "completed" ]; then
        log_ok "Task $task_id completed successfully!"
    elif [ "$final_status" = "failed" ]; then
        log_error "Task $task_id was marked as failed. Check notes."
        return 1
    else
        log_warn "Task $task_id session ended but status is: $final_status"
        log_warn "Claude may not have finished. Will resume on next run."
    fi

    progress_set "current_task" "null"
    return 0
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
    cd "$PROJECT_ROOT"

    case "${1:-}" in
        --status|-s)
            show_status
            exit 0
            ;;
        --task|-t)
            if [ -z "${2:-}" ]; then
                log_error "Usage: $0 --task <task-number> (e.g., --task 03)"
                exit 1
            fi
            local padded
            padded=$(printf "%02d" "$2" 2>/dev/null || echo "$2")
            run_task "$padded"
            exit $?
            ;;
        --all|-a)
            # Run ALL pending tasks sequentially
            log_info "Running ALL pending tasks sequentially..."
            show_status

            while true; do
                local next
                next=$(find_next_task)
                if [ -z "$next" ]; then
                    log_ok "All tasks complete!"
                    break
                fi

                if ! run_task "$next"; then
                    log_error "Task $next failed. Stopping."
                    log_warn "Fix the issue and re-run, or use --skip $next to skip it."
                    show_status
                    exit 1
                fi

                # Brief pause between tasks
                log_info "Pausing 5s before next task..."
                sleep 5
            done

            show_status
            exit 0
            ;;
        --reset|-r)
            if [ -z "${2:-}" ]; then
                log_error "Usage: $0 --reset <task-number>"
                exit 1
            fi
            local padded
            padded=$(printf "%02d" "$2" 2>/dev/null || echo "$2")
            progress_set "tasks.$padded.status" "pending"
            progress_set "tasks.$padded.subtasks_done" "0"
            progress_set "tasks.$padded.started_at" "null"
            progress_set "tasks.$padded.completed_at" "null"
            log_ok "Reset task: $padded"
            exit 0
            ;;
        --skip)
            if [ -z "${2:-}" ]; then
                log_error "Usage: $0 --skip <task-number>"
                exit 1
            fi
            local padded
            padded=$(printf "%02d" "$2" 2>/dev/null || echo "$2")
            progress_set "tasks.$padded.status" "skipped"
            log_ok "Skipped task: $padded"
            exit 0
            ;;
        --help|-h)
            echo ""
            echo "RenderForge Studio — Task Runner"
            echo ""
            echo "Usage:"
            echo "  $0                    Resume from next pending/in-progress task"
            echo "  $0 --all              Run ALL pending tasks sequentially"
            echo "  $0 --task <N>         Run specific task (e.g., --task 03)"
            echo "  $0 --status           Show progress summary"
            echo "  $0 --reset <N>        Reset a task to pending"
            echo "  $0 --skip <N>         Skip a task"
            echo "  $0 --help             Show this help"
            echo ""
            exit 0
            ;;
        "")
            # Default: find next task and run it
            local next
            next=$(find_next_task)
            if [ -z "$next" ]; then
                log_ok "All tasks are complete!"
                show_status
                exit 0
            fi

            show_status
            log_info "Next task: $next — $(get_task_title "$next")"
            echo ""
            read -p "Start task $next? [Y/n] " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Nn]$ ]]; then
                log_info "Aborted."
                exit 0
            fi

            run_task "$next"
            ;;
        *)
            log_error "Unknown option: $1. Use --help for usage."
            exit 1
            ;;
    esac
}

main "$@"
