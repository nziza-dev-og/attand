// src/app/admin/students/_components/StudentImportDialog.tsx
"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, AlertCircle } from "lucide-react";
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Student } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { enrollStudentsInTerm } from "@/ai/flows/enroll-students-flow";
import type { AcademicYear } from "@/lib/types";


interface StudentImportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  adminSchoolId: string | null;
  onImportSuccess: () => void;
  allClasses: { id: string; name: string; }[];
  activeAcademicYear: AcademicYear | null;
}

interface CsvStudent {
  Name?: string;
  StudentId?: string;
  AvatarURL?: string;
  ClassName?: string;
}

export function StudentImportDialog({ isOpen, onOpenChange, adminSchoolId, onImportSuccess, allClasses, activeAcademicYear }: StudentImportDialogProps) {
  const { toast } = useToast();
  const { translate } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [totalToImport, setTotalToImport] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      const fileType = selectedFile.type;
      const fileName = selectedFile.name.toLowerCase();

      if (
        fileType === "text/csv" || fileName.endsWith(".csv") ||
        fileType === "application/vnd.ms-excel" ||
        fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        fileName.endsWith(".xls") || fileName.endsWith(".xlsx")
      ) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError(translate("studentImportErrorInvalidFileTypeExcel") || "Invalid file type. Please upload a CSV, XLSX, or XLS file.");
        setFile(null);
      }
    }
  };

  const resetDialog = () => {
    setFile(null);
    setIsImporting(false);
    setImportProgress(0);
    setTotalToImport(0);
    setError(null);
  };

  const processAndImportData = async (dataToImport: CsvStudent[]) => {
    if (!adminSchoolId || !activeAcademicYear?.id || !activeAcademicYear?.activeTermId) {
        setError(translate("studentImportErrorNoSchoolId") || "Admin school context, active year, or active term is missing. Cannot import.");
        toast({ variant: "destructive", title: "Error", description: translate("studentImportErrorNoSchoolId") });
        setIsImporting(false);
        return;
    }

    const studentsToImport = dataToImport.filter(row => String(row.Name || "").trim() !== "");
    setTotalToImport(studentsToImport.length);

    if (studentsToImport.length === 0) {
      setError(translate("studentImportErrorNoStudentsInFile") || "No valid student records found in the file (ensure 'Name' column is present and not empty).");
      setIsImporting(false);
      return;
    }
    
    // Convert file content to a string to pass to the AI flow
    const fileContent = JSON.stringify(studentsToImport);

    try {
        const result = await enrollStudentsInTerm({
            fileContent,
            schoolId: adminSchoolId,
            academicYearId: activeAcademicYear.id,
            termId: activeAcademicYear.activeTermId,
            existingClasses: allClasses,
        });

        if (result.success) {
            toast({
                title: translate("studentImportSuccessTitle"),
                description: `${result.importedCount} students imported. ${result.unassignedCount > 0 ? `${result.unassignedCount} were unassigned due to class name mismatches.` : ''}`
            });
            onImportSuccess();
        } else {
            throw new Error(result.error || "AI flow failed to enroll students.");
        }

    } catch (flowError: any) {
        console.error("Error during AI enrollment flow:", flowError);
        setError(flowError.message || "An unexpected error occurred during the import process.");
        toast({
            variant: "destructive",
            title: "Import Failed",
            description: flowError.message || "The AI-powered import failed. Please check the file and try again.",
        });
    } finally {
        setIsImporting(false);
    }
  };


  const handleImport = async () => {
    if (!file) {
      setError(translate("studentImportErrorNoFile") || "Please select a file to import.");
      return;
    }
     if (!activeAcademicYear) {
      setError("No active academic year set. Please set one in Settings before importing.");
      return;
    }
    
    setIsImporting(true);
    setError(null);
    setImportProgress(0);

    const reader = new FileReader();

    const parseAndProcess = (fileData: ArrayBuffer | string) => {
        try {
            let jsonData: CsvStudent[] = [];
            if (file.name.endsWith('.csv') || file.type === 'text/csv') {
                Papa.parse<CsvStudent>(fileData as string, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        processAndImportData(results.data);
                    },
                    error: (err) => { throw new Error(`CSV Parsing: ${err.message}`); }
                });
            } else { // Excel
                const workbook = XLSX.read(fileData, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                jsonData = XLSX.utils.sheet_to_json<CsvStudent>(worksheet, { defval: "" });
                processAndImportData(jsonData);
            }
        } catch(parseError: any) {
             console.error("File Parsing Error:", parseError);
             setError(`${translate("studentImportErrorParsingFailed") || "Failed to parse file:"} ${parseError.message}`);
             setIsImporting(false);
        }
    };
    
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        reader.onload = (event) => parseAndProcess(event.target?.result as string);
        reader.readAsText(file);
    } else {
        reader.onload = (event) => parseAndProcess(event.target?.result as ArrayBuffer);
        reader.readAsArrayBuffer(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetDialog();
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> {translate("studentImportTitle") || "Import Students"}
          </DialogTitle>
          <DialogDescription>
            {translate("studentImportDescExcelCsvWithClass") || "Upload a CSV, XLSX, or XLS file. Required column: 'Name'. Optional: 'StudentId', 'AvatarURL', 'ClassName'. Students will be assigned to 'ClassName' if it matches an existing class in your school."}
          </DialogDescription>
           {activeAcademicYear && (
             <p className="text-sm text-blue-600 pt-2">Importing for: {activeAcademicYear.name} - Term {activeAcademicYear.activeTermId.replace('term','')}</p>
           )}
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="student-file-import" className="flex items-center gap-1">
                <FileText className="h-4 w-4" /> {translate("studentImportFileLabelExcelCsv") || "CSV or Excel File"}
            </Label>
            <Input
              id="student-file-import"
              type="file"
              accept=".csv, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, .xls, .xlsx"
              onChange={handleFileChange}
              disabled={isImporting}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {file && <p className="text-sm text-muted-foreground">{translate("studentImportSelectedFile") || "Selected:"} {file.name}</p>}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive p-2 border border-destructive/50 bg-destructive/10 rounded-md">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
            </div>
          )}

          {isImporting && (
            <div className="space-y-2">
              <Label>AI processing in progress...</Label>
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={resetDialog}>
              {translate("studentImportCancel") || "Cancel"}
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleImport} disabled={!file || isImporting}>
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {translate("studentImportButton") || "Import Students"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
