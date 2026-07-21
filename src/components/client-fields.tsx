import { clientColorLabels, getClientVisualToken } from "@/lib/client-visuals";
import {
  clientLinkGroups,
  clientPlatformOptions,
  type ClientLinkGroup,
} from "@/lib/client-profile";
import {
  clientColorKeys,
  serviceTypes,
  type Client,
  type ClientColorKey,
} from "@/lib/types";

const inputClass = "bb-input text-sm font-medium placeholder:text-[var(--bb-muted)]";
const labelClass = "grid gap-2 text-sm font-bold text-[var(--bb-charcoal)]";

export function ClientColorField({ defaultValue = "slate" }: { defaultValue?: ClientColorKey | null }) {
  return (
    <div className={labelClass}>
      Cor operacional
      <div className="grid gap-2 rounded-[18px] border border-[var(--bb-border)] bg-white/35 p-3 sm:grid-cols-2 lg:grid-cols-4">
        {clientColorKeys.map((colorKey) => {
          const token = getClientVisualToken({ colorKey });

          return (
            <label key={colorKey} className="group cursor-pointer">
              <input
                name="color_key"
                type="radio"
                value={colorKey}
                defaultChecked={(defaultValue ?? "slate") === colorKey}
                className="peer sr-only"
              />
              <span className={`flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-extrabold transition duration-200 ${token.bg} ${token.border} ${token.text} peer-checked:border-[var(--bb-black)] peer-checked:ring-2 peer-checked:ring-[var(--bb-black)]/10 group-hover:bg-white`}>
                <span className={`size-2.5 rounded-full ${token.dot}`} />
                {clientColorLabels[colorKey]}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function ClientServicesField({
  defaultValues = [],
  selectedValues,
  onChange,
}: {
  defaultValues?: string[];
  selectedValues?: string[];
  onChange?: (service: string, checked: boolean) => void;
}) {
  const values = selectedValues ?? defaultValues;

  return (
    <div className={labelClass}>
      Serviços contratados
      <input type="hidden" name="service_type" value={values[0] ?? ""} />
      <div className="grid gap-2 rounded-[18px] border border-[var(--bb-border)] bg-white/35 p-3 md:grid-cols-2">
        {serviceTypes.map((service) => (
          <label key={service} className="flex items-center gap-2 text-sm font-bold text-[var(--bb-charcoal)]">
            <input
              name="service_types"
              type="checkbox"
              value={service}
              {...(onChange
                ? {
                    checked: values.includes(service),
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                      onChange(service, event.currentTarget.checked),
                  }
                : { defaultChecked: values.includes(service) })}
              className="size-4 accent-[var(--bb-primary)]"
            />
            {service}
          </label>
        ))}
      </div>
    </div>
  );
}

export function ClientPlatformsField({
  defaultValues = [],
  selectedValues,
  onChange,
}: {
  defaultValues?: string[];
  selectedValues?: string[];
  onChange?: (platform: string, checked: boolean) => void;
}) {
  const values = selectedValues ?? defaultValues;
  const standardPlatforms = new Set<string>(clientPlatformOptions.filter((platform) => platform !== "Outro"));
  const customPlatform = values.find((platform) => platform !== "Outro" && !standardPlatforms.has(platform)) ?? "";

  return (
    <div className={labelClass}>
      Plataformas
      <div className="grid gap-2 rounded-[18px] border border-[var(--bb-border)] bg-white/35 p-3 md:grid-cols-2">
        {clientPlatformOptions.map((platform) => {
          const checked = platform === "Outro" ? Boolean(customPlatform) || values.includes("Outro") : values.includes(platform);

          return (
            <label key={platform} className="flex items-center gap-2 text-sm font-bold text-[var(--bb-charcoal)]">
              <input
                name="platforms"
                type="checkbox"
                value={platform}
                {...(onChange
                  ? {
                      checked,
                      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        onChange(platform, event.currentTarget.checked),
                    }
                  : { defaultChecked: checked })}
                className="size-4 accent-[var(--bb-primary)]"
              />
              {platform}
            </label>
          );
        })}
        <label className={`${labelClass} md:col-span-2`}>
          Nome da outra plataforma
          <input
            name="platform_other_name"
            defaultValue={customPlatform}
            placeholder="Preencher apenas quando aplicável"
            className={inputClass}
          />
        </label>
      </div>
    </div>
  );
}

export function ClientLinkFields({
  client,
  groupIds,
}: {
  client?: Client;
  groupIds?: ClientLinkGroup["id"][];
}) {
  const visibleGroups = groupIds
    ? clientLinkGroups.filter((group) => groupIds.includes(group.id))
    : clientLinkGroups;

  return (
    <div className="grid gap-4">
      {visibleGroups.map((group, index) => (
        <details
          key={group.id}
          open={index < 2}
          className="group rounded-[20px] border border-[var(--bb-border)] bg-white/35"
        >
          <summary className="cursor-pointer list-none px-4 py-4">
            <span className="block text-sm font-extrabold text-[var(--bb-charcoal)]">{group.title}</span>
            <span className="mt-1 block text-xs font-semibold text-[var(--bb-muted)]">{group.description}</span>
          </summary>
          <div className="grid gap-4 border-t border-[var(--bb-border)] px-4 py-4 md:grid-cols-2">
            {group.fields.map((field) => (
              <label key={field.key} className={labelClass}>
                {field.label}
                <input
                  name={field.key}
                  type="url"
                  defaultValue={client?.[field.key] ?? ""}
                  placeholder="Colar link"
                  className={inputClass}
                />
              </label>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export function ClientFormSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 rounded-[20px] border border-[var(--bb-border)] bg-white/32 p-4 md:p-5">
      <h3 className="text-base font-extrabold text-[var(--bb-charcoal)]">{title}</h3>
      {description ? <p className="mt-1 text-sm font-medium text-[var(--bb-muted)]">{description}</p> : null}
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}
