
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

data = json.loads('[{"sweep_value":1,"mean":0.440507,"std":0.008756},{"sweep_value":2,"mean":0.438766,"std":0.012329},{"sweep_value":3,"mean":0.438872,"std":0.01166},{"sweep_value":4,"mean":0.441632,"std":0.011475},{"sweep_value":5,"mean":0.440373,"std":0.011247},{"sweep_value":6,"mean":0.439366,"std":0.013026},{"sweep_value":7,"mean":0.437031,"std":0.012321},{"sweep_value":8,"mean":0.440216,"std":0.012274},{"sweep_value":9,"mean":0.439196,"std":0.00939},{"sweep_value":10,"mean":0.441982,"std":0.013498},{"sweep_value":12,"mean":0.440479,"std":0.010777},{"sweep_value":15,"mean":0.43832,"std":0.009207},{"sweep_value":20,"mean":0.440981,"std":0.010925}]')


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
