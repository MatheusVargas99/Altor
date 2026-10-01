import { forwardRef } from 'react';

type CommonProps = {
  label?: string;
  hint?: string;
  error?: string;
};

export const Field = ({
  label,
  hint,
  error,
  children,
}: CommonProps & { children: React.ReactNode }) => (
  <div className="min-w-0 space-y-1">
    {label && <label className="label">{label}</label>}
    {children}
    {hint && !error && <p className="text-xs text-text-dim break-words">{hint}</p>}
    {error && <p role="alert" className="text-xs text-danger break-words">{error}</p>}
  </div>
);

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input(props, ref) {
  return <input ref={ref} {...props} className={`input ${props.className ?? ''}`} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea(props, ref) {
  return (
    <textarea
      ref={ref}
      rows={3}
      {...props}
      className={`input ${props.className ?? ''}`}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    options: { value: string; label: string }[];
    placeholder?: string;
  }
>(function Select({ options, placeholder, ...rest }, ref) {
  return (
    <select ref={ref} {...rest} className={`input ${rest.className ?? ''}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
});
