#!/usr/bin/env python3
"""Generate figures for DAO governance research papers from experiment data."""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
import seaborn as sns

# Set style
plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['figure.figsize'] = (8, 5)
plt.rcParams['font.size'] = 11
plt.rcParams['axes.titlesize'] = 13
plt.rcParams['axes.labelsize'] = 12

RESULTS_DIR = Path(r'C:\Users\James Pollack\Desktop\imgntn_repos\dao_simulator_private\results\paper')
FIGURES_DIR = Path(r'C:\Users\James Pollack\Desktop\imgntn_repos\dao_simulator_private\paper\figures')
FIGURES_DIR.mkdir(exist_ok=True)

def load_metrics(experiment):
    """Load metrics CSV for an experiment."""
    path = RESULTS_DIR / experiment / 'metrics.csv'
    if path.exists():
        return pd.read_csv(path)
    return None

def save_figure(name):
    """Save figure with tight layout."""
    plt.tight_layout()
    path = FIGURES_DIR / f'{name}.png'
    plt.savefig(path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f'Saved: {path}')

def parse_sweep_value(df, param_name):
    """Extract numeric parameter from sweep_value string using regex."""
    import re
    def extract(s):
        # Match param_name=value where value can be a number
        pattern = param_name + r'=([0-9.]+)'
        match = re.search(pattern, str(s))
        if match:
            try:
                return float(match.group(1))
            except:
                return match.group(1)
        return None
    return df['sweep_value'].apply(extract)

# ============= RQ1 FIGURES =============

def gen_rq1_quorum_curve():
    """Quorum threshold vs pass rate curve."""
    df = load_metrics('03-sensitivity-quorum')
    if df is None:
        print('No data for rq1_quorum_curve')
        return
    
    # Extract quorum value
    df['quorum'] = parse_sweep_value(df, 'quorum_threshold')
    
    # Group and calculate stats
    stats = df.groupby('quorum').agg({
        'Proposal Pass Rate': ['mean', 'std'],
        'Quorum Reach Rate': ['mean', 'std']
    }).reset_index()
    stats.columns = ['quorum', 'pass_mean', 'pass_std', 'reach_mean', 'reach_std']
    stats = stats.sort_values('quorum')
    
    fig, ax = plt.subplots()
    ax.errorbar(stats['quorum']*100, stats['pass_mean']*100, yerr=stats['pass_std']*100, 
                marker='o', capsize=3, label='Pass Rate')
    ax.errorbar(stats['quorum']*100, stats['reach_mean']*100, yerr=stats['reach_std']*100,
                marker='s', capsize=3, label='Quorum Reach Rate')
    ax.set_xlabel('Quorum Threshold (%)')
    ax.set_ylabel('Rate (%)')
    ax.set_title('Proposal Outcomes vs Quorum Threshold')
    ax.legend()
    ax.set_ylim(0, 100)
    save_figure('rq1_quorum_curve')

def gen_rq1_fatigue_quorum():
    """Fatigue accumulation under different quorum levels."""
    df = load_metrics('03-sensitivity-quorum')
    if df is None:
        print('No data for rq1_fatigue_quorum')
        return
    
    df['quorum'] = parse_sweep_value(df, 'quorum_threshold')
    
    stats = df.groupby('quorum').agg({
        'Voter Retention Rate': ['mean', 'std'],
        'Voting Power Utilization': ['mean', 'std']
    }).reset_index()
    stats.columns = ['quorum', 'retention_mean', 'retention_std', 'util_mean', 'util_std']
    stats = stats.sort_values('quorum')
    
    fig, ax = plt.subplots()
    ax.errorbar(stats['quorum']*100, stats['retention_mean']*100, yerr=stats['retention_std']*100,
                marker='o', capsize=3, label='Voter Retention')
    ax.errorbar(stats['quorum']*100, stats['util_mean']*100, yerr=stats['util_std']*100,
                marker='s', capsize=3, label='Voting Power Utilization')
    ax.set_xlabel('Quorum Threshold (%)')
    ax.set_ylabel('Rate (%)')
    ax.set_title('Voter Fatigue Indicators vs Quorum')
    ax.legend()
    save_figure('rq1_fatigue_quorum')

# ============= RQ2 FIGURES =============

def gen_rq2_gini_quad():
    """Quadratic voting effect on Gini coefficient."""
    df = load_metrics('04-governance-capture-mitigations')
    if df is None:
        print('No data for rq2_gini_quad')
        return
    
    df['quadratic'] = parse_sweep_value(df, 'vote_power_quadratic_threshold')
    df['cap'] = parse_sweep_value(df, 'vote_power_cap_fraction')
    
    # Filter to no cap to isolate quadratic effect
    df_nocap = df[df['cap'] == 0]
    
    stats = df_nocap.groupby('quadratic').agg({
        'Voter Concentration Gini': ['mean', 'std'],
        'Whale Influence': ['mean', 'std']
    }).reset_index()
    stats.columns = ['quadratic', 'gini_mean', 'gini_std', 'whale_mean', 'whale_std']
    stats = stats.sort_values('quadratic')
    
    fig, ax1 = plt.subplots()
    ax1.bar(range(len(stats)), stats['gini_mean'], yerr=stats['gini_std'], 
            capsize=3, alpha=0.7, label='Voter Gini')
    ax1.set_xticks(range(len(stats)))
    ax1.set_xticklabels([f'{int(q)}' if q > 0 else 'Off' for q in stats['quadratic']])
    ax1.set_xlabel('Quadratic Voting Threshold')
    ax1.set_ylabel('Gini Coefficient')
    ax1.set_title('Voting Power Inequality under Quadratic Voting')
    save_figure('rq2_gini_quad')

def gen_rq2_velocity():
    """Velocity penalty effectiveness."""
    df = load_metrics('04-governance-capture-mitigations')
    if df is None:
        print('No data for rq2_velocity')
        return
    
    df['velocity'] = parse_sweep_value(df, 'vote_power_velocity_penalty')
    df['cap'] = parse_sweep_value(df, 'vote_power_cap_fraction')
    df['quadratic'] = parse_sweep_value(df, 'vote_power_quadratic_threshold')
    
    # Filter to baseline (no cap, no quadratic)
    df_base = df[(df['cap'] == 0) & (df['quadratic'] == 0)]
    
    stats = df_base.groupby('velocity').agg({
        'Governance Capture Risk': ['mean', 'std']
    }).reset_index()
    stats.columns = ['velocity', 'capture_mean', 'capture_std']
    stats = stats.sort_values('velocity')
    
    fig, ax = plt.subplots()
    ax.bar(range(len(stats)), stats['capture_mean'], yerr=stats['capture_std'],
           capsize=3, alpha=0.7)
    ax.set_xticks(range(len(stats)))
    ax.set_xticklabels([f'{int(v)}d' if v > 0 else 'None' for v in stats['velocity']])
    ax.set_xlabel('Velocity Penalty Window (days)')
    ax.set_ylabel('Governance Capture Risk')
    ax.set_title('Velocity Penalty Effect on Capture Risk')
    save_figure('rq2_velocity')

def gen_rq2_interactions():
    """Heatmap of mechanism interactions."""
    try:
        df = load_metrics('04-governance-capture-mitigations')
        if df is None:
            print('No data for rq2_interactions')
            return

        df['cap'] = parse_sweep_value(df, 'vote_power_cap_fraction')
        df['quadratic'] = parse_sweep_value(df, 'vote_power_quadratic_threshold')

        # Filter out rows with None values
        df_valid = df.dropna(subset=['cap', 'quadratic'])
        if df_valid.empty:
            print('No valid data for rq2_interactions heatmap')
            return

        # Average over velocity, group by cap and quadratic
        pivot = df_valid.groupby(['cap', 'quadratic'])['Whale Influence'].mean().reset_index()
        pivot_table = pivot.pivot(index='cap', columns='quadratic', values='Whale Influence')

        if pivot_table.empty or pivot_table.size == 0:
            print('Empty pivot table for rq2_interactions')
            return

        fig, ax = plt.subplots(figsize=(8, 6))
        sns.heatmap(pivot_table, annot=True, fmt='.2f', cmap='RdYlGn_r', ax=ax)
        ax.set_xlabel('Quadratic Threshold')
        ax.set_ylabel('Vote Cap Fraction')
        ax.set_title('Whale Influence: Cap x Quadratic Interaction')
        save_figure('rq2_interactions')
    except Exception as e:
        print(f'Error generating rq2_interactions: {e}')

# ============= RQ3 FIGURES =============

def gen_rq3_tempcheck():
    """Temp-check filtering rates."""
    try:
        df = load_metrics('05-proposal-pipeline')
        if df is None:
            print('No data for rq3_tempcheck')
            return

        df['tempcheck'] = parse_sweep_value(df, 'proposal_temp_check_fraction')

        stats = df.groupby('tempcheck').agg({
            'Proposal Pass Rate': ['mean', 'std'],
            'Proposal Rejection Rate': ['mean', 'std']
        }).reset_index()
        stats.columns = ['tempcheck', 'pass_mean', 'pass_std', 'reject_mean', 'reject_std']
        stats = stats.sort_values('tempcheck')

        fig, ax = plt.subplots()
        x = range(len(stats))
        width = 0.35
        ax.bar([i - width/2 for i in x], stats['pass_mean']*100, width,
               yerr=stats['pass_std']*100, capsize=3, label='Pass Rate', alpha=0.8)
        ax.bar([i + width/2 for i in x], stats['reject_mean']*100, width,
               yerr=stats['reject_std']*100, capsize=3, label='Rejection Rate', alpha=0.8)
        ax.set_xticks(x)
        ax.set_xticklabels([f'{int(t*100)}%' if pd.notna(t) else 'None' for t in stats['tempcheck']])
        ax.set_xlabel('Temp-Check Threshold')
        ax.set_ylabel('Rate (%)')
        ax.set_title('Proposal Filtering by Temp-Check Threshold')
        ax.legend()
        save_figure('rq3_tempcheck')
    except Exception as e:
        print(f'Error generating rq3_tempcheck: {e}')

def gen_rq3_quality():
    """Quality improvement with pipeline stages."""
    try:
        df = load_metrics('05-proposal-pipeline')
        if df is None:
            print('No data for rq3_quality')
            return

        df['tempcheck'] = parse_sweep_value(df, 'proposal_temp_check_fraction')
        df['fasttrack'] = parse_sweep_value(df, 'proposal_fast_track_min_steps')

        stats = df.groupby(['tempcheck', 'fasttrack']).agg({
            'Avg Margin of Victory': ['mean', 'std']
        }).reset_index()
        stats.columns = ['tempcheck', 'fasttrack', 'margin_mean', 'margin_std']

        # Create grouped bar chart
        fig, ax = plt.subplots()
        tempcheck_vals = sorted(stats['tempcheck'].dropna().unique())
        fasttrack_vals = sorted(stats['fasttrack'].dropna().unique())

        x = np.arange(len(tempcheck_vals))
        width = 0.25

        for i, ft in enumerate(fasttrack_vals[:3]):  # Limit to 3 for readability
            data = stats[stats['fasttrack'] == ft].sort_values('tempcheck')
            if len(data) > 0:
                ax.bar(x + i*width, data['margin_mean']*100, width,
                       label=f'Fast-track {int(ft)}', alpha=0.8)

        ax.set_xticks(x + width)
        ax.set_xticklabels([f'{int(t*100)}%' for t in tempcheck_vals])
        ax.set_xlabel('Temp-Check Threshold')
        ax.set_ylabel('Avg Margin of Victory (%)')
        ax.set_title('Decision Quality by Pipeline Configuration')
        ax.legend()
        save_figure('rq3_quality')
    except Exception as e:
        print(f'Error generating rq3_quality: {e}')

def gen_rq3_ttd():
    """Time-to-decision distribution."""
    try:
        df = load_metrics('05-proposal-pipeline')
        if df is None:
            print('No data for rq3_ttd')
            return

        df['fasttrack'] = parse_sweep_value(df, 'proposal_fast_track_min_steps')

        stats = df.groupby('fasttrack').agg({
            'Avg Time to Decision': ['mean', 'std']
        }).reset_index()
        stats.columns = ['fasttrack', 'ttd_mean', 'ttd_std']
        stats = stats.sort_values('fasttrack')

        fig, ax = plt.subplots()
        ax.bar(range(len(stats)), stats['ttd_mean'], yerr=stats['ttd_std'], capsize=3, alpha=0.7)
        ax.set_xticks(range(len(stats)))
        ax.set_xticklabels([f'{int(f)}' if pd.notna(f) else 'None' for f in stats['fasttrack']])
        ax.set_xlabel('Fast-Track Min Steps')
        ax.set_ylabel('Avg Time to Decision (ticks)')
        ax.set_title('Decision Speed by Fast-Track Setting')
        save_figure('rq3_ttd')
    except Exception as e:
        print(f'Error generating rq3_ttd: {e}')

def gen_rq3_expiry():
    """Abandonment vs expiry window."""
    try:
        df = load_metrics('05-proposal-pipeline')
        if df is None:
            print('No data for rq3_expiry')
            return

        # Use tempcheck as proxy since expiry isn't in this dataset
        df['tempcheck'] = parse_sweep_value(df, 'proposal_temp_check_fraction')

        stats = df.groupby('tempcheck').agg({
            'Proposal Abandonment Rate': ['mean', 'std']
        }).reset_index()
        stats.columns = ['tempcheck', 'abandon_mean', 'abandon_std']
        stats = stats.sort_values('tempcheck')

        fig, ax = plt.subplots()
        ax.errorbar(stats['tempcheck']*100, stats['abandon_mean']*100, yerr=stats['abandon_std']*100,
                    marker='o', capsize=3, linewidth=2, markersize=8)
        ax.set_xlabel('Temp-Check Threshold (%)')
        ax.set_ylabel('Abandonment Rate (%)')
        ax.set_title('Proposal Abandonment by Pipeline Setting')
        save_figure('rq3_expiry')
    except Exception as e:
        print(f'Error generating rq3_expiry: {e}')

def gen_rq3_interactions():
    """Pipeline interaction heatmap."""
    try:
        df = load_metrics('05-proposal-pipeline')
        if df is None:
            print('No data for rq3_interactions')
            return

        df['tempcheck'] = parse_sweep_value(df, 'proposal_temp_check_fraction')
        df['fasttrack'] = parse_sweep_value(df, 'proposal_fast_track_min_steps')

        # Filter out None values
        df_valid = df.dropna(subset=['tempcheck', 'fasttrack'])
        if df_valid.empty:
            print('No valid data for rq3_interactions')
            return

        pivot = df_valid.groupby(['tempcheck', 'fasttrack'])['Proposal Pass Rate'].mean().reset_index()
        pivot_table = pivot.pivot(index='tempcheck', columns='fasttrack', values='Proposal Pass Rate')

        if pivot_table.empty:
            print('Empty pivot for rq3_interactions')
            return

        fig, ax = plt.subplots(figsize=(8, 6))
        sns.heatmap(pivot_table * 100, annot=True, fmt='.1f', cmap='Blues', ax=ax)
        ax.set_xlabel('Fast-Track Min Steps')
        ax.set_ylabel('Temp-Check Fraction')
        ax.set_title('Pass Rate (%): Temp-Check x Fast-Track')
        save_figure('rq3_interactions')
    except Exception as e:
        print(f'Error generating rq3_interactions: {e}')

# ============= RQ4 FIGURES =============

def gen_rq4_efficiency():
    """Treasury efficiency metrics."""
    try:
        df = load_metrics('06-treasury-resilience')
        if df is None:
            print('No data for rq4_efficiency')
            return

        df['buffer'] = parse_sweep_value(df, 'treasury_buffer_fraction')

        stats = df.groupby('buffer').agg({
            'Treasury Growth Rate': ['mean', 'std']
        }).reset_index()
        stats.columns = ['buffer', 'growth_mean', 'growth_std']
        stats = stats.sort_values('buffer')

        fig, ax = plt.subplots()
        ax.errorbar(stats['buffer']*100, stats['growth_mean']*100, yerr=stats['growth_std']*100,
                    marker='o', capsize=3, linewidth=2)
        ax.set_xlabel('Buffer Reserve (%)')
        ax.set_ylabel('Treasury Growth Rate (%)')
        ax.set_title('Treasury Efficiency vs Buffer Size')
        ax.axhline(y=0, color='gray', linestyle='--', alpha=0.5)
        save_figure('rq4_efficiency')
    except Exception as e:
        print(f'Error generating rq4_efficiency: {e}')

def gen_rq4_runway():
    """Treasury runway under stress."""
    try:
        df = load_metrics('06-treasury-resilience')
        if df is None:
            print('No data for rq4_runway')
            return

        df['buffer'] = parse_sweep_value(df, 'treasury_buffer_fraction')

        stats = df.groupby('buffer').agg({
            'Final Treasury': ['mean', 'std'],
            'Treasury Volatility': ['mean', 'std']
        }).reset_index()
        stats.columns = ['buffer', 'treasury_mean', 'treasury_std', 'vol_mean', 'vol_std']
        stats = stats.sort_values('buffer')

        fig, ax1 = plt.subplots()
        ax1.errorbar(stats['buffer']*100, stats['treasury_mean'], yerr=stats['treasury_std'],
                     marker='o', capsize=3, color='blue', label='Final Treasury')
        ax1.set_xlabel('Buffer Reserve (%)')
        ax1.set_ylabel('Final Treasury', color='blue')
        ax1.tick_params(axis='y', labelcolor='blue')

        ax2 = ax1.twinx()
        ax2.errorbar(stats['buffer']*100, stats['vol_mean'], yerr=stats['vol_std'],
                     marker='s', capsize=3, color='red', label='Volatility')
        ax2.set_ylabel('Treasury Volatility', color='red')
        ax2.tick_params(axis='y', labelcolor='red')

        plt.title('Treasury Health vs Buffer Size')
        save_figure('rq4_runway')
    except Exception as e:
        print(f'Error generating rq4_runway: {e}')

def gen_rq4_topup():
    """Top-up mechanism effectiveness."""
    try:
        df = load_metrics('06-treasury-resilience')
        if df is None:
            print('No data for rq4_topup')
            return

        # Group by sweep_value categories
        stats = df.groupby('sweep_value').agg({
            'Treasury Volatility': ['mean', 'std'],
            'Proposal Pass Rate': ['mean', 'std']
        }).reset_index()
        stats.columns = ['config', 'vol_mean', 'vol_std', 'pass_mean', 'pass_std']

        # Limit to top configs
        stats = stats.head(6)

        fig, ax = plt.subplots(figsize=(10, 5))
        x = range(len(stats))
        ax.bar(x, stats['vol_mean'], yerr=stats['vol_std'], capsize=3, alpha=0.7)
        ax.set_xticks(x)
        labels = [s[:20] + '...' if len(s) > 20 else s for s in stats['config']]
        ax.set_xticklabels(labels, rotation=45, ha='right')
        ax.set_ylabel('Treasury Volatility')
        ax.set_title('Treasury Stability by Configuration')
        save_figure('rq4_topup')
    except Exception as e:
        print(f'Error generating rq4_topup: {e}')

def gen_rq4_regimes():
    """Market regime comparison."""
    try:
        df = load_metrics('06-treasury-resilience')
        if df is None:
            print('No data for rq4_regimes')
            return

        # Categorize by sweep values
        stats = df.groupby('sweep_value').agg({
            'Treasury Growth Rate': ['mean', 'std'],
            'Treasury Volatility': ['mean', 'std']
        }).reset_index()
        stats.columns = ['config', 'growth_mean', 'growth_std', 'vol_mean', 'vol_std']

        fig, ax = plt.subplots()
        ax.scatter(stats['vol_mean'], stats['growth_mean']*100, s=100, alpha=0.7)
        ax.set_xlabel('Treasury Volatility')
        ax.set_ylabel('Treasury Growth Rate (%)')
        ax.set_title('Growth vs Stability Trade-off')
        ax.axhline(y=0, color='gray', linestyle='--', alpha=0.5)
        save_figure('rq4_regimes')
    except Exception as e:
        print(f'Error generating rq4_regimes: {e}')

# ============= RQ5 FIGURES =============

def gen_rq5_surplus():
    """Surplus/value creation from cooperation."""
    try:
        df = load_metrics('07-inter-dao-cooperation')
        if df is None:
            print('No data for rq5_surplus')
            return

        stats = df.groupby('sweep_value').agg({
            'ecosystem.Total Shared Budget': ['mean', 'std'],
            'ecosystem.Resource Flow Volume': ['mean', 'std']
        }).reset_index()
        stats.columns = ['scenario', 'budget_mean', 'budget_std', 'flow_mean', 'flow_std']

        fig, ax = plt.subplots()
        x = range(len(stats))
        width = 0.35
        ax.bar([i - width/2 for i in x], stats['budget_mean'], width,
               yerr=stats['budget_std'], capsize=3, label='Shared Budget', alpha=0.8)
        ax.bar([i + width/2 for i in x], stats['flow_mean'], width,
               yerr=stats['flow_std'], capsize=3, label='Resource Flow', alpha=0.8)
        ax.set_xticks(x)
        ax.set_xticklabels([s.split('=')[-1] if '=' in s else s[:15] for s in stats['scenario']], rotation=45, ha='right')
        ax.set_ylabel('Value')
        ax.set_title('Inter-DAO Value Creation by Scenario')
        ax.legend()
        save_figure('rq5_surplus')
    except Exception as e:
        print(f'Error generating rq5_surplus: {e}')

def gen_rq5_fairness():
    """Fairness in benefit distribution."""
    try:
        df = load_metrics('07-inter-dao-cooperation')
        if df is None:
            print('No data for rq5_fairness')
            return

        stats = df.groupby('sweep_value').agg({
            'ecosystem.Cross-DAO Approval Alignment': ['mean', 'std']
        }).reset_index()
        stats.columns = ['scenario', 'alignment_mean', 'alignment_std']

        fig, ax = plt.subplots()
        ax.bar(range(len(stats)), stats['alignment_mean']*100,
               yerr=stats['alignment_std']*100, capsize=3, alpha=0.7)
        ax.set_xticks(range(len(stats)))
        ax.set_xticklabels([s.split('=')[-1] if '=' in s else s[:15] for s in stats['scenario']], rotation=45, ha='right')
        ax.set_ylabel('Cross-DAO Alignment (%)')
        ax.set_title('Voting Alignment Across DAOs')
        save_figure('rq5_fairness')
    except Exception as e:
        print(f'Error generating rq5_fairness: {e}')

def gen_rq5_hub():
    """Hub coordinator effectiveness."""
    try:
        df = load_metrics('07-inter-dao-cooperation')
        if df is None:
            print('No data for rq5_hub')
            return

        stats = df.groupby('sweep_value').agg({
            'ecosystem.Inter-DAO Proposal Success Rate': ['mean', 'std'],
            'ecosystem.Inter-DAO Proposal Count': ['mean', 'std']
        }).reset_index()
        stats.columns = ['scenario', 'success_mean', 'success_std', 'count_mean', 'count_std']

        fig, ax1 = plt.subplots()
        x = range(len(stats))
        ax1.bar(x, stats['success_mean']*100, yerr=stats['success_std']*100,
                capsize=3, alpha=0.7, label='Success Rate')
        ax1.set_xticks(x)
        ax1.set_xticklabels([s.split('=')[-1] if '=' in s else s[:15] for s in stats['scenario']], rotation=45, ha='right')
        ax1.set_ylabel('Success Rate (%)')
        ax1.set_title('Inter-DAO Proposal Outcomes by Scenario')
        save_figure('rq5_hub')
    except Exception as e:
        print(f'Error generating rq5_hub: {e}')

def gen_rq5_overlap():
    """Membership overlap effects."""
    try:
        df = load_metrics('07-inter-dao-cooperation')
        if df is None:
            print('No data for rq5_overlap')
            return

        stats = df.groupby('sweep_value').agg({
            'ecosystem.Inter-DAO Voting Participation': ['mean', 'std'],
            'ecosystem.Collaboration Proposal Rate': ['mean', 'std']
        }).reset_index()
        stats.columns = ['scenario', 'voting_mean', 'voting_std', 'collab_mean', 'collab_std']

        fig, ax = plt.subplots()
        x = range(len(stats))
        width = 0.35
        ax.bar([i - width/2 for i in x], stats['voting_mean']*100, width,
               yerr=stats['voting_std']*100, capsize=3, label='Voting Participation', alpha=0.8)
        ax.bar([i + width/2 for i in x], stats['collab_mean']*100, width,
               yerr=stats['collab_std']*100, capsize=3, label='Collaboration Rate', alpha=0.8)
        ax.set_xticks(x)
        ax.set_xticklabels([s.split('=')[-1] if '=' in s else s[:15] for s in stats['scenario']], rotation=45, ha='right')
        ax.set_ylabel('Rate (%)')
        ax.set_title('Cross-DAO Participation by Scenario')
        ax.legend()
        save_figure('rq5_overlap')
    except Exception as e:
        print(f'Error generating rq5_overlap: {e}')

# ============= MAIN =============

def main():
    print('='*60)
    print('Generating figures from experiment data...')
    print(f'Results directory: {RESULTS_DIR}')
    print(f'Figures directory: {FIGURES_DIR}')
    print('='*60)
    
    # RQ1 figures
    print('\n--- RQ1: Participation Dynamics ---')
    gen_rq1_quorum_curve()
    gen_rq1_fatigue_quorum()
    
    # RQ2 figures
    print('\n--- RQ2: Governance Capture ---')
    gen_rq2_gini_quad()
    gen_rq2_velocity()
    gen_rq2_interactions()
    
    # RQ3 figures
    print('\n--- RQ3: Proposal Pipeline ---')
    gen_rq3_tempcheck()
    gen_rq3_quality()
    gen_rq3_ttd()
    gen_rq3_expiry()
    gen_rq3_interactions()
    
    # RQ4 figures
    print('\n--- RQ4: Treasury Resilience ---')
    gen_rq4_efficiency()
    gen_rq4_runway()
    gen_rq4_topup()
    gen_rq4_regimes()
    
    # RQ5 figures
    print('\n--- RQ5: Inter-DAO Cooperation ---')
    gen_rq5_surplus()
    gen_rq5_fairness()
    gen_rq5_hub()
    gen_rq5_overlap()
    
    print('\n' + '='*60)
    print('Figure generation complete!')
    print('='*60)

if __name__ == '__main__':
    main()
