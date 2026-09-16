'use client';

type PermanentDeleteButtonProps = {
  label?: string;
  confirmationMessage: string;
  className?: string;
};

export function PermanentDeleteButton({
  label = 'Excluir permanentemente',
  confirmationMessage,
  className,
}: PermanentDeleteButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        const confirmed =
          window.confirm(
            confirmationMessage
          );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}
