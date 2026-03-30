import { useMotoboyRegistry } from '@/contexts/MotoboyRegistryContext';
import { MoreHorizontal } from 'lucide-react';

export function MaisTab({ isDark }: { isDark: boolean }) {
  const { activeMotoboy } = useMotoboyRegistry();
  return (
    <div className={`flex-1 p-5 ${isDark ? 'bg-gray-950' : 'bg-gray-50'} min-h-full`} data-testid="tab-mais">
      {activeMotoboy && (
        <div className={`rounded-2xl p-4 mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-2xl">
              {activeMotoboy.avatar}
            </div>
            <div>
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{activeMotoboy.name}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{activeMotoboy.vehicle} · {activeMotoboy.licensePlate}</p>
            </div>
          </div>
        </div>
      )}
      <div className={`flex items-center justify-center p-8 text-center`}>
        <div>
          <MoreHorizontal className={`w-12 h-12 ${isDark ? 'text-gray-700' : 'text-gray-200'} mx-auto mb-3`} />
          <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-sm`}>Em breve</p>
        </div>
      </div>
    </div>
  );
}
