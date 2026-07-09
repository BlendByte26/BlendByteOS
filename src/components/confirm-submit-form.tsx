"use client";

type ConfirmSubmitFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  id?: string;
  className?: string;
  children?: React.ReactNode;
};

export function ConfirmSubmitForm({
  action,
  message,
  id,
  className,
  children,
}: ConfirmSubmitFormProps) {
  return (
    <form
      id={id}
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
