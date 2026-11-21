// ISS-0020: red badge for the patient header when the record has an open field conflict.
// Opens the sync screen, where conflicts are resolved. Renders nothing without conflicts.
import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigation } from "@/app/navigation";
import { useRecords, type RecordsSource } from "@/app/useRecords";
import { conflictsOf } from "@/domain/conflicts";
import { resolvePatient } from "@/domain/projection";

export function ConflictBadge({ patientId, source }: { patientId: string; source?: RecordsSource }) {
  const { model } = useRecords(source);
  const { go } = useNavigation();
  const record = resolvePatient(model, patientId);
  const count = record ? conflictsOf(record).length : 0;
  if (count === 0) return null;
  return (
    <Badge variant="danger" asChild>
      <button type="button" onClick={() => go({ name: "sync" })} className="min-h-control cursor-pointer">
        <TriangleAlert aria-hidden="true" />
        {count === 1 ? "1 dato en conflicto" : `${count} datos en conflicto`}
      </button>
    </Badge>
  );
}
