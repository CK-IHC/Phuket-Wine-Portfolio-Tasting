export interface SegOption<T extends string> {
  key: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((opt) => (
        <label className="seg-opt" key={opt.key}>
          <input
            type="radio"
            checked={value === opt.key}
            onChange={() => onChange(opt.key)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
