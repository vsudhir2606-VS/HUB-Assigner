import React, { useState, useCallback } from 'react';
import { processColumnA } from '../services/excelProcessor';
import FileUploader from './FileUploader';
import { PlayIcon, SpinnerIcon, CopyIcon, RefreshIcon } from './Icons';

const ColumnAProcessor: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [processedData, setProcessedData] = useState<number[] | null>(null);
    const [copyStatus, setCopyStatus] = useState('Copy');

    const handleFileChange = (selectedFile: File | null) => {
        setFile(selectedFile);
        setError(null);
        setProcessedData(null);
    };

    const handleProcess = useCallback(async () => {
        if (!file) {
            setError("Please upload an Excel file.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setProcessedData(null);

        try {
            const { uniqueNumbers } = await processColumnA(file);
            setProcessedData(uniqueNumbers);
        } catch (e) {
            if (e instanceof Error) {
                setError(`An error occurred: ${e.message}`);
            } else {
                setError("An unknown error occurred during processing.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [file]);

    const handleCopy = () => {
        if (!processedData) return;

        const dataString = processedData.join('\n');
        navigator.clipboard.writeText(dataString).then(() => {
            setCopyStatus('Copied!');
            setTimeout(() => setCopyStatus('Copy'), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            setCopyStatus('Failed!');
            setTimeout(() => setCopyStatus('Copy'), 2000);
        });
    };
    
    const resetState = () => {
        setFile(null);
        setProcessedData(null);
        setError(null);
        setCopyStatus('Copy');
    }

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-700 animate-fade-in-up">
             <header className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white">Column A Processor</h2>
                <p className="text-gray-400">Extract, clean, and deduplicate numbers from Column A of an Excel sheet.</p>
            </header>

            {error && (
                <div className="mb-4 p-4 text-center text-red-300 bg-red-900/50 border border-red-700 rounded-lg">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {!processedData ? (
                <>
                    <div className="max-w-md mx-auto">
                       <FileUploader
                            id="col-a-data"
                            label="Upload Raw Data"
                            description="Excel file with data in Column A"
                            onFileSelect={handleFileChange}
                            fileName={file?.name}
                        />
                    </div>
                    <div className="mt-8 text-center">
                        <button
                            onClick={handleProcess}
                            disabled={!file || isLoading}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 font-semibold text-lg text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105"
                        >
                            {isLoading ? <><SpinnerIcon />Processing...</> : <><PlayIcon />Process File</>}
                        </button>
                    </div>
                </>
            ) : (
                <div className="text-center">
                    <h3 className="text-xl font-semibold mb-4 text-green-400">Processing Complete</h3>
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-h-80 overflow-y-auto text-left">
                        <pre className="text-gray-300 whitespace-pre-wrap break-all" aria-label="Processed data from Column A">
                            <code>{processedData.join('\n')}</code>
                        </pre>
                    </div>
                    <p className="mt-4 text-gray-400 font-medium">
                        Total Unique Numbers Found: <span className="text-white font-bold text-lg">{processedData.length}</span>
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                        <button
                            onClick={handleCopy}
                            className="inline-flex items-center px-6 py-2 font-semibold text-sm text-white bg-gray-600 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-400 transition-colors duration-200"
                        >
                            <CopyIcon /> {copyStatus}
                        </button>
                        <button
                            onClick={resetState}
                            className="inline-flex items-center px-6 py-2 font-semibold text-gray-300 bg-blue-800 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition duration-300"
                        >
                            <RefreshIcon />
                            Process Another File
                        </button>
                    </div>
                </div>
            )}
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

export default ColumnAProcessor;
