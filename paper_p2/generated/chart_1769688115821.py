
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

data = json.loads('[{"category":"simple_majority","value":0.40549,"std":0.009221},{"category":"quadratic","value":0.042163,"std":0.005529},{"category":"conviction","value":0,"std":0}]')


categories = [d['category'] for d in data]
values = [d['value'] for d in data]
errors = [d.get('std', 0) for d in data]

x = np.arange(len(categories))
plt.bar(x, values, yerr=errors, capsize=5, color=['#2ecc71', '#3498db', '#e74c3c'][:len(categories)])
plt.xticks(x, categories)
plt.xlabel('Voting Mechanism')
plt.ylabel('Proposal Pass Rate')
plt.title('Comparison of Voting Mechanisms')


plt.tight_layout()
plt.savefig('C:/Users/James Pollack/Desktop/imgntn_repos/dao_simulator_private/paper/figures/voting_comparison.png', dpi=300, bbox_inches='tight')
plt.close()
print(f'Chart saved to C:/Users/James Pollack/Desktop/imgntn_repos/dao_simulator_private/paper/figures/voting_comparison.png')
