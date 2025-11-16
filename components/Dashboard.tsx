import React, { useState } from 'react';
import { CopyIcon, RefreshIcon } from './Icons';

interface PivotData {
    screener: string;
    count: number;
}

interface DashboardProps {
    data: PivotData[];
    onReset: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
    const [copyStatus, setCopyStatus] = useState('Copy');
    const total = data.reduce((sum, item) => sum + item.count, 0);

    const handleCopy = () => {
        const tableString = [
            "Row Label\tCount of Screener",
            ...data.map(item => `${item.screener}\t${item.count}`),
            `Grand Total\t${total}`
        ].join('\n');

        navigator.clipboard.writeText(tableString).then(() => {
            setCopyStatus('Copied!');
            setTimeout(() => setCopyStatus('Copy'), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            setCopyStatus('Failed!');
            setTimeout(() => setCopyStatus('Copy'), 2000);
        });
    };

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-700 animate-fade-in-up">
            <h2 className="text-2xl font-bold mb-6 text-center text-white">Assignment Summary</h2>
            
            <div className="max-w-md mx-auto">
                <div className="border border-gray-600 rounded-lg overflow-hidden shadow-lg">
                    <table className="w-full text-left text-sm text-white">
                        <thead className="bg-gray-700 text-gray-300 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Row Label</th>
                                <th className="px-4 py-3 font-semibold text-right">Count of Screener</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {data.map(({ screener, count }) => (
                                <tr key={screener}>
                                    <td className="px-4 py-2 font-medium">{screener}</td>
                                    <td className="px-4 py-2 text-right font-mono">{count}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-blue-900/50 font-bold">
                            <tr>
                                <td className="px-4 py-2">Grand Total</td>
                                <td className="px-4 py-2 text-right font-mono">{total}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="mt-6 flex justify-center">
                     <button
                        onClick={handleCopy}
                        className="inline-flex items-center px-4 py-2 font-semibold text-sm text-white bg-gray-600 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-400 transition-colors duration-200"
                    >
                        <CopyIcon />
                        {copyStatus}
                    </button>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700 text-center">
                <button
                    onClick={onReset}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 font-semibold text-lg text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-300 ease-in-out"
                >
                    <RefreshIcon />
                    Process New Files
                </button>
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

export default Dashboard;
