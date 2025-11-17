import React, { useState } from 'react';
import AssignerPage from './components/AssignerPage';
import ColumnAProcessor from './components/ColumnAProcessor';

type Page = 'assigner' | 'columnA';

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('assigner');

    const navButtonClasses = (page: Page) => 
        `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            currentPage === page 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`;

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
            <div className="w-full max-w-4xl mx-auto">
                <nav className="mb-8 flex justify-center items-center p-1 space-x-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-inner">
                    <button
                        onClick={() => setCurrentPage('assigner')}
                        className={navButtonClasses('assigner')}
                        aria-current={currentPage === 'assigner' ? 'page' : undefined}
                    >
                        TCHUB Assigner
                    </button>
                    <button
                        onClick={() => setCurrentPage('columnA')}
                        className={navButtonClasses('columnA')}
                        aria-current={currentPage === 'columnA' ? 'page' : undefined}
                    >
                        Column A Processor
                    </button>
                </nav>

                {currentPage === 'assigner' && <AssignerPage />}
                {currentPage === 'columnA' && <ColumnAProcessor />}

                <footer className="text-center mt-8 text-gray-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} TCHUB Assigner. All Rights Reserved.</p>
                </footer>
            </div>
        </div>
    );
};

export default App;
