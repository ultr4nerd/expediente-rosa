// TODO(ISS-0006): poll platform.sync.status()/syncNow() and show online/offline/pending. Always visible.
import { CloudOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SyncIndicator() {
  return (
    <Badge variant="offline">
      <CloudOff aria-hidden="true" />
      Sin conexión
    </Badge>
  );
}
