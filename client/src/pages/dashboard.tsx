import { DashboardLayout } from "@/components/dashboard-layout";
import { CodesTable } from "@/components/codes-table";
import { SkeletonTable } from "@/components/ui/skeleton-card";
import { Button } from "@/components/ui/button";
import { useCodes, useCreateCode } from "@/hooks/use-codes";
import { Plus, Download, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Dashboard() {
  const { data: codes, isLoading, error } = useCodes();
  const createCode = useCreateCode();
  const [isOpen, setIsOpen] = useState(false);
  const [days, setDays] = useState(30);

  const handleCreate = async () => {
    await createCode.mutateAsync(days);
    setIsOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-display font-bold text-white">License Management</h2>
            <p className="text-muted-foreground text-lg">Manage active licenses and monitor usage.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <a 
              href="/api/extension/download" 
              className="inline-flex"
            >
              <Button variant="outline" className="border-white/10 hover:bg-white/5 gap-2">
                <Download className="h-4 w-4" />
                Download Extension
              </Button>
            </a>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2">
                  <Plus className="h-4 w-4" />
                  Generate Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-card border-white/10">
                <DialogHeader>
                  <DialogTitle>Generate Activation Code</DialogTitle>
                  <DialogDescription>
                    Create a new license code for the prompt improvement extension.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="days">Validity (Days)</Label>
                    <Input
                      id="days"
                      type="number"
                      min={1}
                      max={365}
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="bg-black/20 border-white/10 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-primary mb-1">Professional License</p>
                        <p className="text-xs text-muted-foreground">
                          This code will unlock full AI prompt enhancement capabilities for {days} days.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button 
                    onClick={handleCreate} 
                    disabled={createCode.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {createCode.isPending ? "Generating..." : "Generate Code"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-white/10 bg-card/40 backdrop-blur-sm">
            <h3 className="text-muted-foreground text-sm font-medium mb-2">Total Active Licenses</h3>
            <p className="text-3xl font-bold text-white">
              {isLoading ? "-" : codes?.filter(c => c.isActive).length}
            </p>
          </div>
          <div className="p-6 rounded-xl border border-white/10 bg-card/40 backdrop-blur-sm">
            <h3 className="text-muted-foreground text-sm font-medium mb-2">Expired Licenses</h3>
            <p className="text-3xl font-bold text-muted-foreground">
              {isLoading ? "-" : codes?.filter(c => !c.isActive).length}
            </p>
          </div>
          <div className="p-6 rounded-xl border border-white/10 bg-card/40 backdrop-blur-sm">
            <h3 className="text-muted-foreground text-sm font-medium mb-2">Total Generated</h3>
            <p className="text-3xl font-bold text-primary">
              {isLoading ? "-" : codes?.length}
            </p>
          </div>
        </div>

        {/* Table Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Active Codes</h3>
          </div>
          
          {isLoading ? (
            <SkeletonTable />
          ) : error ? (
            <div className="p-8 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
              Error loading codes: {error.message}
            </div>
          ) : (
            <CodesTable codes={codes || []} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
