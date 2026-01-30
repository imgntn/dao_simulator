
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')

plt.figure(figsize=(8, 5))
plt.text(0.5, 0.5, 'RQ2: Capture risk vs throughput tradeoff', ha='center', va='center', fontsize=14)
plt.axis('off')
plt.tight_layout()
plt.savefig('C:/Users/James Pollack/Desktop/imgntn_repos/dao_simulator_private/paper/figures/rq2_tradeoff.png', dpi=300, bbox_inches='tight')
plt.close()
print('Placeholder chart saved to C:/Users/James Pollack/Desktop/imgntn_repos/dao_simulator_private/paper/figures/rq2_tradeoff.png')
