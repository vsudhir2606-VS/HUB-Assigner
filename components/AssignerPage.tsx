import React, { useState, useCallback } from 'react';
import type { ExcelFileState } from '../types';
import { runInitialProcessing, assignAndGenerateExcel } from '../services/excelProcessor';
import FileUploader from './FileUploader';
import AssignmentModal from './AssignmentModal';
import Dashboard from './Dashboard';
import { PlayIcon, SpinnerIcon } from './Icons';

declare const saveAs: any;

const AssignerPage: React.FC = () => {
    const [files, setFiles] = useState<ExcelFileState>({
        raw: null,
        info: null,
        duplicate: null,
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isAssigning, setIsAssigning] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [processedDataForAssignment, setProcessedDataForAssignment] = useState<any[] | null>(null);
    const [showAssignmentModal, setShowAssignmentModal] = useState<boolean>(false);
    const [pivotData, setPivotData] = useState<{ screener: string; count: number }[] | null>(null);
    const [showDashboard, setShowDashboard] = useState<boolean>(false);
    const [zraxFilter, setZraxFilter] = useState<'NONE' | 'ZOP' | 'OZ'>('NONE');

    const handleFileChange = (fileType: keyof ExcelFileState) => (file: File | null) => {
        setFiles(prev => ({ ...prev, [fileType]: file }));
        setError(null);
        setSuccessMessage(null);
    };
    
    const resetState = () => {
        setFiles({ raw: null, info: null, duplicate: null });
        setProcessedDataForAssignment(null);
        setShowAssignmentModal(false);
        setIsAssigning(false);
        setShowDashboard(false);
        setPivotData(null);
        setError(null);
        setSuccessMessage(null);
        setZraxFilter('NONE');
    };

    const handleProcess = useCallback(async () => {
        if (!files.raw || !files.info || !files.duplicate) {
            setError("Please upload all three required Excel files.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const processedData = await runInitialProcessing(files.raw, files.info, files.duplicate, zraxFilter);
            setProcessedDataForAssignment(processedData);
            setShowAssignmentModal(true);
            setSuccessMessage("Step 1 Complete: Data processed. Now assign screeners.");
        } catch (e) {
            if (e instanceof Error) {
                setError(`An error occurred: ${e.message}`);
            } else {
                setError("An unknown error occurred during processing.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [files, zraxFilter]);

    const handleFinalizeDownload = async (cnNames: string[], jpNames: string[], specialNames: string[], generalNames: string[]) => {
        if (!processedDataForAssignment) return;
        
        setIsAssigning(true);
        setError(null);

        try {
            const { fileData, pivotData } = await assignAndGenerateExcel(processedDataForAssignment, cnNames, jpNames, specialNames, generalNames, zraxFilter);
            const blob = new Blob([fileData], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(blob, "Assigned_Report.xlsx");
            
            setPivotData(pivotData);
            setShowDashboard(true);
            setShowAssignmentModal(false);
            setSuccessMessage("Success! Your download has started. See assignment summary below.");
        } catch (e) {
            if (e instanceof Error) {
                setError(`An error occurred during assignment: ${e.message}`);
            } else {
                setError("An unknown error occurred during assignment.");
            }
             // Keep modal open on error to allow retry
        } finally {
            setIsAssigning(false);
        }
    };

    const handleCancelAssignment = () => {
        setShowAssignmentModal(false);
        setProcessedDataForAssignment(null);
        setSuccessMessage(null);
    };
    
    const handleZraxFilterChange = (filter: 'ZOP' | 'OZ') => {
        setZraxFilter(prev => (prev === filter ? 'NONE' : filter));
    };

    const getFilterButtonClasses = (filter: 'ZOP' | 'OZ') => `
        px-3 py-1 text-xs font-bold rounded-full transition-colors duration-200 border-2 
        ${zraxFilter === filter
            ? 'bg-purple-600 border-purple-500 text-white shadow-lg'
            : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600'
        }
    `;

    const allFilesUploaded = files.raw && files.info && files.duplicate;

    return (
        <>
            <header className="text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                    TCHUB Assigner
                </h1>
                <p className="text-lg text-gray-400">
                    Automate your data workflow: Process, Assign, and Download.
                </p>
            </header>
            
            {error && (
                <div className="mb-6 p-4 text-center text-red-300 bg-red-900/50 border border-red-700 rounded-lg">
                    <strong>Error:</strong> {error}
                </div>
            )}
            {successMessage && !showAssignmentModal && (
                <div className="mb-6 p-4 text-center text-green-300 bg-green-900/50 border border-green-700 rounded-lg">
                    {successMessage}
                </div>
            )}

            {showDashboard && pivotData ? (
                 <Dashboard data={pivotData} onReset={resetState} />
            ) : (
                <main className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <FileUploader
                            id="raw-data"
                            label="1. Raw Data Sheet"
                            description="Main data to be assigned."
                            onFileSelect={handleFileChange('raw')}
                            fileName={files.raw?.name}
                        />
                        <FileUploader
                            id="info-data"
                            label="2. Information Sheet"
                            description="Contains VLOOKUP data."
                            onFileSelect={handleFileChange('info')}
                            fileName={files.info?.name}
                        />
                        <FileUploader
                            id="duplicate-data"
                            label="3. Duplicate Data Sheet"
                            description="Master Hold Report."
                            onFileSelect={handleFileChange('duplicate')}
                            fileName={files.duplicate?.name}
                        />
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                        <div className="flex items-center gap-2 p-2 bg-gray-900/50 border border-gray-700 rounded-full order-1 sm:order-2">
                            <button
                                onClick={() => handleZraxFilterChange('ZOP')}
                                className={getFilterButtonClasses('ZOP')}
                                title="Prioritize 'ZRAX' rows from Column Z"
                            >
                                ZOP
                            </button>
                            <button
                                onClick={() => handleZraxFilterChange('OZ')}
                                className={getFilterButtonClasses('OZ')}
                                title="Process ONLY 'ZRAX' rows from Column Z"
                            >
                                OZ
                            </button>
                        </div>
                        <button
                            onClick={handleProcess}
                            disabled={!allFilesUploaded || isLoading}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 font-semibold text-lg text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 order-2 sm:order-1"
                        >
                            {isLoading ? (
                                <>
                                    <SpinnerIcon />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <PlayIcon />
                                    Process Files
                                </>
                            )}
                        </button>
                    </div>
                </main>
            )}
             {showAssignmentModal && (
                <AssignmentModal
                    onAssign={handleFinalizeDownload}
                    onCancel={handleCancelAssignment}
                    isAssigning={isAssigning}
                    initialMessage={successMessage}
                />
            )}
        </>
    );
};

export default AssignerPage;