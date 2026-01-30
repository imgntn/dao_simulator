
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
import numpy as np
import json

# Style for academic papers
plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['font.family'] = 'serif'
plt.rcParams['font.size'] = 11
plt.rcParams['axes.labelsize'] = 12
plt.rcParams['axes.titlesize'] = 14
plt.rcParams['figure.figsize'] = (8, 5)

data = json.loads('[{"sweep_value":25,"mean":0.082087,"std":0.007464},{"sweep_value":50,"mean":0.035796,"std":0.002303},{"sweep_value":100,"mean":0.021262,"std":0.000837},{"sweep_value":200,"mean":0.010646,"std":0.000352},{"sweep_value":300,"mean":0.007146,"std":0.000166},{"sweep_value":500,"mean":0.004291,"std":0.000076}]')


x = [d['sweep_value'] for d in data]
y = [d['mean'] for d in data]
yerr = [d.get('std', 0) for d in data]

plt.errorbar(x, y, yerr=yerr, capsize=5, marker='o', markersize=6, linewidth=2)
plt.xlabel('DAO Size (Members)')
plt.ylabel('Average Turnout')
plt.title('Participation Rate vs. DAO Size')


plt.tight_layout()
plt.savefig('C:/Users/James Pollack/Desktop/imgntn_repos/dao_simulator_private/paper/figures/scale_participation.png', dpi=300, bbox_inches='tight')
plt.close()
print(f'Chart saved to C:/Users/James Pollack/Desktop/imgntn_repos/dao_simulator_private/paper/figures/scale_participation.png')
