import { Plus, Trash2 } from "lucide-react";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { createEmptyItinerarioTipoItem } from "@/utils/itinerarioTipo.utils";
import type { PlantillaFormValues } from "@/utils/validaciones";

interface ItinerarioTipoEditorProps {
  control: Control<PlantillaFormValues>;
  register: UseFormRegister<PlantillaFormValues>;
  errors?: FieldErrors<PlantillaFormValues>;
  disabled?: boolean;
  legacyText?: string;
}

const inputClassName =
  "rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary focus:ring-2";

export function ItinerarioTipoEditor({
  control,
  register,
  errors,
  disabled = false,
  legacyText,
}: ItinerarioTipoEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "itinerarioTipo",
  });

  const handleAddRow = () => {
    append(createEmptyItinerarioTipoItem());
  };

  const handleRemoveRow = (index: number) => {
    if (fields.length <= 1) {
      return;
    }
    remove(index);
  };

  return (
    <div className="flex flex-col gap-2 text-sm md:col-span-2">
      <span className="font-medium text-textDark">Itinerario tipo</span>

      {legacyText ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-textDark">
          <p className="mb-2 font-medium text-amber-900">
            Este itinerario usa formato anterior. El texto original se conserva hasta que agregues actividades en el
            nuevo formato.
          </p>
          <p className="whitespace-pre-wrap rounded-md border border-amber-200 bg-white px-3 py-2 text-neutral">
            {legacyText}
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        {fields.map((field, index) => (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start" key={field.id}>
            <input
              aria-label={`Hora actividad ${index + 1}`}
              className={`${inputClassName} w-full shrink-0 sm:w-28`}
              disabled={disabled}
              type="time"
              {...register(`itinerarioTipo.${index}.hora`)}
            />
            <input
              aria-label={`Actividad ${index + 1}`}
              className={`${inputClassName} min-w-0 flex-1`}
              disabled={disabled}
              placeholder="Descripción de la actividad"
              type="text"
              {...register(`itinerarioTipo.${index}.actividad`)}
            />
            <Button
              aria-label={`Quitar actividad ${index + 1}`}
              disabled={disabled || fields.length <= 1}
              onClick={() => handleRemoveRow(index)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button className="w-fit" disabled={disabled} onClick={handleAddRow} type="button" variant="ghost">
        <Plus className="mr-1 h-4 w-4" />
        Agregar actividad
      </Button>

      {errors?.itinerarioTipo?.message ? (
        <span className="text-danger">{String(errors.itinerarioTipo.message)}</span>
      ) : null}
    </div>
  );
}
