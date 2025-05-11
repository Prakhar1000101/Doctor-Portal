import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
} 