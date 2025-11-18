import React, { useState } from 'react';
import { DownloadIcon, SpinnerIcon } from './Icons';

interface AssignmentModalProps {
    onAssign: (cnNames: string[], jpNames: string[], specialNames: string[], generalNames: string[]) => void;
    onCancel: () => void;
    isAssigning: boolean;
    initialMessage?: string | null;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ onAssign, onCancel, isAssigning, initialMessage }) => {
    const [cnNames, setCnNames] = useState('');
    const [jpNames, setJpNames] = useState('');
    const [specialNames, setSpecialNames] = useState('');
    const [generalNames, setGeneralNames] = useState('');

    const handleAssign = () => {
        // Use a regex to split by commas or whitespace for more flexible input.
        // .filter(Boolean) removes any empty strings that might result from extra separators.
        const parseNames = (nameString: string) => nameString.split(/[\s,]+/).filter(Boolean);

        onAssign(parseNames(cnNames), parseNames(jpNames), parseNames(specialNames), parseNames(generalNames));
    };

    const canAssign = cnNames.trim().length > 0 || jpNames.trim().length > 0 || specialNames.trim().length > 0 || generalNames.trim().length > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-700 w-full max-w-2xl transform transition-all animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-2 text-white">Step 2: Assign Work to Screeners</h2>
                <p className="text-gray-400 mb-6">Enter comma- or space-separated names for each group. Work will be distributed equally.</p>
                
                {initialMessage && (
                    <div className="mb-4 p-3 text-center text-sm text-green-300 bg-green-900/50 border border-green-700 rounded-lg">
                        {initialMessage}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label htmlFor="cn-names" className="block text-sm font-medium text-blue-400 mb-2">Assignees for 'CN' Data</label>
                        <textarea
                            id="cn-names"
                            rows={2}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:opacity-50"
                            placeholder="e.g., Alice, Bob"
                            value={cnNames}
                            onChange={(e) => setCnNames(e.target.value)}
                            disabled={isAssigning}
                        />
                    </div>
                     <div>
                        <label htmlFor="jp-names" className="block text-sm font-medium text-red-400 mb-2">Assignees for 'JP' Data</label>
                        <textarea
                            id="jp-names"
                            rows={2}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition disabled:opacity-50"
                            placeholder="e.g., Charlie, Dana"
                            value={jpNames}
                            onChange={(e) => setJpNames(e.target.value)}
                            disabled={isAssigning}
                        />
                    </div>
                     <div>
                        <label htmlFor="special-names" className="block text-sm font-medium text-yellow-400 mb-2">Assignees for 'RU, UA, NI, VE, BY, CU, IR, KP, SY' Data</label>
                        <textarea
                            id="special-names"
                            rows={2}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition disabled:opacity-50"
                            placeholder="e.g., Quinn, Riley"
                            value={specialNames}
                            onChange={(e) => setSpecialNames(e.target.value)}
                            disabled={isAssigning}
                        />
                    </div>
                    <div>
                        <label htmlFor="general-names" className="block text-sm font-medium text-purple-400 mb-2">Assignees for All Other Data</label>
                         <textarea
                            id="general-names"
                            rows={2}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition disabled:opacity-50"
                            placeholder="e.g., Eve, Frank, Grace"
                            value={generalNames}
                            onChange={(e) => setGeneralNames(e.target.value)}
                            disabled={isAssigning}
                        />
                    </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row justify-end gap-4">
                    <button
                        onClick={onCancel}
                        disabled={isAssigning}
                        className="px-6 py-2 font-semibold text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-500/50 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={!canAssign || isAssigning}
                        className="inline-flex items-center justify-center px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition duration-300"
                    >
                        {isAssigning ? (
                            <>
                                <SpinnerIcon />
                                Assigning...
                            </>
                        ) : (
                            <>
                                <DownloadIcon />
                                Assign & Download
                            </>
                        )}
                    </button>
                </div>
            </div>
             <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default AssignmentModal;