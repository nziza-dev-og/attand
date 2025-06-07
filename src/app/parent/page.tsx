
// src/app/parent/page.tsx
"use client"; // Use client component for hooks and state

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { User, CalendarDays, BarChart3, Loader2, ImageIcon, Save, UserCircle, Info } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, collectionGroup, Timestamp, updateDoc } from 'firebase/firestore';
import { updateProfile } from "firebase/auth";
import type { Student, AttendanceRecord, Parent, UserProfile } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Function to get initials from name
const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
};

// Function to calculate attendance percentage (simplified)
const calculateAttendancePercentage = (records: AttendanceRecord[]): number => {
  if (records.length === 0) return 100; 

  const presentOrLateCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const percentage = Math.round((presentOrLateCount / records.length) * 100);
  return percentage;
};

interface ChildWithAttendance extends Student {
    attendancePercentage: number;
}

interface SchoolAdminDetails {
  name?: string;
  email?: string;
  phoneNumber?: string;
  schoolName?: string;
}


export default function ParentDashboard() {
    const { user: authUser, loading: authLoading } = useAuth();
    const { translate } = useLanguage();
    const { toast } = useToast();
    const [childrenData, setChildrenData] = useState<ChildWithAttendance[]>([]);
    const [parentName, setParentName] = useState<string>(translate('parent') || 'Parent');
    const [parentAvatarUrl, setParentAvatarUrl] = useState<string>("");
    const [newAvatarUrlInput, setNewAvatarUrlInput] = useState<string>("");
    const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [schoolAdminDetails, setSchoolAdminDetails] = useState<SchoolAdminDetails | null>(null);
    const [loadingAdminDetails, setLoadingAdminDetails] = useState(false);


    useEffect(() => {
        const fetchParentAndChildrenData = async () => {
            if (authLoading || !authUser) {
                 if (!authLoading && !authUser) {
                    setLoadingData(false);
                    setLoadingProfile(false);
                    setLoadingAdminDetails(false);
                 }
                return;
            }
            setLoadingData(true);
            setLoadingProfile(true);
            setError(null);
            try {
                const parentDocRef = doc(db, 'users', authUser.uid);
                const parentDocSnap = await getDoc(parentDocRef);

                if (!parentDocSnap.exists() || parentDocSnap.data().role !== 'Parent') {
                    setError(translate('parentProfileError') || "Parent profile not found or user is not a parent.");
                    setLoadingData(false);
                    setLoadingProfile(false);
                    setLoadingAdminDetails(false);
                    return;
                }

                const parentData = parentDocSnap.data() as Parent; 
                setParentName(parentData.name || authUser.displayName || authUser.email || translate('parent') || 'Parent');
                setParentAvatarUrl(parentData.avatarUrl || authUser.photoURL || "");
                setNewAvatarUrlInput(parentData.avatarUrl || authUser.photoURL || "");
                setLoadingProfile(false);

                // Fetch School Admin Details if parentData.schoolId exists
                if (parentData.schoolId) {
                  setLoadingAdminDetails(true);
                  try {
                    const adminDocRef = doc(db, 'users', parentData.schoolId);
                    const adminDocSnap = await getDoc(adminDocRef);
                    if (adminDocSnap.exists()) {
                      const adminData = adminDocSnap.data() as UserProfile;
                      setSchoolAdminDetails({
                        name: adminData.name,
                        email: adminData.email,
                        phoneNumber: adminData.phoneNumber,
                        schoolName: adminData.schoolName,
                      });
                    } else {
                      console.warn(`Admin details not found for schoolId: ${parentData.schoolId}`);
                      setSchoolAdminDetails(null);
                    }
                  } catch (adminError) {
                    console.error("Error fetching school admin details for parent:", adminError);
                    setSchoolAdminDetails(null);
                    toast({ variant: "destructive", title: translate('errorTitle'), description: translate('errorLoadingAdminDetails')});
                  } finally {
                    setLoadingAdminDetails(false);
                  }
                } else {
                    // If no schoolId on parent, try to get it from the first child's schoolId if children exist
                    // This is a fallback if parent isn't directly associated via school code at signup
                }


                const childIds = parentData.childIds || [];

                if (childIds.length === 0) {
                    setChildrenData([]);
                    setLoadingData(false);
                    if (!parentData.schoolId) setLoadingAdminDetails(false); // Ensure admin loading stops if no children and no parent schoolId
                    return;
                }

                let firstChildSchoolId: string | null = null;

                const childrenPromises = childIds.map(async (childId) => {
                    try {
                        const studentDocRef = doc(db, 'users', childId); 
                        const studentDocSnap = await getDoc(studentDocRef);

                         if (!studentDocSnap.exists() || studentDocSnap.data().role !== 'Student') {
                             console.warn(`Child document not found or not a student for ID: ${childId}`);
                             return null; 
                         }

                         const studentData = studentDocSnap.data() as Student; // Explicitly cast
                         if (!firstChildSchoolId && studentData.schoolId) {
                            firstChildSchoolId = studentData.schoolId;
                         }

                         const attendanceQuery = query(
                             collection(db, 'attendanceRecords'),
                             where('studentId', '==', childId)
                         );
                         const attendanceSnap = await getDocs(attendanceQuery);
                         const attendanceRecords = attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
                         const attendancePercentage = calculateAttendancePercentage(attendanceRecords);

                         return {
                             id: studentDocSnap.id,
                             name: studentData.name || translate('unknownChild') || 'Unknown Child',
                             parentIds: studentData.parentIds || [],
                             role: 'Student', 
                             createdAt: studentData.createdAt as Timestamp, 
                             avatarUrl: studentData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentData.name || 'U')}&background=random`, 
                             attendancePercentage: attendancePercentage,
                             schoolId: studentData.schoolId, // Keep schoolId from student
                         } as ChildWithAttendance;

                    } catch (childError) {
                         console.error(`Error fetching data for child ${childId}:`, childError);
                         return null; 
                    }
                });

                 const resolvedChildren = (await Promise.all(childrenPromises)).filter(child => child !== null) as ChildWithAttendance[];
                 setChildrenData(resolvedChildren);

                 // If admin details weren't fetched via parent.schoolId, try with first child's schoolId
                 if (!parentData.schoolId && firstChildSchoolId && !schoolAdminDetails) {
                    setLoadingAdminDetails(true);
                    try {
                        const adminDocRef = doc(db, 'users', firstChildSchoolId);
                        const adminDocSnap = await getDoc(adminDocRef);
                        if (adminDocSnap.exists()) {
                          const adminData = adminDocSnap.data() as UserProfile;
                          setSchoolAdminDetails({
                            name: adminData.name,
                            email: adminData.email,
                            phoneNumber: adminData.phoneNumber,
                            schoolName: adminData.schoolName,
                          });
                        } else {
                          setSchoolAdminDetails(null);
                        }
                    } catch (adminError) {
                        console.error("Error fetching admin details via child's schoolId:", adminError);
                        setSchoolAdminDetails(null);
                    } finally {
                        setLoadingAdminDetails(false);
                    }
                 } else if (!parentData.schoolId && !firstChildSchoolId) {
                    setLoadingAdminDetails(false); // No school ID from parent or children
                 }


            } catch (err) {
                console.error("Error fetching parent/children data:", err);
                setError(translate('dashboardLoadError') || "Failed to load dashboard data.");
            } finally {
                setLoadingData(false);
                // Ensure loadingAdminDetails is set to false if not already handled
                if (loadingAdminDetails && !schoolAdminDetails) { 
                    setLoadingAdminDetails(false);
                }
            }
        };

        fetchParentAndChildrenData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authUser, authLoading, translate]);


    const handleUpdateParentAvatar = async () => {
        if (!authUser) {
          toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
          return;
        }
        if (newAvatarUrlInput.trim() !== "" ) {
          try {
            new URL(newAvatarUrlInput.trim());
          } catch (_) {
            toast({ variant: "destructive", title: "Invalid URL", description: "Please enter a valid image URL." });
            return;
          }
        }
    
        setIsUpdatingAvatar(true);
        try {
          const newUrl = newAvatarUrlInput.trim() === "" ? null : newAvatarUrlInput.trim();
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: newUrl });
          }
          const userDocRef = doc(db, 'users', authUser.uid);
          await updateDoc(userDocRef, { avatarUrl: newUrl });
    
          setParentAvatarUrl(newUrl || "");
          toast({ title: "Success", description: "Profile picture updated successfully." });
        } catch (error) {
          console.error("Error updating avatar:", error);
          toast({ variant: "destructive", title: "Error", description: "Failed to update profile picture." });
        } finally {
          setIsUpdatingAvatar(false);
        }
      };

     const isLoading = authLoading || loadingData || loadingProfile || loadingAdminDetails; 

     if (isLoading) { 
        return (
          <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4 p-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 w-full">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
             <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        );
      }

    if (error) {
       return (
          <Card className="border-destructive bg-destructive/10">
             <CardHeader>
                <CardTitle className="text-destructive">{translate('errorTitle') || "Error"}</CardTitle>
             </CardHeader>
             <CardContent>
                <p className="text-destructive">{error}</p>
             </CardContent>
          </Card>
       );
    }


    return (
    <div className="grid auto-rows-auto gap-6">
       <Card>
           <CardHeader>
               <CardTitle>{translate('welcomeMessage', { name: parentName })}</CardTitle>
               <CardDescription>{translate('parentDashboardDesc') || "Monitor your children's school attendance."}</CardDescription>
           </CardHeader>
           <CardContent>
             {childrenData.length > 0 ? (
                <p>{translate('parentDashboardSelectChild') || "Select a child below to view their detailed attendance records or use the sidebar for general views."}</p>
             ) : (
                <p>{translate('parentDashboardNoChildren') || "No children linked to your account. Please contact the school administration if this is incorrect."}</p>
             )}
           </CardContent>
        </Card>

       {childrenData.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {childrenData.map(child => (
               <Card key={child.id} className="hover:shadow-md transition-shadow">
                 <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <Avatar className="h-12 w-12">
                       <AvatarImage src={child.avatarUrl} alt={child.name} />
                       <AvatarFallback>{getInitials(child.name)}</AvatarFallback>
                     </Avatar>
                     <div className="flex-1">
                        <CardTitle className="text-lg">{child.name}</CardTitle>
                         <CardDescription>{translate('childOverallAttendance', { percentage: child.attendancePercentage.toString() })}</CardDescription>
                     </div>
                 </CardHeader>
                 <CardContent className="pt-2">
                     <Link href={`/parent/child/${child.id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                       <CalendarDays className="h-4 w-4" /> {translate('viewDetailedAttendanceLink') || "View Detailed Attendance"}
                     </Link>
                 </CardContent>
               </Card>
            ))}
           </div>
        )}

       {childrenData.length > 0 && ( 
        <Card>
           <CardHeader>
             <CardTitle className="text-lg">{translate('parentQuickLinksTitle') || "Quick Links"}</CardTitle>
           </CardHeader>
           <CardContent className="flex flex-col sm:flex-row gap-4">
             <Link href="/parent/attendance" className="flex items-center gap-2 text-primary hover:underline">
               <CalendarDays className="h-5 w-5" /> {translate('viewAllAttendance')}
             </Link>
             <Link href="/parent/summary" className="flex items-center gap-2 text-primary hover:underline">
               <BarChart3 className="h-5 w-5" /> {translate('attendanceSummary')}
             </Link>
           </CardContent>
         </Card>
        )}

      {schoolAdminDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" /> {translate('schoolAdminContactTitle')}</CardTitle>
            <CardDescription>{translate('schoolInfoContactDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>{translate('schoolNameLabel')}:</strong> {schoolAdminDetails.schoolName || schoolAdminDetails.name || translate('notSetPlaceholder')}</p>
            <p><strong>{translate('adminEmailLabel')}:</strong> {schoolAdminDetails.email || translate('notSetPlaceholder')}</p>
            {schoolAdminDetails.phoneNumber ? (
              <p><strong>{translate('phoneNumberLabel')}:</strong> {schoolAdminDetails.phoneNumber}</p>
            ) : (
              <p className="text-muted-foreground">{translate('adminPhoneNumberNotSet')}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Parent Profile Picture Update Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCircle className="h-6 w-6"/> {translate('myProfileTitle')}</CardTitle>
          <CardDescription>{translate('myProfileDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={parentAvatarUrl} alt={parentName} />
                    <AvatarFallback>{getInitials(parentName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                    <p className="text-xl font-medium">{parentName}</p>
                    <p className="text-sm text-muted-foreground">{authUser?.email}</p>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="avatarUrlInputParent" className="flex items-center gap-1"><ImageIcon className="h-4 w-4"/> {translate('avatarUrlLabel')}</Label>
                <Input
                    id="avatarUrlInputParent"
                    type="url"
                    value={newAvatarUrlInput}
                    onChange={(e) => setNewAvatarUrlInput(e.target.value)}
                    placeholder="https://example.com/your-avatar.png"
                />
                 <p className="text-xs text-muted-foreground">{translate('avatarUrlHint')}</p>
            </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleUpdateParentAvatar} disabled={isUpdatingAvatar || authLoading}>
                {isUpdatingAvatar && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> {translate('saveProfilePictureButton')}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    

