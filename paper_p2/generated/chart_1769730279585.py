
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

data = json.loads('[{"sweep_value":25,"mean":0.032479,"std":0.000944},{"sweep_value":50,"mean":0.013249,"std":0.000662},{"sweep_value":100,"mean":0.008108,"std":0.000289},{"sweep_value":200,"mean":0.004136,"std":0.000063},{"sweep_value":300,"mean":0.00277,"std":0.000075},{"sweep_value":500,"mean":0.001628,"std":0.000041}]')


x = [d['sweep_value'] for d in data]
y = [d['mean'] for d in data]
yerr = [d.get('std', 0) for d in data]

plt.errorbar(x, y, yerr=yerr, capsize=5, marker='o', markersize=6, linewidth=2)
plt.xlabel('DAO Size (Members)')
plt.ylabel('Average Turnout')
plt.title('Participation Rate vs. DAO Size')


plt.tight_layout()
plt.savefig('C:/Users/James Pollack/Desktop/imgntn_repos/dao_simulator_private/paper_p2/figures/scale_participation.png', dpi=300, bbox_inches='tight')
plt.close()
print(f'Chart saved to C:/Users/James Pollack/Desktop/imgntn_repos/dao_simulator_private/paper_p2/figures/scale_participation.png')
