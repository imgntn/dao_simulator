
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

data = json.loads('[{"sweep_value":1,"mean":0.259837,"std":0.017368},{"sweep_value":20,"mean":0,"std":0},{"sweep_value":40,"mean":0,"std":0},{"sweep_value":60,"mean":0,"std":0}]')


x = [d['sweep_value'] for d in data]
y = [d['mean'] for d in data]
yerr = [d.get('std', 0) for d in data]

plt.errorbar(x, y, yerr=yerr, capsize=5, marker='o', markersize=6, linewidth=2)
plt.xlabel('Quorum Threshold (%)')
plt.ylabel('Proposal Pass Rate')
plt.title('Effect of Quorum on Proposal Outcomes')


plt.tight_layout()
plt.savefig('C:/Users/James Pollack/Desktop/imgntn_repos/dao_simulator_private/paper/figures/quorum_passrate.png', dpi=300, bbox_inches='tight')
plt.close()
print(f'Chart saved to C:/Users/James Pollack/Desktop/imgntn_repos/dao_simulator_private/paper/figures/quorum_passrate.png')
