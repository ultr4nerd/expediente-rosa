// Entry point to the new-visit screen (ISS-0010), placed on the patient record.
import { Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/app/navigation";

export function VisitNewButton({ patientId }: { patientId: string }) {
  const { go } = useNavigation();
  return (
    <Button type="button" size="lg" onClick={() => go({ name: "visit-new", patientId })}>
      <Stethoscope aria-hidden="true" />
      Nueva visita
    </Button>
  );
}
