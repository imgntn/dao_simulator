
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

data = json.loads('[{"sweep_value":1,"std":0},{"sweep_value":2,"std":0},{"sweep_value":3,"std":0},{"sweep_value":4,"std":0},{"sweep_value":5,"std":0},{"sweep_value":6,"std":0},{"sweep_value":7,"std":0},{"sweep_value":8,"std":0},{"sweep_value":9,"std":0},{"sweep_value":10,"std":0},{"sweep_value":12,"std":0},{"sweep_value":15,"std":0},{"sweep_value":20,"std":0}]')


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
print(f'Chart saved to C:\Users\James Pollack\Desktop\imgntn_repos\dao_simulator_private\paper\figures\quorum_passrate.png')
