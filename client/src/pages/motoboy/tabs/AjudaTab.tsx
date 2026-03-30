import { HelpCircle } from 'lucide-react';

export function AjudaTab({ isDark }: { isDark: boolean }) {
  return (
    <div className={`flex-1 flex items-center justify-center p-8 text-center ${isDark ? 'bg-gray-950' : 'bg-gray-50'} min-h-full`} data-testid="tab-ajuda">
      <div>
        <HelpCircle className={`w-12 h-12 ${isDark ? 'text-gray-700' : 'text-gray-200'} mx-auto mb-3`} />
        <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-sm`}>Em breve</p>
      </div>
    </div>
  );
}
