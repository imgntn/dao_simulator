
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')

plt.figure(figsize=(8, 5))
plt.text(0.5, 0.5, 'RQ3: Time-to-decision vs temp-check fraction', ha='center', va='center', fontsize=14)
plt.axis('off')
plt.tight_layout()
plt.savefig('C:/Users/James Pollack/Desktop/imgntn_repos/dao_simulator_private/paper/figures/rq3_time.png', dpi=300, bbox_inches='tight')
plt.close()
print('Placeholder chart saved to C:/Users/James Pollack/Desktop/imgntn_repos/dao_simulator_private/paper/figures/rq3_time.png')
