
import React, { useRef } from 'react';
import { UploadIcon, FileIcon } from './Icons';

interface FileUploaderProps {
    id: string;
    label: string;
    description: string;
    onFileSelect: (file: File | null) => void;
    fileName?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ id, label, description, onFileSelect, fileName }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        onFileSelect(file);
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border-2 border-dashed border-gray-600 hover:border-blue-500 transition-colors duration-300 flex flex-col items-center justify-center text-center cursor-pointer h-full" onClick={handleClick}>
            <input
                type="file"
                id={id}
                ref={inputRef}
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
            />
            {fileName ? (
                <div className="flex flex-col items-center">
                    <FileIcon />
                    <span className="mt-2 text-sm font-medium text-green-400 break-all">{fileName}</span>
                     <span className="mt-1 text-xs text-gray-400">Click to change</span>
                </div>
            ) : (
                <div className="flex flex-col items-center">
                    <UploadIcon />
                    <h3 className="mt-2 text-base font-semibold text-white">{label}</h3>
                    <p className="mt-1 text-xs text-gray-400">{description}</p>
                </div>
            )}
        </div>
    );
};

export default FileUploader;
