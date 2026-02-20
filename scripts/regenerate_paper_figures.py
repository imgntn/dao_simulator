"""Regenerate paper figures from current experiment data."""
import csv
import os
import sys

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import numpy as np
except ImportError:
    print("ERROR: matplotlib and numpy required. Install with: pip install matplotlib numpy")
    sys.exit(1)

RESULTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'results', 'paper')
FIGURES_DIR = os.path.join(os.path.dirname(__file__), '..', 'paper', 'figures')

def read_csv(path):
    with open(path, 'r') as f:
        reader = csv.DictReader(f)
        return list(reader)

def fig1_quorum_passrate():
    """Figure 2: Quorum threshold vs pass rate (Experiment 03)."""
    data = read_csv(os.path.join(RESULTS_DIR, '03-sensitivity-quorum', 'stats.csv'))

    quorums = []
    means = []
    ci_lows = []
    ci_highs = []

    for row in data:
        q = float(row['sweep_value'])
        quorums.append(q * 100)  # Convert to percentage
        m = float(row['Proposal Pass Rate_mean'])
        means.append(m)
        ci_lows.append(float(row['Proposal Pass Rate_ci95_lower']))
        ci_highs.append(float(row['Proposal Pass Rate_ci95_upper']))

    fig, ax = plt.subplots(figsize=(8, 5))

    errors_low = [m - cl for m, cl in zip(means, ci_lows)]
    errors_high = [ch - m for m, ch in zip(means, ci_highs)]

    ax.errorbar(quorums, means, yerr=[errors_low, errors_high],
                fmt='o-', color='#2196F3', capsize=4, capthick=1.5,
                markersize=7, linewidth=2, elinewidth=1.5)

    ax.set_xlabel('Quorum Threshold (%)', fontsize=12)
    ax.set_ylabel('Proposal Pass Rate', fontsize=12)
    ax.set_title('Effect of Quorum Threshold on Governance Outcomes', fontsize=13, fontweight='bold')

    ax.set_ylim(0.95, 1.005)
    ax.set_xlim(0, 55)
    ax.grid(True, alpha=0.3)
    ax.tick_params(labelsize=10)

    fig.tight_layout()
    out_path = os.path.join(FIGURES_DIR, 'quorum_passrate.png')
    fig.savefig(out_path, dpi=300, bbox_inches='tight')
    plt.close(fig)
    print(f"  Saved: {out_path}")
    print(f"  Data: quorum={quorums}, pass_rate={[f'{m:.3f}' for m in means]}")


def fig2_scale_participation():
    """Figure 3: DAO size vs participation rate (Experiment 08)."""
    data = read_csv(os.path.join(RESULTS_DIR, '08-scale-sweep', 'stats.csv'))

    sizes = []
    means = []
    ci_lows = []
    ci_highs = []

    for row in data:
        s = int(float(row['sweep_value']))
        sizes.append(s)
        m = float(row['Voter Participation Rate_mean'])
        means.append(m)
        ci_lows.append(float(row['Voter Participation Rate_ci95_lower']))
        ci_highs.append(float(row['Voter Participation Rate_ci95_upper']))

    fig, ax = plt.subplots(figsize=(8, 5))

    errors_low = [m - cl for m, cl in zip(means, ci_lows)]
    errors_high = [ch - m for m, ch in zip(means, ci_highs)]

    ax.errorbar(sizes, means, yerr=[errors_low, errors_high],
                fmt='o-', color='#4CAF50', capsize=4, capthick=1.5,
                markersize=7, linewidth=2, elinewidth=1.5)

    # Add shaded region for CI
    ax.fill_between(sizes, ci_lows, ci_highs, alpha=0.15, color='#4CAF50')

    ax.set_xlabel('Organization Size (members)', fontsize=12)
    ax.set_ylabel('Voter Participation Rate', fontsize=12)
    ax.set_title('Participation Decay with Organizational Scale', fontsize=13, fontweight='bold')

    ax.set_ylim(0.18, 0.30)
    ax.grid(True, alpha=0.3)
    ax.tick_params(labelsize=10)

    fig.tight_layout()
    out_path = os.path.join(FIGURES_DIR, 'scale_participation.png')
    fig.savefig(out_path, dpi=300, bbox_inches='tight')
    plt.close(fig)
    print(f"  Saved: {out_path}")
    print(f"  Data: sizes={sizes}, participation={[f'{m:.3f}' for m in means]}")


def fig3_voting_comparison():
    """Figure 4: Voting mechanism comparison (Experiment 09)."""
    data = read_csv(os.path.join(RESULTS_DIR, '09-voting-mechanisms', 'stats.csv'))

    # Parse configs - group by mechanism, use quorum=0.04 for main comparison
    mechanisms = []
    pass_rates = []
    pass_rate_errs = []
    margins = []
    margin_errs = []
    whale_inf = []
    whale_errs = []
    capture = []
    capture_errs = []
    quorum_reach = []
    quorum_reach_errs = []

    for row in data:
        sv = row['sweep_value']
        mechanisms.append(sv)

        pr_m = float(row['Proposal Pass Rate_mean'])
        pr_se = float(row['Proposal Pass Rate_se'])
        pass_rates.append(pr_m)
        pass_rate_errs.append(pr_se * 1.96)

        mv_m = float(row['Avg Margin of Victory_mean'])
        mv_se = float(row['Avg Margin of Victory_se'])
        margins.append(mv_m)
        margin_errs.append(mv_se * 1.96)

        wi_m = float(row['Whale Influence_mean'])
        wi_se = float(row['Whale Influence_se'])
        whale_inf.append(wi_m)
        whale_errs.append(wi_se * 1.96)

        cr_m = float(row['Governance Capture Risk_mean'])
        cr_se = float(row['Governance Capture Risk_se'])
        capture.append(cr_m)
        capture_errs.append(cr_se * 1.96)

        qr_m = float(row['Quorum Reach Rate_mean'])
        qr_se = float(row['Quorum Reach Rate_se'])
        quorum_reach.append(qr_m)
        quorum_reach_errs.append(qr_se * 1.96)

    # Use only quorum=0.04 rows for cleaner comparison
    labels_04 = []
    pr_04 = []
    pr_err_04 = []
    mv_04 = []
    mv_err_04 = []
    wi_04 = []
    wi_err_04 = []
    qr_04 = []
    qr_err_04 = []

    for i, sv in enumerate(mechanisms):
        if '0.04' in sv:
            label = sv.split('=')[1].split('_')[0].capitalize()
            labels_04.append(label)
            pr_04.append(pass_rates[i])
            pr_err_04.append(pass_rate_errs[i])
            mv_04.append(margins[i])
            mv_err_04.append(margin_errs[i])
            wi_04.append(whale_inf[i])
            wi_err_04.append(whale_errs[i])
            qr_04.append(quorum_reach[i])
            qr_err_04.append(quorum_reach_errs[i])

    fig, axes = plt.subplots(1, 4, figsize=(16, 5))

    x = np.arange(len(labels_04))
    colors = ['#2196F3', '#FF9800', '#4CAF50']

    # Pass Rate
    bars = axes[0].bar(x, pr_04, yerr=pr_err_04, capsize=4, color=colors, alpha=0.85, edgecolor='white')
    axes[0].set_ylabel('Pass Rate', fontsize=11)
    axes[0].set_title('Pass Rate', fontsize=12, fontweight='bold')
    axes[0].set_ylim(0.95, 1.01)
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(labels_04, fontsize=10)
    axes[0].grid(axis='y', alpha=0.3)

    # Margin of Victory
    axes[1].bar(x, mv_04, yerr=mv_err_04, capsize=4, color=colors, alpha=0.85, edgecolor='white')
    axes[1].set_ylabel('Margin of Victory', fontsize=11)
    axes[1].set_title('Margin of Victory', fontsize=12, fontweight='bold')
    axes[1].set_xticks(x)
    axes[1].set_xticklabels(labels_04, fontsize=10)
    axes[1].grid(axis='y', alpha=0.3)

    # Whale Influence
    axes[2].bar(x, wi_04, yerr=wi_err_04, capsize=4, color=colors, alpha=0.85, edgecolor='white')
    axes[2].set_ylabel('Whale Influence', fontsize=11)
    axes[2].set_title('Whale Influence', fontsize=12, fontweight='bold')
    axes[2].set_xticks(x)
    axes[2].set_xticklabels(labels_04, fontsize=10)
    axes[2].grid(axis='y', alpha=0.3)

    # Quorum Reach Rate
    axes[3].bar(x, qr_04, yerr=qr_err_04, capsize=4, color=colors, alpha=0.85, edgecolor='white')
    axes[3].set_ylabel('Quorum Reach Rate', fontsize=11)
    axes[3].set_title('Quorum Reach', fontsize=12, fontweight='bold')
    axes[3].set_xticks(x)
    axes[3].set_xticklabels(labels_04, fontsize=10)
    axes[3].grid(axis='y', alpha=0.3)

    fig.suptitle('Voting Mechanism Comparison ($N=30$ per config, quorum $= 4\\%$)',
                 fontsize=14, fontweight='bold', y=1.02)
    fig.tight_layout()
    out_path = os.path.join(FIGURES_DIR, 'voting_comparison.png')
    fig.savefig(out_path, dpi=300, bbox_inches='tight')
    plt.close(fig)
    print(f"  Saved: {out_path}")
    print(f"  Labels: {labels_04}")
    print(f"  Pass rates: {[f'{p:.3f}' for p in pr_04]}")
    print(f"  Margins: {[f'{m:.3f}' for m in mv_04]}")
    print(f"  Quorum reach: {[f'{q:.3f}' for q in qr_04]}")


if __name__ == '__main__':
    os.makedirs(FIGURES_DIR, exist_ok=True)

    print("Regenerating paper figures from experiment data...")
    print()

    print("[1/3] Quorum pass rate (Experiment 03):")
    fig1_quorum_passrate()
    print()

    print("[2/3] Scale participation (Experiment 08):")
    fig2_scale_participation()
    print()

    print("[3/3] Voting mechanism comparison (Experiment 09):")
    fig3_voting_comparison()
    print()

    print("Done! All figures regenerated from current data.")
