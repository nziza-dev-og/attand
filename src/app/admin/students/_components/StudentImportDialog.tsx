
"use client";

import * as React from "react";
import { useState } from "react";
import { collection, Timestamp, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, AlertCircle } from "lucide-react";
import Papa from 'papaparse';
import type { Student, UserProfile } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface StudentImportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  adminSchoolId: string | null;
  onImportSuccess: () => void;
}

interface CsvStudent {
  Name?: string;
  Email?: string;
  StudentInfo?: string;
  AvatarURL?: string; // Optional Avatar URL column
}

const BATCH_SIZE = 100; // Firestore batch write limit is 500, but smaller batches are safer

export function StudentImportDialog({ isOpen, onOpenChange, adminSchoolId, onImportSuccess }: StudentImportDialogProps) {
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
      if (selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv") || selectedFile.type === "application/vnd.ms-excel") {
        setFile(selectedFile);
        setError(null);
      } else {
        setError(translate("studentImportErrorInvalidFileType") || "Invalid file type. Please upload a CSV file. If using Excel, please 'Save As' CSV.");
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

  const handleImport = async () => {
    if (!file) {
      setError(translate("studentImportErrorNoFile") || "Please select a CSV file to import.");
      return;
    }
    if (!adminSchoolId) {
      setError(translate("studentImportErrorNoSchoolId") || "Admin school context is missing. Cannot import.");
      toast({ variant: "destructive", title: "Error", description: translate("studentImportErrorNoSchoolId") });
      return;
    }

    setIsImporting(true);
    setError(null);
    setImportProgress(0);

    Papa.parse<CsvStudent>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const studentsToImport = results.data.filter(row => row.Name && row.Name.trim() !== "");
        setTotalToImport(studentsToImport.length);

        if (studentsToImport.length === 0) {
          setError(translate("studentImportErrorNoStudentsInFile") || "No valid student records found in the file (ensure 'Name' column is present and not empty).");
          setIsImporting(false);
          return;
        }

        let importedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < studentsToImport.length; i += BATCH_SIZE) {
          const batch = writeBatch(db);
          const chunk = studentsToImport.slice(i, i + BATCH_SIZE);

          chunk.forEach((csvStudent) => {
            if (!csvStudent.Name || csvStudent.Name.trim() === "") {
              console.warn("Skipping row due to missing Name:", csvStudent);
              errorCount++;
              return; 
            }
            
            const studentDocRef = doc(collection(db, "users")); 
            const studentData: Omit<Student, 'id' | 'uid' | 'parentIds' | 'classIds'> & Partial<Pick<Student, 'classIds'>> = {
              name: csvStudent.Name.trim(),
              email: csvStudent.Email?.trim() || null,
              role: "Student",
              studentInfo: csvStudent.StudentInfo?.trim() || null,
              avatarUrl: csvStudent.AvatarURL?.trim() || null,
              createdAt: Timestamp.now(),
              schoolId: adminSchoolId,
            };
            batch.set(studentDocRef, studentData);
          });

          try {
            await batch.commit();
            importedCount += chunk.length - chunk.filter(s => !s.Name || s.Name.trim() === "").length; 
            setImportProgress(importedCount);
          } catch (batchError) {
            console.error("Error importing batch:", batchError);
            errorCount += chunk.length; 
            toast({
              variant: "destructive",
              title: translate("studentImportErrorBatchFailedTitle") || "Batch Import Failed",
              description: `${translate("studentImportErrorBatchFailedDesc") || "A batch of students could not be imported."} ${batchError instanceof Error ? batchError.message : ""}`,
            });
          }
        }
        
        setIsImporting(false);

        if (importedCount > 0) {
          toast({
            title: translate("studentImportSuccessTitle") || "Import Successful",
            description: translate("studentImportSuccessDesc", { count: importedCount.toString() }),
          });
          onImportSuccess();
        }
        if (errorCount > 0) {
          toast({
            variant: "warning",
            title: translate("studentImportWarningTitle") || "Import Warnings",
            description: translate("studentImportWarningDesc", { count: errorCount.toString() }),
          });
        }
        if (importedCount === 0 && errorCount === 0 && studentsToImport.length > 0) {
             setError(translate("studentImportErrorNoStudentsInFile") || "No valid student records found in the file (ensure 'Name' column is present and not empty).");
        } else if (importedCount === 0 && errorCount > 0) {
            setError(translate("studentImportErrorAllFailed") || "All student records failed to import. Check file format and console for errors.");
        }
      },
      error: (err) => {
        console.error("CSV Parsing Error:", err);
        setError(`${translate("studentImportErrorParsingFailed") || "Failed to parse CSV file:"} ${err.message}`);
        setIsImporting(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetDialog();
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> {translate("studentImportTitle") || "Import Students from CSV"}
          </DialogTitle>
          <DialogDescription>
            {translate("studentImportDescCsvOnly") || "Upload a CSV file. Required column: 'Name'. Optional: 'Email', 'StudentInfo'. For profile pictures, include an 'AvatarURL' column with image URLs. Excel: 'Save As' CSV."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="student-csv-file" className="flex items-center gap-1">
                <FileText className="h-4 w-4" /> {translate("studentImportFileLabel") || "CSV File"}
            </Label>
            <Input
              id="student-csv-file"
              type="file"
              accept=".csv, text/csv" 
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
              <Label>{translate("studentImportProgress") || "Import Progress:"} {importProgress} / {totalToImport}</Label>
              <div className="w-full bg-secondary rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${totalToImport > 0 ? (importProgress / totalToImport) * 100 : 0}%` }}
                ></div>
              </div>
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
