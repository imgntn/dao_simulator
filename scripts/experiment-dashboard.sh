#!/bin/bash
# Live experiment pipeline dashboard
cd "$(dirname "$0")/.."

make_bar() {
  local pct=$1 width=$2
  local filled=$((pct * width / 100))
  local empty=$((width - filled))
  local bar=""
  for ((i=0; i<filled; i++)); do bar+="█"; done
  for ((i=0; i<empty; i++)); do bar+="░"; done
  echo "$bar"
}

while true; do
  clear
  echo "╔═══════════════════════════════════════════════════════════════════════╗"
  echo "║  DAO SIMULATOR — EXPERIMENT PIPELINE                  $(date '+%H:%M:%S')        ║"
  echo "╠═══════════════════════════════════════════════════════════════════════╣"

  # name:runs:dir_suffix
  experiments=(
    "00:Academic Baseline:100:00-academic-baseline"
    "16:RL Activation:150:16-rl-activation"
    "08:Scale Sweep:500:08-scale-sweep"
    "09:Voting Mechanisms:600:09-voting-mechanisms"
    "02:Ablation Governance:800:02-ablation-governance"
    "03:Sensitivity Quorum:900:03-sensitivity-quorum"
    "05:Proposal Pipeline:900:05-proposal-pipeline"
    "01:Calibration Participation:900:01-calibration-participation"
    "07:Inter-DAO Cooperation:500:07-inter-dao-cooperation"
    "11:Advanced Mechanisms:500:11-advanced-mechanisms"
    "06:Treasury Resilience:1200:06-treasury-resilience"
    "14:Black Swan Resilience:1200:14-black-swan-resilience"
    "13:Cross-DAO Comparison:1680:13-cross-dao-comparison"
    "04:Governance Capture:2700:04-governance-capture"
    "15:Counterfactual Expansion:2940:15-counterfactual-expansion"
    "10:Calibration Validation:14000:10-calibration-validation"
    "12:LLM Agent Reasoning:1000:12-llm-reasoning"
  )

  completed=0
  total_runs=0
  done_runs=0

  for exp in "${experiments[@]}"; do
    IFS=':' read -r num name runs dirsuf <<< "$exp"
    total_runs=$((total_runs + runs))
    dir="results/paper/${dirsuf}"
    log="results/paper/${dirsuf}.log"
    cur=0
    pct_num=0

    if [ "$num" = "12" ]; then
      icon="⏸ "
      label="WAITING (Ollama)"
      color="\033[33m"
    elif [ -f "$dir/summary.json" ] && ([ -f "$dir/status.json" ] && grep -q '"completed"' "$dir/status.json" 2>/dev/null || tail -1 "$log" 2>/dev/null | grep -q "Done!"); then
      icon="✓ "
      label="COMPLETE"
      color="\033[32m"
      completed=$((completed + 1))
      done_runs=$((done_runs + runs))
      cur=$runs
      pct_num=100
    elif [ -f "$log" ]; then
      last=$(tail -1 "$log" 2>/dev/null)
      cur=$(echo "$last" | grep -oP '\((\d+)/\d+\)' | grep -oP '^\(\K\d+' || echo "0")
      tot=$(echo "$last" | grep -oP '\(\d+/(\d+)\)' | grep -oP '/\K\d+' || echo "$runs")
      eta=$(echo "$last" | grep -oP 'ETA: [0-9hms ]+' || echo "")
      if [ "$cur" -gt 0 ] 2>/dev/null; then
        pct_num=$((cur * 100 / tot))
        done_runs=$((done_runs + cur))
        icon="▶ "
        label="RUNNING  ${eta}"
        color="\033[96m"
      else
        icon="▶ "
        label="STARTING..."
        color="\033[96m"
      fi
    else
      icon="○ "
      label="QUEUED"
      color="\033[90m"
    fi

    bar=$(make_bar $pct_num 20)
    printf "║ ${color}%s %-4s %-26s %5s runs [%s] %3d%% %s\033[0m\n" "$icon" "$num" "$name" "$runs" "$bar" "$pct_num" "$label"
  done

  echo "╠═══════════════════════════════════════════════════════════════════════╣"
  if [ $total_runs -gt 0 ]; then
    overall_pct=$((done_runs * 100 / total_runs))
    overall_bar=$(make_bar $overall_pct 40)
    printf "║ \033[1m OVERALL  [%s] %3d%%  %d/%d runs  %d/17 done\033[0m\n" "$overall_bar" "$overall_pct" "$done_runs" "$total_runs" "$completed"
  fi
  echo "╚═══════════════════════════════════════════════════════════════════════╝"

  sleep 10
done
