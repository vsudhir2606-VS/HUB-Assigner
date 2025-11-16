declare const XLSX: any;

// Helper to read a file into an ArrayBuffer using a Promise
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
};

type Row = any[];

/**
 * Performs the initial data processing: reads files, cleans raw data, and performs VLOOKUPs.
 * Returns the processed data as an array of arrays, ready for the assignment step.
 */
export const runInitialProcessing = async (rawFile: File, infoFile: File, dupFile: File): Promise<Row[]> => {
    // This function processes the three uploaded Excel files.
    // - rawFile: Corresponds to "Excel 1", the main data sheet.
    // - infoFile: Corresponds to "Excel 2", the information sheet for the first VLOOKUP.
    // - dupFile: Corresponds to "Excel 3", the duplicate data for the second VLOOKUP.

    if (typeof XLSX === 'undefined') {
        throw new Error('XLSX library is not loaded. Please check the script tag in index.html.');
    }

    // 1. Read all files into workbooks
    const [rawBuffer, infoBuffer, dupBuffer] = await Promise.all([
        readFileAsArrayBuffer(rawFile),
        readFileAsArrayBuffer(infoFile),
        readFileAsArrayBuffer(dupFile),
    ]);

    const rawWb = XLSX.read(rawBuffer, { type: 'array' });
    const infoWb = XLSX.read(infoBuffer, { type: 'array' });
    const dupWb = XLSX.read(dupBuffer, { type: 'array' });

    // 2. Process Raw Data (Excel 1)
    const rawWs = rawWb.Sheets[rawWb.SheetNames[0]];
    if (!rawWs) throw new Error("Raw Data file is empty or corrupted.");
    let rawData: Row[] = XLSX.utils.sheet_to_json(rawWs, { header: 1, defval: "" });

    // 2.1. Convert Col A to numbers and remove duplicates
    const seen = new Set<number>();
    const uniqueData: Row[] = [];
    const header = rawData.length > 0 ? rawData[0] : [];
    uniqueData.push(header); // Keep header

    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        const valA = Number(row[0]);
        if (!isNaN(valA) && !seen.has(valA)) {
            seen.add(valA);
            row[0] = valA; // Update row with number type
            uniqueData.push(row);
        }
    }
    rawData = uniqueData;

    // 2.2. Delete columns B, C, D, E, F, G (indices 1 to 6)
    rawData = rawData.map(row => [row[0], ...row.slice(7)]);

    // 2.3. Rename Col H (now at index 1) to "CTR"
    if (rawData.length > 0 && rawData[0].length > 1) {
        rawData[0][1] = 'CTR';
    }

    // 3. Process Info File (Excel 2) for first VLOOKUP.
    // This section simulates the formula: =VLOOKUP(A2,'[Excel 2.xlsx]Sheet3'!$B:$H,6,0)
    const infoSheetName = infoWb.SheetNames.find((name: string) => name.toLowerCase().includes('sheet3')) || infoWb.SheetNames[0];
    if (!infoSheetName || !infoWb.Sheets[infoSheetName]) throw new Error("Could not find a usable worksheet in the Information file. Please ensure it contains a sheet named 'Sheet3' or that the data is in the first sheet.");
    const infoWs = infoWb.Sheets[infoSheetName];
    const infoData: Row[] = XLSX.utils.sheet_to_json(infoWs, { header: 1, defval: "" });

    const infoLookup = new Map<number, any>();
    const infoSeen = new Set<number>();
    for (let i = 1; i < infoData.length; i++) {
        const row = infoData[i];
        const key = Number(row[1]); // Convert column B to number
        if (!isNaN(key) && !infoSeen.has(key)) {
            infoSeen.add(key);
            infoLookup.set(key, row[6]); // Value is from column G (6th column in B:H)
        }
    }

    // 4. Process Duplicate File (Excel 3) for second VLOOKUP.
    // This section simulates the formula: =VLOOKUP(A2,'[Master Hold Report .xlsx]Master Hold Report'!$G:$G,1,0)
    const dupSheetName = dupWb.SheetNames.find((name: string) => name.toLowerCase().includes('master hold report')) || dupWb.SheetNames[0];
    if (!dupSheetName || !dupWb.Sheets[dupSheetName]) throw new Error("Could not find a usable worksheet in the Duplicate file. Please ensure it contains a sheet named 'Master Hold Report' or that the data is in the first sheet.");
    const dupWs = dupWb.Sheets[dupSheetName];
    const dupData: Row[] = XLSX.utils.sheet_to_json(dupWs, { header: 1, defval: "" });

    const dupLookup = new Set<number>();
     for (let i = 1; i < dupData.length; i++) {
        const row = dupData[i];
        const key = Number(row[6]); // Column G
        if (!isNaN(key)) {
            dupLookup.add(key);
        }
    }

    // 5. Combine data and perform VLOOKUPs on Raw Data (Excel 1)
    const finalData = rawData.map((row, index) => {
        if (index === 0) {
            return [...row, 'Info_VLOOKUP', 'Dup_VLOOKUP'];
        }
        const key = row[0];
        const infoValue = infoLookup.get(key) ?? '#N/A';
        const dupValue = dupLookup.has(key) ? key : '#N/A'; 
        return [...row, infoValue, dupValue];
    });

    return finalData;
};

/**
 * Assigns work to screeners and generates the final Excel file.
 * @param processedData - The data array from runInitialProcessing.
 * @param cnAssignees - Array of names for CN tasks.
 * @param jpAssignees - Array of names for JP tasks.
 * @param specialAssignees - Array of names for RU, UA, NI, VE, BY tasks.
 * @param generalAssignees - Array of names for all other tasks.
 * @returns A Uint8Array representing the final .xlsx file.
 */
export const assignAndGenerateExcel = async (
    processedData: Row[],
    cnAssignees: string[],
    jpAssignees: string[],
    specialAssignees: string[],
    generalAssignees: string[]
): Promise<Uint8Array> => {
    if (processedData.length < 2) { // Only header or empty
        const ws = XLSX.utils.aoa_to_sheet(processedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Assigned_Data');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        return new Uint8Array(wbout);
    }
    
    const header = processedData[0];
    const dataRows = processedData.slice(1);

    const dupLookupIndex = header.findIndex((h: string) => h === 'Dup_VLOOKUP');
    if (dupLookupIndex === -1) {
        throw new Error("'Dup_VLOOKUP' column not found. Cannot perform filtering.");
    }
    
    // 1. Filter rows to keep only those with '#N/A' in 'Dup_VLOOKUP'
    const filteredRows = dataRows.filter(row => row[dupLookupIndex] === '#N/A');

    const infoLookupIndex = header.findIndex((h: string) => h === 'Info_VLOOKUP');
    if (infoLookupIndex === -1) {
        throw new Error("'Info_VLOOKUP' column not found. Cannot perform assignment.");
    }
    // Add "Screener" as the first column header
    header.unshift('Screener');

    const cnRows: Row[] = [];
    const jpRows: Row[] = [];
    const specialRows: Row[] = [];
    const generalRows: Row[] = [];
    
    const specialCodes = new Set(['RU', 'UA', 'NI', 'VE', 'BY']);

    // 2. Categorize rows based on 'Info_VLOOKUP' value
    filteredRows.forEach((row: Row) => {
        const infoValue = row[infoLookupIndex] ? String(row[infoLookupIndex]).toUpperCase() : '';
        if (infoValue.includes('CN')) {
            cnRows.push(row);
        } else if (infoValue.includes('JP')) {
            jpRows.push(row);
        } else if (Array.from(specialCodes).some(code => infoValue.includes(code))) {
            specialRows.push(row);
        } else {
            generalRows.push(row);
        }
    });

    // 3. Assign work for each category, adding the name to the beginning of the row
    if (cnAssignees.length > 0) {
        cnRows.forEach((row, index) => {
            row.unshift(cnAssignees[index % cnAssignees.length]);
        });
    } else {
        cnRows.forEach(row => row.unshift('UNASSIGNED_CN'));
    }

    if (jpAssignees.length > 0) {
        jpRows.forEach((row, index) => {
            row.unshift(jpAssignees[index % jpAssignees.length]);
        });
    } else {
        jpRows.forEach(row => row.unshift('UNASSIGNED_JP'));
    }

    if (specialAssignees.length > 0) {
        specialRows.forEach((row, index) => {
            row.unshift(specialAssignees[index % specialAssignees.length]);
        });
    } else {
        specialRows.forEach(row => row.unshift('UNASSIGNED_SPECIAL'));
    }

    if (generalAssignees.length > 0) {
        generalRows.forEach((row, index) => {
            row.unshift(generalAssignees[index % generalAssignees.length]);
        });
    } else {
        generalRows.forEach(row => row.unshift('UNASSIGNED_GENERAL'));
    }
    
    // 4. Combine all categorized and assigned rows
    const finalAssignedData = [header, ...cnRows, ...jpRows, ...specialRows, ...generalRows];
    const finalWs = XLSX.utils.aoa_to_sheet(finalAssignedData);
    const finalWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(finalWb, finalWs, 'Assigned_Data');

    const wbout = XLSX.write(finalWb, { bookType: 'xlsx', type: 'array' });
    return new Uint8Array(wbout);
};