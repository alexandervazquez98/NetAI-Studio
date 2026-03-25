import React from 'react';

export interface ValidationResult {
  rule: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  affected?: string[];
}

interface ValidationModalProps {
  results: ValidationResult[];
  onClose: () => void;
}

const StatusIcon: React.FC<{ status: 'pass' | 'fail' | 'warn' }> = ({ status }) => {
  if (status === 'pass') {
    return (
      <svg
        className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (status === 'fail') {
    return (
      <svg
        className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  // warn
  return (
    <svg
      className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export const ValidationModal: React.FC<ValidationModalProps> = ({ results, onClose }) => {
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const warned = results.filter((r) => r.status === 'warn').length;

  const overallOk = failed === 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="validation-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center gap-3 ${
            overallOk ? 'bg-green-50 border-b border-green-100' : 'bg-red-50 border-b border-red-100'
          }`}
        >
          {overallOk ? (
            <svg
              className="w-6 h-6 text-green-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 text-red-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          )}
          <div>
            <h2
              id="validation-modal-title"
              className={`text-lg font-bold ${overallOk ? 'text-green-800' : 'text-red-800'}`}
            >
              Resultado de Validación
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              <span className="text-green-700 font-medium">{passed} regla{passed !== 1 ? 's' : ''} pasaron</span>
              {failed > 0 && (
                <>
                  {', '}
                  <span className="text-red-600 font-medium">{failed} fallaron</span>
                </>
              )}
              {warned > 0 && (
                <>
                  {', '}
                  <span className="text-amber-600 font-medium">{warned} advertencia{warned !== 1 ? 's' : ''}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Results list */}
        <div className="px-6 py-4 max-h-[50vh] overflow-y-auto space-y-3">
          {results.map((result, idx) => (
            <div
              key={idx}
              className={`
                flex gap-3 p-3 rounded-lg border text-sm
                ${result.status === 'pass' ? 'bg-green-50 border-green-100' : ''}
                ${result.status === 'fail' ? 'bg-red-50 border-red-100' : ''}
                ${result.status === 'warn' ? 'bg-amber-50 border-amber-100' : ''}
              `}
            >
              <StatusIcon status={result.status} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 text-xs uppercase tracking-wide mb-0.5">
                  {result.rule}
                </div>
                <div className="text-gray-700">{result.message}</div>
                {result.affected && result.affected.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.affected.map((id) => (
                      <span
                        key={id}
                        className="text-xs font-mono bg-white border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded"
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
