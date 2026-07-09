"use client";

type ConfirmSubmitFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  className?: string;
  children: React.ReactNode;
};

export function ConfirmSubmitForm({
  action,
  message,
  className,
  children,
}: ConfirmSubmitFormProps) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
