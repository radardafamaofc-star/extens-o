import { ActivationCode } from "@/hooks/use-codes";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ban, Copy, Check } from "lucide-react";
import { useRevokeCode } from "@/hooks/use-codes";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CodesTableProps {
  codes: ActivationCode[];
}

export function CodesTable({ codes }: CodesTableProps) {
  const revokeCode = useRevokeCode();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = (id: number) => {
    if (confirm("Are you sure you want to revoke this code? It will stop working immediately.")) {
      revokeCode.mutate(id);
    }
  };

  if (codes.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl bg-card/30">
        <p className="text-muted-foreground">No activation codes found. Generate one to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden bg-card/40 backdrop-blur-sm">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow className="border-white/10 hover:bg-white/5">
            <TableHead className="text-muted-foreground font-medium">Activation Code</TableHead>
            <TableHead className="text-muted-foreground font-medium">Created At</TableHead>
            <TableHead className="text-muted-foreground font-medium">Expires At</TableHead>
            <TableHead className="text-muted-foreground font-medium">Status</TableHead>
            <TableHead className="text-right text-muted-foreground font-medium">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {codes.map((code) => {
            const isExpired = new Date(code.expiresAt) < new Date();
            const isActive = code.isActive && !isExpired;

            return (
              <TableRow key={code.id} className="border-white/10 hover:bg-white/5 transition-colors">
                <TableCell className="font-mono text-base font-medium">
                  <div className="flex items-center gap-3">
                    <span className={cn(isActive ? "text-primary" : "text-muted-foreground")}>
                      {code.code}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-white"
                      onClick={() => handleCopy(code.code, code.id)}
                    >
                      {copiedId === code.id ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(code.createdAt), "PPP")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(code.expiresAt), "PPP")}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={isActive ? "default" : "secondary"}
                    className={cn(
                      "font-medium",
                      isActive 
                        ? "bg-primary/20 text-primary hover:bg-primary/30 border-primary/20" 
                        : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
                    )}
                  >
                    {isActive ? "Active" : isExpired ? "Expired" : "Revoked"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    disabled={!isActive || revokeCode.isPending}
                    onClick={() => handleRevoke(code.id)}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
