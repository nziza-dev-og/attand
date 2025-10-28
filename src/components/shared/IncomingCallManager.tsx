// src/components/shared/IncomingCallManager.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp, getDocs, writeBatch } from "firebase/firestore";
import type { Call } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function IncomingCallManager() {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Clean up stale calls on load
    const cleanupStaleCalls = async () => {
        const q = query(collection(db, 'calls'), where('calleeId', '==', user.uid), where('status', '==', 'ringing'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { status: 'missed', endedAt: Timestamp.now() });
            });
            await batch.commit();
        }
    };
    cleanupStaleCalls();


    const q = query(
      collection(db, "calls"),
      where("calleeId", "==", user.uid),
      where("status", "==", "ringing")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const calls: Call[] = [];
      snapshot.forEach((doc) => {
        calls.push({ id: doc.id, ...doc.data() } as Call);
      });

      if (calls.length > 0) {
        // In a real scenario, you might handle multiple incoming calls,
        // but for now, we'll just handle the first one.
        if (!incomingCall) {
          setIncomingCall(calls[0]);
        }
      } else {
        setIncomingCall(null);
      }
    });

    return () => unsubscribe();
  }, [user, incomingCall]);

  const handleAnswer = async () => {
    if (!incomingCall) return;
    setIsAnswering(true);
    try {
      const callRef = doc(db, 'calls', incomingCall.id);
      await updateDoc(callRef, {
        status: 'answered',
        answeredAt: Timestamp.now(),
      });
      toast({ title: "Call Answered", description: "You are now connected." });
      // In a real app, you would navigate to a call screen here.
      // For now, we'll just close the dialog.
      // TODO: Implement WebRTC connection and navigation to call screen.
      setIncomingCall(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to answer the call." });
    } finally {
      setIsAnswering(false);
    }
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    try {
      const callRef = doc(db, 'calls', incomingCall.id);
      await updateDoc(callRef, {
        status: 'declined',
        endedAt: Timestamp.now(),
      });
      toast({ title: "Call Declined" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to decline the call." });
    } finally {
      setIncomingCall(null);
    }
  };

  return (
    <Dialog open={!!incomingCall} onOpenChange={(open) => !open && setIncomingCall(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-6 w-6 animate-pulse text-green-500" />
            Incoming Call
          </DialogTitle>
          <DialogDescription>
            You have an incoming call from <strong>{incomingCall?.callerName}</strong> regarding <strong>{incomingCall?.studentName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="grid grid-cols-2 gap-4">
          <Button variant="destructive" onClick={handleDecline} disabled={isAnswering}>
            <PhoneOff className="mr-2 h-4 w-4" /> Decline
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={handleAnswer} disabled={isAnswering}>
            {isAnswering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
            Answer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
