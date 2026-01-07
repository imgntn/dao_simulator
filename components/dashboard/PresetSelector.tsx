'use client';

interface Preset {
  id: string;
  name: string;
  description: string;
}

interface PresetSelectorProps {
  presets: Preset[];
  selectedId: string;
  onSelect: (id: string) => void;
  title?: string;
  activeColor?: string;
}

export function PresetSelector({
  presets,
  selectedId,
  onSelect,
  title = 'Selected',
  activeColor = 'blue',
}: PresetSelectorProps) {
  const colorClasses = {
    blue: {
      active: 'border-blue-500 bg-blue-500/10 text-white',
      hover: 'hover:border-blue-400',
      badge: 'text-blue-300',
    },
    emerald: {
      active: 'border-emerald-500 bg-emerald-500/10 text-white',
      hover: 'hover:border-emerald-400',
      badge: 'text-emerald-300',
    },
  };

  const colors = colorClasses[activeColor as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset.id)}
          className={`p-4 rounded-lg border transition-colors text-left ${
            selectedId === preset.id
              ? colors.active
              : `border-gray-700 bg-gray-800/50 text-gray-200 ${colors.hover}`
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">{preset.name}</h4>
            {selectedId === preset.id && (
              <span className={`text-xs ${colors.badge}`}>{title}</span>
            )}
          </div>
          <p className="text-sm text-gray-400">{preset.description}</p>
        </button>
      ))}
    </section>
  );
}
