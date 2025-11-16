import React, { useState, useCallback } from 'react';
import type { ExcelFileState } from './types';
import { runInitialProcessing, assignAndGenerateExcel } from './services/excelProcessor';
import FileUploader from './components/FileUploader';
import AssignmentModal from './components/AssignmentModal';
import { PlayIcon, SpinnerIcon } from './components/Icons';

declare const saveAs: any;

const App: React.FC = () => {
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
        // Keep success/error messages for user feedback
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
            const processedData = await runInitialProcessing(files.raw, files.info, files.duplicate);
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
    }, [files]);

    const handleFinalizeDownload = async (cnNames: string[], jpNames: string[], specialNames: string[], generalNames: string[]) => {
        if (!processedDataForAssignment) return;
        
        setIsAssigning(true);
        setError(null);

        try {
            const excelData = await assignAndGenerateExcel(processedDataForAssignment, cnNames, jpNames, specialNames, generalNames);
            const blob = new Blob([excelData], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(blob, "Assigned_Report.xlsx");
            setSuccessMessage("Work assigned successfully! Your download has started.");
            resetState();
        } catch (e) {
            if (e instanceof Error) {
                setError(`An error occurred during assignment: ${e.message}`);
            } else {
                setError("An unknown error occurred during assignment.");
            }
             // Keep modal open on error to allow retry
            setIsAssigning(false);
        }
    };

    const handleCancelAssignment = () => {
        setShowAssignmentModal(false);
        setProcessedDataForAssignment(null);
        setSuccessMessage(null);
    };
    
    const allFilesUploaded = files.raw && files.info && files.duplicate;

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
            <div className="w-full max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                        TCHUB Assigner
                    </h1>
                    <p className="text-lg text-gray-400">
                        Automate your data workflow: Process, Assign, and Download.
                    </p>
                </header>

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

                    <div className="mt-8 text-center">
                        <button
                            onClick={handleProcess}
                            disabled={!allFilesUploaded || isLoading}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 font-semibold text-lg text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105"
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

                    {error && (
                        <div className="mt-6 p-4 text-center text-red-300 bg-red-900/50 border border-red-700 rounded-lg">
                            <strong>Error:</strong> {error}
                        </div>
                    )}
                    {successMessage && !showAssignmentModal && (
                        <div className="mt-6 p-4 text-center text-green-300 bg-green-900/50 border border-green-700 rounded-lg">
                            {successMessage}
                        </div>
                    )}
                </main>
                 <footer className="text-center mt-8 text-gray-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} TCHUB Assigner. All Rights Reserved.</p>
                </footer>
            </div>
            {showAssignmentModal && (
                <AssignmentModal
                    onAssign={handleFinalizeDownload}
                    onCancel={handleCancelAssignment}
                    isAssigning={isAssigning}
                    initialMessage={successMessage}
                />
            )}
        </div>
    );
};

export default App;