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
type ZraxFilter = 'NONE' | 'ZOP' | 'OZ';

/**
 * Performs the initial data processing: reads files, cleans raw data, and performs VLOOKUPs.
 * Returns the processed data as an array of arrays, ready for the assignment step.
 */
export const runInitialProcessing = async (rawFile: File, infoFile: File, dupFile: File, zraxFilter: ZraxFilter): Promise<Row[]> => {
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

    // 2.1. Apply "Only ZRAX" (OZ) filter if selected
    if (zraxFilter === 'OZ') {
        const headerRow = rawData.length > 0 ? rawData[0] : [];
        const dataRows = rawData.length > 1 ? rawData.slice(1) : [];
        // Column Z is at index 25 in the original raw data
        const zraxOnlyData = dataRows.filter(row => row[25] === 'ZRAX');
        rawData = [headerRow, ...zraxOnlyData];
    }

    // 2.2. Convert Col A to numbers and remove duplicates
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

    // 2.3. Delete columns B, C, D, E, F, G (indices 1 to 6)
    rawData = rawData.map(row => [row[0], ...row.slice(7)]);

    // 2.4. Rename Col H (now at index 1) to "CTR"
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
 * Assigns work, generates the final Excel file, and calculates pivot data.
 * @returns An object containing the .xlsx file data and the pivot table data.
 */
export const assignAndGenerateExcel = async (
    processedData: Row[],
    cnAssignees: string[],
    jpAssignees: string[],
    specialAssignees: string[],
    generalAssignees: string[],
    zraxFilter: ZraxFilter
): Promise<{ fileData: Uint8Array; pivotData: { screener: string; count: number }[] }> => {
    
    // Create a deep copy of the header to avoid mutation issues
    const header = processedData.length > 0 ? [...processedData[0]] : [];
    if (processedData.length < 2) { // Only header or empty
        const ws = XLSX.utils.aoa_to_sheet([header]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Assigned_Data');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        return { fileData: new Uint8Array(wbout), pivotData: [] };
    }
    
    const dataRows = processedData.slice(1);

    const dupLookupIndex = header.findIndex((h: string) => h === 'Dup_VLOOKUP');
    if (dupLookupIndex === -1) {
        throw new Error("'Dup_VLOOKUP' column not found. Cannot perform filtering.");
    }
    
    // 1. Filter rows to keep only those with '#N/A' in 'Dup_VLOOKUP'
    const filteredRows = dataRows.filter(row => row[dupLookupIndex] === '#N/A');

    // Helper function to categorize and assign a given set of rows
    const processAndAssign = (rowsToAssign: Row[]): Row[] => {
        const infoLookupIndex = header.findIndex((h: string) => h === 'Info_VLOOKUP');
        if (infoLookupIndex === -1) throw new Error("'Info_VLOOKUP' column not found.");
        
        const cnRows: Row[] = [], jpRows: Row[] = [], specialRows: Row[] = [], generalRows: Row[] = [];
        const specialCodes = new Set(['RU', 'UA', 'NI', 'VE', 'BY', 'CU', 'IR', 'KP', 'SY']);

        rowsToAssign.forEach((row: Row) => {
            const infoValue = row[infoLookupIndex] ? String(row[infoLookupIndex]).toUpperCase() : '';
            if (infoValue.includes('CN')) cnRows.push([...row]);
            else if (infoValue.includes('JP')) jpRows.push([...row]);
            else if (Array.from(specialCodes).some(code => infoValue.includes(code))) specialRows.push([...row]);
            else generalRows.push([...row]);
        });

        if (cnAssignees.length > 0) cnRows.forEach((row, index) => row.unshift(cnAssignees[index % cnAssignees.length]));
        else cnRows.forEach(row => row.unshift('UNASSIGNED_CN'));

        if (jpAssignees.length > 0) jpRows.forEach((row, index) => row.unshift(jpAssignees[index % jpAssignees.length]));
        else jpRows.forEach(row => row.unshift('UNASSIGNED_JP'));

        if (specialAssignees.length > 0) specialRows.forEach((row, index) => row.unshift(specialAssignees[index % specialAssignees.length]));
        else specialRows.forEach(row => row.unshift('UNASSIGNED_SPECIAL'));

        if (generalAssignees.length > 0) generalRows.forEach((row, index) => row.unshift(generalAssignees[index % generalAssignees.length]));
        else generalRows.forEach(row => row.unshift('UNASSIGNED_GENERAL'));

        return [...cnRows, ...jpRows, ...specialRows, ...generalRows];
    };
    
    let finalAssignedRows: Row[];

    if (zraxFilter === 'ZOP') {
        const zColIndex = 19; // Original Col Z (index 25) is now at 19 after removing B-G (6 cols)
        const zraxRows: Row[] = [];
        const otherRows: Row[] = [];
        
        filteredRows.forEach(row => {
            // Ensure the row has enough columns to prevent errors
            if (row.length > zColIndex && row[zColIndex] === 'ZRAX') {
                zraxRows.push(row);
            } else {
                otherRows.push(row);
            }
        });

        const assignedZrax = processAndAssign(zraxRows);
        const assignedOthers = processAndAssign(otherRows);
        finalAssignedRows = [...assignedZrax, ...assignedOthers];
    } else {
        finalAssignedRows = processAndAssign(filteredRows);
    }

    const screenerCounts = new Map<string, number>();
    finalAssignedRows.forEach(row => {
        const screener = row[0] as string;
        screenerCounts.set(screener, (screenerCounts.get(screener) || 0) + 1);
    });

    const pivotData = Array.from(screenerCounts.entries()).map(([screener, count]) => ({
        screener,
        count
    })).sort((a, b) => a.screener.localeCompare(b.screener));

    // 5. Prepare final sheet for download
    
    // 5.1. Find and remove the 'CTR' column
    const ctrIndex = header.findIndex((h: string) => h === 'CTR');
    if (ctrIndex !== -1) {
        // Remove from the original header array
        header.splice(ctrIndex, 1);
        
        // Remove from each assigned data row. The original columns are shifted by 1 due to 'Screener'
        finalAssignedRows.forEach(row => {
            row.splice(ctrIndex + 1, 1);
        });
    }

    // 5.2. Prepend 'Screener' to the modified header
    header.unshift('Screener');
    const finalSheetData = [header, ...finalAssignedRows];

    // 5.3. Create worksheet and apply header styling
    const finalWs = XLSX.utils.aoa_to_sheet(finalSheetData);

    const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "FF4F46E5" } } // Blue background to match UI
    };

    const range = XLSX.utils.decode_range(finalWs['!ref']);
    if (range && range.e.r >= 0) { // Check if there's at least one row (the header)
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
            const cell = finalWs[cellAddress];
            if (cell) {
                cell.s = headerStyle;
            }
        }
    }
    
    const finalWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(finalWb, finalWs, 'Assigned_Data');

    const wbout = XLSX.write(finalWb, { bookType: 'xlsx', type: 'array' });
    const fileData = new Uint8Array(wbout);

    return { fileData, pivotData };
};

/**
 * Processes a single Excel file to extract unique numbers from Column A.
 */
export const processColumnA = async (file: File): Promise<{ uniqueNumbers: number[] }> => {
    if (typeof XLSX === 'undefined') {
        throw new Error('XLSX library is not loaded.');
    }

    const buffer = await readFileAsArrayBuffer(file);
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) throw new Error("File is empty or corrupted.");
    
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    const seen = new Set<number>();
    // Iterate through all rows, starting from the first row
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        // Ensure row and cell exist before processing
        if (row && row.length > 0 && row[0] !== null) {
            const valA = Number(row[0]);
            // Check if the conversion to number is successful
            if (!isNaN(valA)) {
                seen.add(valA);
            }
        }
    }
    
    return { uniqueNumbers: Array.from(seen).sort((a, b) => a - b) };
};