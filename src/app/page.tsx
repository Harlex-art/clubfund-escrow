"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "President" | "Vendor";
type Status = "Pending Deposit" | "Active - Awaiting Vendor Completion" | "Verifying Completion" | "Completed - Funds Released";

interface Agreement {
  id: string;
  title: string;
  amount: number;
  status: Status;
}

export default function Dashboard() {
  const [role, setRole] = useState<Role>("President");
  const [balance, setBalance] = useState(5000);
  const [agreements, setAgreements] = useState<Agreement[]>([
    { id: "ESC-1001", title: "Photographer for Spring Gala", amount: 300, status: "Completed - Funds Released" },
  ]);
  
  // Create Agreement State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const handleCreateAgreement = () => {
    if (!newTitle || !newAmount) return;
    
    setAgreements([
      {
        id: `ESC-${1000 + agreements.length + 1}`,
        title: newTitle,
        amount: parseFloat(newAmount),
        status: "Pending Deposit"
      },
      ...agreements
    ]);
    setNewTitle("");
    setNewAmount("");
    setIsDialogOpen(false);
  };

  const handleDeposit = (id: string) => {
    setAgreements(agreements.map(a => {
      if (a.id === id) {
        setBalance(prev => prev - a.amount);
        return { ...a, status: "Active - Awaiting Vendor Completion" };
      }
      return a;
    }));
  };

  const handleMarkComplete = async (id: string) => {
    // Optimistic Update to Verifying Complete
    setAgreements(agreements.map(a => a.id === id ? { ...a, status: "Verifying Completion" } : a));
    
    try {
      const res = await fetch("/api/escrow/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreementId: id })
      });
      const data = await res.json();
      
      if (data.success) {
         setAgreements(prev => prev.map(a => a.id === id ? { ...a, status: data.status as Status } : a));
      }
    } catch (error) {
       console.error(error);
       // Revert on failure just in case, though happy path only
       setAgreements(prev => prev.map(a => a.id === id ? { ...a, status: "Active - Awaiting Vendor Completion" } : a));
    }
  };

  const getStatusColor = (status: Status) => {
     if (status.includes("Completed")) return "bg-green-100 text-green-800 border-transparent";
     if (status.includes("Verifying")) return "bg-blue-100 text-blue-800 border-transparent";
     if (status.includes("Active")) return "bg-yellow-100 text-yellow-800 border-transparent";
     return "bg-slate-100 text-slate-800 border-transparent";
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">L</div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Luffa App <span className="text-sm font-medium text-slate-500 ml-2">ClubFund Escrow</span></h1>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-full text-sm">
            <button 
              onClick={() => setRole("President")}
              className={`px-4 py-1.5 rounded-full font-medium transition-all ${role === "President" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
            >
              Society President
            </button>
            <button 
              onClick={() => setRole("Vendor")}
              className={`px-4 py-1.5 rounded-full font-medium transition-all ${role === "Vendor" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
            >
              Vendor
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        
        {/* Treasury Card */}
        {role === "President" && (
          <div className="grid gap-4 md:grid-cols-3">
             <Card className="md:col-span-2 border-0 shadow-sm bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                <CardHeader>
                  <CardTitle className="text-blue-100 font-medium text-sm uppercase tracking-wider">Treasury Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">£{balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                  <p className="text-blue-200 text-sm mt-2">Endless Blockchain Smart Contract</p>
                </CardContent>
             </Card>
             
             <Card className="border-0 shadow-sm flex flex-col justify-center items-center p-6 bg-white overflow-hidden">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger render={
                    <Button size="lg" className="w-full h-full text-lg gap-2 shadow-sm rounded-xl py-8 overflow-hidden relative group" />
                  }>
                    <span className="relative z-10 flex items-center gap-2"><PlusIcon /> Create Agreement</span>
                    <div className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>New Escrow Agreement</DialogTitle>
                      <DialogDescription>
                        Create a trustless payment escrow for a campus vendor.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Job Description</Label>
                        <Input id="title" placeholder="e.g. Hire DJ for £150" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="amount">Amount (£)</Label>
                        <Input id="amount" type="number" placeholder="150" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateAgreement} className="w-full">Create Escrow</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
             </Card>
          </div>
        )}

        {/* Agreements List */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">{role === "President" ? "Active Escrows" : "My Jobs"}</h2>
          <div className="space-y-4">
            {agreements.length === 0 && (
              <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                No agreements found.
              </div>
            )}
            
            {agreements.map((agreement) => (
              <Card key={agreement.id} className="border-0 shadow-sm overflow-hidden flex flex-col sm:flex-row sm:items-center hover:shadow-md transition-shadow duration-200">
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded border overflow-hidden">{agreement.id}</span>
                    <Badge variant="secondary" className={`border-0 ${getStatusColor(agreement.status)} transition-colors`}>
                      {agreement.status}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{agreement.title}</h3>
                  <div className="mt-2 text-3xl font-bold text-slate-800">£{agreement.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>
                
                <div className="bg-slate-50 p-6 sm:w-64 sm:h-full border-t sm:border-t-0 sm:border-l flex flex-col justify-center gap-3 self-stretch">
                   {role === "President" && agreement.status === "Pending Deposit" && (
                     <Button onClick={() => handleDeposit(agreement.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                       Deposit Funds
                     </Button>
                   )}
                   
                   {role === "President" && agreement.status === "Active - Awaiting Vendor Completion" && (
                     <p className="text-sm text-slate-500 text-center font-medium">Waiting for vendor...</p>
                   )}
                   
                   {role === "Vendor" && agreement.status === "Active - Awaiting Vendor Completion" && (
                     <Button onClick={() => handleMarkComplete(agreement.id)} className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                       Mark as Complete
                     </Button>
                   )}

                   {role === "Vendor" && agreement.status === "Pending Deposit" && (
                     <p className="text-sm text-slate-500 text-center font-medium">Waiting for President to deposit funds...</p>
                   )}

                   {agreement.status === "Verifying Completion" && (
                     <div className="flex items-center justify-center gap-2 text-blue-600 font-medium text-sm p-3 bg-blue-50/50 rounded-lg animate-pulse border border-blue-100">
                       <Spinner /> AI Verifying...
                     </div>
                   )}
                   
                   {agreement.status === "Completed - Funds Released" && (
                     <div className="flex flex-col items-center justify-center">
                       <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-2">
                         <CheckCircle />
                       </div>
                       <span className="text-sm font-semibold text-green-700 text-center">Paid</span>
                     </div>
                   )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  );
}

function CheckCircle() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
  );
}
